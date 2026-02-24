import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/articulos/masivo - Actualización masiva de precios
export async function POST(req: NextRequest) {
    const body = await req.json()
    const { tipo, id, porcentaje } = body // tipo: 'rubro' | 'proveedor'

    if (!tipo || !id || !porcentaje) {
        return NextResponse.json({ error: 'tipo, id y porcentaje requeridos' }, { status: 400 })
    }

    const factor = 1 + (parseFloat(porcentaje) / 100)
    const where = tipo === 'rubro' ? { rubroId: id } : { proveedorId: id }

    // Get current articles
    const articulos = await prisma.articulo.findMany({ where: { ...where, activo: true } })

    // Update each with new price
    await Promise.all(articulos.map(a =>
        prisma.articulo.update({
            where: { id: a.id },
            data: { precio: Math.round(Number(a.precio) * factor * 100) / 100, fechaPrecio: new Date() },
        })
    ))

    return NextResponse.json({ updated: articulos.length })
}
