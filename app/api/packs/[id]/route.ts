import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/packs/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const body = await req.json()
    const { nombre, descripcion, rubroId, items } = body

    const pack = await prisma.$transaction(async (tx) => {
        if (items) {
            await tx.packItem.deleteMany({ where: { packId: id } })
            await tx.packItem.createMany({
                data: items.map((i: { articuloId: string; cantidadSugerida?: number }) => ({
                    packId: id,
                    articuloId: i.articuloId,
                    cantidadSugerida: i.cantidadSugerida || 1,
                })),
            })
        }
        return tx.pack.update({
            where: { id },
            data: { nombre, descripcion, rubroId: rubroId || null },
            include: { rubro: true, items: { include: { articulo: true } } },
        })
    })
    return NextResponse.json(pack)
}

// DELETE /api/packs/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    await prisma.packItem.deleteMany({ where: { packId: id } })
    await prisma.pack.delete({ where: { id } })
    return NextResponse.json({ ok: true })
}
