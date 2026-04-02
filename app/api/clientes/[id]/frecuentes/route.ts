export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/clientes/[id]/frecuentes
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const items = await prisma.pedidoItem.findMany({
        where: { pedido: { clienteId: id, estado: 'cerrado' } },
        select: { articuloId: true, cantidad: true, pedido: { select: { cerradoAt: true } } },
        orderBy: { pedido: { cerradoAt: 'desc' } },
    })

    // Agregar por articuloId — la primera aparición es la más reciente
    const map = new Map<string, { vecesComprado: number; cantidadTotal: number; lastUsed: Date }>()
    for (const item of items) {
        const existing = map.get(item.articuloId)
        if (existing) {
            existing.vecesComprado++
            existing.cantidadTotal += Number(item.cantidad)
        } else {
            map.set(item.articuloId, {
                vecesComprado: 1,
                cantidadTotal: Number(item.cantidad),
                lastUsed: item.pedido.cerradoAt ?? new Date(0),
            })
        }
    }

    const sorted = [...map.entries()]
        .sort((a, b) => b[1].lastUsed.getTime() - a[1].lastUsed.getTime())
        .slice(0, 20)

    const articuloIds = sorted.map(([articuloId]) => articuloId)
    const articulos = await prisma.articulo.findMany({
        where: { id: { in: articuloIds }, activo: true },
    })

    const result = sorted
        .map(([articuloId, stats]) => ({
            articulo: articulos.find((a) => a.id === articuloId),
            vecesComprado: stats.vecesComprado,
            cantidadTotal: stats.cantidadTotal,
        }))
        .filter((r) => r.articulo)

    return NextResponse.json(result)
}
