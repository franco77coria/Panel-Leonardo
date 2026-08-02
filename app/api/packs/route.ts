import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const packs = await prisma.pack.findMany({
            include: { rubro: true, items: { include: { articulo: true } } },
            orderBy: { nombre: 'asc' },
        })
        return NextResponse.json(packs)
    } catch {
        return NextResponse.json({ error: 'Error al obtener packs' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
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
    } catch {
        return NextResponse.json({ error: 'Error al crear pack' }, { status: 500 })
    }
}
