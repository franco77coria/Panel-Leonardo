import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: { id: string } }

export async function PUT(req: NextRequest, { params }: Params) {
    const body = await req.json()
    const { nombre, descripcion, rubroId, items } = body

    const pack = await prisma.$transaction(async (tx) => {
        if (items) {
            await tx.packItem.deleteMany({ where: { packId: params.id } })
            await tx.packItem.createMany({
                data: items.map((i: { articuloId: string; cantidadSugerida?: number }) => ({
                    packId: params.id,
                    articuloId: i.articuloId,
                    cantidadSugerida: i.cantidadSugerida || 1,
                })),
            })
        }
        return tx.pack.update({
            where: { id: params.id },
            data: { nombre, descripcion, rubroId: rubroId || null },
            include: { rubro: true, items: { include: { articulo: true } } },
        })
    })
    return NextResponse.json(pack)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    await prisma.packItem.deleteMany({ where: { packId: params.id } })
    await prisma.pack.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
}
