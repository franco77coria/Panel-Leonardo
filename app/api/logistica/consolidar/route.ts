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
        include: {
            articulo: true,
            pedido: { include: { cliente: { select: { nombre: true } } } },
        },
    })

    // Agrupar por cliente, luego consolidar articulos dentro de cada cliente
    const byClient: Record<string, Record<string, { nombre: string; cantidad: number }>> = {}

    for (const item of items) {
        const cant = Number(item.cantidad)
        if (cant <= 0) continue

        const clienteNombre = item.pedido.cliente.nombre
        if (!byClient[clienteNombre]) byClient[clienteNombre] = {}

        const key = item.articuloId
        if (!byClient[clienteNombre][key]) {
            byClient[clienteNombre][key] = { nombre: item.articulo.nombre, cantidad: 0 }
        }
        byClient[clienteNombre][key].cantidad += cant
    }

    // Convertir a array ordenado
    const result = Object.entries(byClient)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cliente, articulos]) => ({
            cliente,
            items: Object.values(articulos).sort((a, b) => a.nombre.localeCompare(b.nombre)),
        }))

    return NextResponse.json(result)
}
