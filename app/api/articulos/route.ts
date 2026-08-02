export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q') || ''
        const rubroId = searchParams.get('rubroId') || ''
        const proveedorId = searchParams.get('proveedorId') || ''
        const limitStr = searchParams.get('limit')
        const limit = limitStr ? parseInt(limitStr) : undefined

        const articulos = await prisma.articulo.findMany({
            where: {
                activo: true,
                ...(q && { nombre: { contains: q, mode: 'insensitive' } }),
                ...(rubroId && { rubroId }),
                ...(proveedorId && { proveedorId }),
            },
            include: { rubro: true, proveedor: true },
            orderBy: { nombre: 'asc' },
            ...(limit ? { take: limit } : {}),
        })

        return NextResponse.json(articulos)
    } catch {
        return NextResponse.json({ error: 'Error al obtener artículos' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { nombre, proveedorId, rubroId, costo, precio, unidad, permiteDecimal } = body
        if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

        const articulo = await prisma.articulo.create({
            data: {
                nombre,
                proveedorId: proveedorId || undefined,
                rubroId: rubroId || undefined,
                costo: costo ?? 0,
                precio: precio ?? costo ?? 0,
                unidad: unidad || 'unidad',
                permiteDecimal: permiteDecimal || false,
                fechaPrecio: new Date()
            },
        })
        return NextResponse.json(articulo, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Error al crear artículo' }, { status: 500 })
    }
}
