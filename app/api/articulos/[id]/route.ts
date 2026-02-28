import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/articulos/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const articulo = await prisma.articulo.findUnique({
        where: { id },
        include: { rubro: true, proveedor: true },
    })
    if (!articulo) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(articulo)
}

// PUT /api/articulos/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const body = await req.json()
    const articulo = await prisma.articulo.update({
        where: { id },
        data: { ...body, fechaPrecio: new Date() },
    })
    return NextResponse.json(articulo)
}

// DELETE /api/articulos/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    await prisma.articulo.update({ where: { id }, data: { activo: false } })
    return NextResponse.json({ ok: true })
}
