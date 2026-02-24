import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: { id: string } }

export async function PUT(req: NextRequest, { params }: Params) {
    const body = await req.json()
    const articulo = await prisma.articulo.update({
        where: { id: params.id },
        data: { ...body, fechaPrecio: new Date() },
    })
    return NextResponse.json(articulo)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    await prisma.articulo.update({ where: { id: params.id }, data: { activo: false } })
    return NextResponse.json({ ok: true })
}
