import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const proveedores = await prisma.proveedor.findMany({ orderBy: { nombre: 'asc' } })
        return NextResponse.json(proveedores)
    } catch {
        return NextResponse.json({ error: 'Error al obtener proveedores' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const { nombre, telefono } = await req.json()
        if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
        const proveedor = await prisma.proveedor.create({ data: { nombre, telefono } })
        return NextResponse.json(proveedor, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 })
    }
}
