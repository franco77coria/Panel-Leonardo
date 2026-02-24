import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    const proveedores = await prisma.proveedor.findMany({ orderBy: { nombre: 'asc' } })
    return NextResponse.json(proveedores)
}

export async function POST(req: Request) {
    const { nombre, telefono } = await req.json()
    if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    const proveedor = await prisma.proveedor.create({ data: { nombre, telefono } })
    return NextResponse.json(proveedor, { status: 201 })
}
