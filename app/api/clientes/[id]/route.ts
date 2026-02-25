import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/clientes/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const cliente = await prisma.cliente.findUnique({
        where: { id },
        include: {
            pedidos: {
                orderBy: { createdAt: 'desc' },
                include: { items: { include: { articulo: true } } },
            },
            movimientosCC: { orderBy: { createdAt: 'desc' }, take: 20 },
        },
    })

    if (!cliente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(cliente)
}

// PUT /api/clientes/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const body = await req.json()
    const { nombre, localidad, direccion, telefono, saldo } = body

    const cliente = await prisma.cliente.update({
        where: { id },
        data: {
            ...(nombre !== undefined && { nombre }),
            ...(localidad !== undefined && { localidad }),
            ...(direccion !== undefined && { direccion }),
            ...(telefono !== undefined && { telefono }),
            ...(saldo !== undefined && { saldo }),
        },
    })

    if (saldo !== undefined) {
        await prisma.movimientoCC.create({
            data: {
                clienteId: id,
                tipo: 'ajuste',
                monto: Number(saldo),
                descripcion: 'Ajuste manual de saldo',
            },
        })
    }

    return NextResponse.json(cliente)
}

// DELETE /api/clientes/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    await prisma.cliente.update({
        where: { id },
        data: { activo: false },
    })
    return NextResponse.json({ ok: true })
}
