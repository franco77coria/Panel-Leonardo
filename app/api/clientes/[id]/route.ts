import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { formatCurrency, round2 } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// GET /api/clientes/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const cliente = await prisma.cliente.findUnique({
            where: { id },
            include: {
                pedidos: {
                    orderBy: { createdAt: 'desc' },
                    include: { items: { include: { articulo: true } } },
                },
                movimientosCC: { orderBy: { createdAt: 'desc' } },
            },
        })

        if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
        return NextResponse.json(cliente)
    } catch {
        return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 })
    }
}

// PUT /api/clientes/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await req.json()
        const { nombre, localidad, direccion, telefono, saldo } = body

        const clienteExiste = await prisma.cliente.findUnique({
            where: { id },
            select: { id: true, saldo: true }
        })
        if (!clienteExiste) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

        const result = await prisma.$transaction(async (tx) => {
            const nuevoSaldoVal = saldo !== undefined ? round2(saldo) : undefined
            const saldoAnterior = round2(clienteExiste.saldo)

            const updatedCliente = await tx.cliente.update({
                where: { id },
                data: {
                    ...(nombre !== undefined && { nombre }),
                    ...(localidad !== undefined && { localidad }),
                    ...(direccion !== undefined && { direccion }),
                    ...(telefono !== undefined && { telefono }),
                    ...(nuevoSaldoVal !== undefined && { saldo: nuevoSaldoVal }),
                },
            })

            if (nuevoSaldoVal !== undefined && nuevoSaldoVal !== saldoAnterior) {
                const delta = round2(nuevoSaldoVal - saldoAnterior)
                await tx.movimientoCC.create({
                    data: {
                        clienteId: id,
                        tipo: 'ajuste',
                        monto: delta,
                        descripcion: `Ajuste manual de saldo (Nuevo saldo: ${formatCurrency(nuevoSaldoVal)})`,
                    },
                })
            }

            return updatedCliente
        })

        return NextResponse.json(result)
    } catch {
        return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 })
    }
}

// DELETE /api/clientes/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.cliente.update({
            where: { id },
            data: { activo: false },
        })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 })
    }
}
