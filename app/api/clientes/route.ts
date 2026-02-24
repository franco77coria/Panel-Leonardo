import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/clientes
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''

    const clientes = await prisma.cliente.findMany({
        where: {
            activo: true,
            nombre: { contains: q, mode: 'insensitive' },
        },
        orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(clientes)
}

// POST /api/clientes
export async function POST(req: NextRequest) {
    const body = await req.json()
    const { nombre, direccion, telefono, saldo } = body

    if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    const cliente = await prisma.cliente.create({
        data: { nombre, direccion, telefono, saldo: saldo ?? 0 },
    })

    return NextResponse.json(cliente, { status: 201 })
}
