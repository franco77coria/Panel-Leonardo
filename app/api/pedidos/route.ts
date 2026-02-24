import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const estado = searchParams.get('estado') || ''
    const clienteId = searchParams.get('clienteId') || ''

    const pedidos = await prisma.pedido.findMany({
        where: {
            ...(estado && { estado }),
            ...(clienteId && { clienteId }),
        },
        include: { cliente: { select: { nombre: true } }, items: { include: { articulo: { select: { nombre: true } } } } },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(pedidos)
}

export async function POST(req: NextRequest) {
    const body = await req.json()
    const { clienteId, items, notas, estado } = body

    if (!clienteId) return NextResponse.json({ error: 'clienteId requerido' }, { status: 400 })
    if (!items || items.length === 0) return NextResponse.json({ error: 'Se requiere al menos un ítem' }, { status: 400 })

    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const total = items.reduce((s: number, i: { cantidad: number; precioUnitario: number }) => s + i.cantidad * i.precioUnitario, 0)

    const pedido = await prisma.pedido.create({
        data: {
            clienteId,
            estado: estado || 'pendiente',
            saldoAnterior: cliente.saldo,
            total,
            notas,
            items: {
                create: items.map((i: { articuloId: string; cantidad: number; precioUnitario: number }) => ({
                    articuloId: i.articuloId,
                    cantidad: i.cantidad,
                    precioUnitario: i.precioUnitario,
                })),
            },
        },
        include: { items: true },
    })

    return NextResponse.json(pedido, { status: 201 })
}
