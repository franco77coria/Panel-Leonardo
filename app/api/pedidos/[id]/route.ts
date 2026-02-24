import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
    const pedido = await prisma.pedido.findUnique({
        where: { id: params.id },
        include: {
            cliente: true,
            items: { include: { articulo: { include: { rubro: true } } } },
        },
    })
    if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(pedido)
}

export async function PUT(req: NextRequest, { params }: Params) {
    const body = await req.json()
    const { items, notas, estado } = body

    let total: number | undefined
    if (items) {
        total = items.reduce((s: number, i: { cantidad: number; precioUnitario: number }) => s + i.cantidad * i.precioUnitario, 0)
    }

    const pedido = await prisma.$transaction(async (tx) => {
        if (items) {
            await tx.pedidoItem.deleteMany({ where: { pedidoId: params.id } })
            await tx.pedidoItem.createMany({
                data: items.map((i: { articuloId: string; cantidad: number; precioUnitario: number }) => ({
                    pedidoId: params.id,
                    articuloId: i.articuloId,
                    cantidad: i.cantidad,
                    precioUnitario: i.precioUnitario,
                })),
            })
        }
        return tx.pedido.update({
            where: { id: params.id },
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

export async function DELETE(_req: NextRequest, { params }: Params) {
    await prisma.pedidoItem.deleteMany({ where: { pedidoId: params.id } })
    await prisma.pedido.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
}
