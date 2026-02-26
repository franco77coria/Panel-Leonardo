import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/rubros/[id] - actualizar nombre de rubro
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const body = await req.json()
    const { nombre } = body

    if (!nombre || !nombre.trim()) {
        return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    const rubro = await prisma.rubro.update({
        where: { id },
        data: { nombre: nombre.trim() },
    })

    return NextResponse.json(rubro)
}

// DELETE /api/rubros/[id] - eliminar rubro solo si no tiene artículos ni packs asociados
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const [articulosCount, packsCount] = await Promise.all([
        prisma.articulo.count({ where: { rubroId: id } }),
        prisma.pack.count({ where: { rubroId: id } }),
    ])

    if (articulosCount > 0 || packsCount > 0) {
        return NextResponse.json(
            { error: 'No se puede eliminar el rubro porque tiene artículos o packs asociados.' },
            { status: 400 }
        )
    }

    await prisma.rubro.delete({ where: { id } })
    return NextResponse.json({ ok: true })
}

