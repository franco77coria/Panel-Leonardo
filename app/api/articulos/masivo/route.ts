import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { round2 } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// POST /api/articulos/masivo - Actualización masiva de precios
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { tipo, id, porcentaje } = body // tipo: 'rubro' | 'proveedor'

        const percNum = parseFloat(porcentaje)
        if (!tipo || !id || isNaN(percNum)) {
            return NextResponse.json({ error: 'tipo, id y porcentaje válidos requeridos' }, { status: 400 })
        }

        const factor = 1 + (percNum / 100)
        const where = tipo === 'rubro' ? { rubroId: id } : { proveedorId: id }

        const articulos = await prisma.articulo.findMany({ where: { ...where, activo: true } })

        if (articulos.length === 0) {
            return NextResponse.json({ updated: 0 })
        }

        const now = new Date()
        await prisma.$transaction(
            articulos.map(a =>
                prisma.articulo.update({
                    where: { id: a.id },
                    data: {
                        costo: round2(Number(a.costo) * factor),
                        precio: round2(Number(a.precio) * factor),
                        fechaPrecio: now,
                    },
                })
            )
        )

        return NextResponse.json({ updated: articulos.length })
    } catch {
        return NextResponse.json({ error: 'Error al realizar aumento masivo' }, { status: 500 })
    }
}
