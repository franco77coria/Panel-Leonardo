import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: { id: string } }

// GET /api/clientes/[id]
export async function GET(_req: NextRequest, { params }: Params) {
    const cliente = await prisma.cliente.findUnique({
        where: { id: params.id },
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
export async function PUT(req: NextRequest, { params }: Params) {
    const body = await req.json()
    const { nombre, direccion, telefono, saldo } = body

    const cliente = await prisma.cliente.update({
        where: { id: params.id },
        data: {
            ...(nombre !== undefined && { nombre }),
            ...(direccion !== undefined && { direccion }),
            ...(telefono !== undefined && { telefono }),
            ...(saldo !== undefined && { saldo }),
        },
    })

    // Si se editó el saldo manualmente, crear movimiento de ajuste
    if (saldo !== undefined) {
        await prisma.movimientoCC.create({
            data: {
                clienteId: params.id,
                tipo: 'ajuste',
                monto: Number(saldo),
                descripcion: 'Ajuste manual de saldo',
            },
        })
    }

    return NextResponse.json(cliente)
}

// DELETE /api/clientes/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
    await prisma.cliente.update({
        where: { id: params.id },
        data: { activo: false },
    })
    return NextResponse.json({ ok: true })
}
