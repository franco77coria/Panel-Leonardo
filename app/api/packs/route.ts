import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    const packs = await prisma.pack.findMany({
        include: { rubro: true, items: { include: { articulo: true } } },
        orderBy: { nombre: 'asc' },
    })
    return NextResponse.json(packs)
}

export async function POST(req: Request) {
    const { nombre, descripcion, rubroId, items } = await req.json()
    if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    const pack = await prisma.pack.create({
        data: {
            nombre, descripcion, rubroId: rubroId || null,
            items: {
                create: (items || []).map((i: { articuloId: string; cantidadSugerida?: number }) => ({
                    articuloId: i.articuloId,
                    cantidadSugerida: i.cantidadSugerida || 1,
                })),
            },
        },
        include: { rubro: true, items: { include: { articulo: true } } },
    })
    return NextResponse.json(pack, { status: 201 })
}
