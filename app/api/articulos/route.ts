export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const rubroId = searchParams.get('rubroId') || ''
    const proveedorId = searchParams.get('proveedorId') || ''

    const articulos = await prisma.articulo.findMany({
        where: {
            activo: true,
            ...(q && { nombre: { contains: q, mode: 'insensitive' } }),
            ...(rubroId && { rubroId }),
            ...(proveedorId && { proveedorId }),
        },
        include: { rubro: true, proveedor: true },
        orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(articulos)
}

export async function POST(req: NextRequest) {
    const body = await req.json()
    const { nombre, proveedorId, rubroId, costo, precio, unidad, permiteDecimal } = body
    if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    const articulo = await prisma.articulo.create({
        data: {
            nombre,
            proveedorId: proveedorId || undefined,
            rubroId: rubroId || undefined,
            costo,
            precio,
            unidad: unidad || 'unidad',
            permiteDecimal: permiteDecimal || false,
            fechaPrecio: new Date()
        },
    })
    return NextResponse.json(articulo, { status: 201 })
}
