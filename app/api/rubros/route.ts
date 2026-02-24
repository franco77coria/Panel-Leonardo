import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    const rubros = await prisma.rubro.findMany({ orderBy: { nombre: 'asc' } })
    return NextResponse.json(rubros)
}

export async function POST(req: Request) {
    const { nombre } = await req.json()
    if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    const rubro = await prisma.rubro.create({ data: { nombre } })
    return NextResponse.json(rubro, { status: 201 })
}
