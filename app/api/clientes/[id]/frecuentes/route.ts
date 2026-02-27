export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/clientes/[id]/frecuentes
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const items = await prisma.pedidoItem.groupBy({
        by: ['articuloId'],
        where: { pedido: { clienteId: id, estado: 'cerrado' } },
        _sum: { cantidad: true },
        _count: { articuloId: true },
        orderBy: { _count: { articuloId: 'desc' } },
        take: 20,
    })

    const articuloIds = items.map((i) => i.articuloId)
    const articulos = await prisma.articulo.findMany({
        where: { id: { in: articuloIds }, activo: true },
    })

    const result = items.map((item) => ({
        articulo: articulos.find((a) => a.id === item.articuloId),
        vecesComprado: item._count.articuloId,
        cantidadTotal: item._sum.cantidad,
    })).filter((r) => r.articulo)

    return NextResponse.json(result)
}
