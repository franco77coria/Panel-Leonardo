import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/logistica/consolidar
export async function POST(req: NextRequest) {
    const { pedidoIds } = await req.json()
    if (!pedidoIds || pedidoIds.length === 0) {
        return NextResponse.json({ error: 'Se requieren pedidoIds' }, { status: 400 })
    }

    const items = await prisma.pedidoItem.findMany({
        where: { pedidoId: { in: pedidoIds } },
        include: { articulo: { include: { rubro: true } } },
    })

    // Consolidar: sumar cantidades por artículo
    const consolidado: Record<string, { nombre: string; rubro: string; cantidad: number; unidad: string }> = {}
    for (const item of items) {
        const cant = Number(item.cantidad)
        if (cant <= 0) continue

        const key = item.articuloId
        if (!consolidado[key]) {
            consolidado[key] = {
                nombre: item.articulo.nombre,
                rubro: item.articulo.rubro?.nombre || 'Sin rubro',
                cantidad: 0,
                unidad: item.articulo.unidad,
            }
        }
        consolidado[key].cantidad += cant
    }

    // Sort by rubro then nombre
    const result = Object.values(consolidado).sort((a, b) => {
        if (a.rubro !== b.rubro) return a.rubro.localeCompare(b.rubro)
        return a.nombre.localeCompare(b.nombre)
    })

    return NextResponse.json(result)
}
