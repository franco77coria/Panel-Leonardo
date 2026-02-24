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
    const body = await req.json()
    const { items, notas, estado } = body

    let total: number | undefined
    if (items) {
        total = items.reduce((s: number, i: { cantidad: number; precioUnitario: number }) => s + i.cantidad * i.precioUnitario, 0)
    }

    const pedido = await prisma.$transaction(async (tx) => {
        if (items) {
            await tx.pedidoItem.deleteMany({ where: { pedidoId: id } })
            await tx.pedidoItem.createMany({
                data: items.map((i: { articuloId: string; cantidad: number; precioUnitario: number }) => ({
                    pedidoId: id,
                    articuloId: i.articuloId,
                    cantidad: i.cantidad,
                    precioUnitario: i.precioUnitario,
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
    await prisma.pedidoItem.deleteMany({ where: { pedidoId: id } })
    await prisma.pedido.delete({ where: { id } })
    return NextResponse.json({ ok: true })
}
