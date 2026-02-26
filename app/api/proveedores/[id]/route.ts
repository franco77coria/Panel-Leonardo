import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/proveedores/[id] - actualizar nombre de proveedor
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const body = await req.json()
    const { nombre } = body

    if (!nombre || !nombre.trim()) {
        return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    const proveedor = await prisma.proveedor.update({
        where: { id },
        data: { nombre: nombre.trim() },
    })

    return NextResponse.json(proveedor)
}

// DELETE /api/proveedores/[id] - eliminar proveedor (los artículos quedan sin proveedor)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    await prisma.$transaction([
        prisma.articulo.updateMany({ where: { proveedorId: id }, data: { proveedorId: null } }),
        prisma.proveedor.delete({ where: { id } }),
    ])

    return NextResponse.json({ ok: true })
}
