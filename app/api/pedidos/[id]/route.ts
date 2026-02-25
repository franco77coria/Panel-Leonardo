import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/pedidos/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const pedido = await prisma.pedido.findUnique({
        where: { id },
        include: {
            cliente: true,
            items: { include: { articulo: { include: { rubro: true } } } },
        },
    })
    if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(pedido)
}

// PUT /api/pedidos/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const currentPedido = await prisma.pedido.findUnique({ where: { id } })
    if (!currentPedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const body = await req.json()
    const { items, notas, estado } = body

    if (currentPedido.estado === 'cerrado' && items) {
        return NextResponse.json({ error: 'No se pueden modificar los ítems de un pedido cerrado' }, { status: 400 })
    }

    let total: number | undefined
    if (items) {
        total = items.reduce((s: number, i: { cantidad: number; precioUnitario: number; descuento?: number }) => {
            const desc = Number(i.descuento) || 0
            return s + i.cantidad * i.precioUnitario * (1 - desc / 100)
        }, 0)
    }

    const pedido = await prisma.$transaction(async (tx) => {
        if (items) {
            await tx.pedidoItem.deleteMany({ where: { pedidoId: id } })
            await tx.pedidoItem.createMany({
                data: items.map((i: { articuloId: string; cantidad: number; precioUnitario: number; descuento?: number; estadoItem?: string }) => ({
                    pedidoId: id,
                    articuloId: i.articuloId,
                    cantidad: i.cantidad,
                    precioUnitario: i.precioUnitario,
                    descuento: Number(i.descuento) || 0,
                    estadoItem: i.estadoItem || null,
                })),
            })
        }
        return tx.pedido.update({
            where: { id },
            data: {
                ...(notas !== undefined && { notas }),
                ...(estado !== undefined && { estado }),
                ...(total !== undefined && { total }),
            },
            include: { items: { include: { articulo: true } }, cliente: true },
        })
    })

    return NextResponse.json(pedido)
}

// DELETE /api/pedidos/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const currentPedido = await prisma.pedido.findUnique({ where: { id } })
    if (!currentPedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
        // Desvincular cualquier pago de Cuenta Corriente del pedido si fue cerrado para que pueda eliminarse sin error
        await tx.movimientoCC.updateMany({
            where: { pedidoId: id },
            data: { pedidoId: null, descripcion: `(Huerfano) Pedido #${currentPedido.numero} eliminado` }
        })

        // Si estaba cerrado, revertir el saldo del cliente para evitar desbalance
        if (currentPedido.estado === 'cerrado') {
            await tx.cliente.update({
                where: { id: currentPedido.clienteId },
                data: { saldo: { decrement: Number(currentPedido.total) } }
            })
            await tx.movimientoCC.create({
                data: {
                    clienteId: currentPedido.clienteId,
                    tipo: 'reversa',
                    monto: Number(currentPedido.total),
                    descripcion: `Reversión por eliminación de Pedido #${currentPedido.numero}`,
                }
            })
        }

        await tx.pedidoItem.deleteMany({ where: { pedidoId: id } })
        await tx.pedido.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true })
}
