import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const rubros = await prisma.rubro.findMany({ orderBy: { nombre: 'asc' } })
        return NextResponse.json(rubros)
    } catch {
        return NextResponse.json({ error: 'Error al obtener rubros' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const { nombre } = await req.json()
        if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
        const rubro = await prisma.rubro.create({ data: { nombre } })
        return NextResponse.json(rubro, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Error al crear rubro' }, { status: 500 })
    }
}
