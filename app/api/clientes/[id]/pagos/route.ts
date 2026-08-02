import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/clientes/[id]/pagos
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const body = await req.json()
    const { monto, nota } = body

    if (!monto || monto <= 0) {
        return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }

    const cliente = await prisma.cliente.findUnique({
        where: { id },
        select: { id: true }
    })

    if (!cliente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const result = await prisma.$transaction(async (tx) => {
        // Un pago de cliente siempre baja su deuda o suma saldo a su favor, por lo que es negativo al saldo.
        await tx.cliente.update({
            where: { id },
            data: { saldo: { decrement: monto } },
        })

        return tx.movimientoCC.create({
            data: {
                clienteId: id,
                tipo: 'pago',
                monto: monto,
                descripcion: nota ? `Pago recibido: ${nota}` : 'Pago recibido',
            },
        })
    })

    return NextResponse.json(result, { status: 201 })
}

// PUT /api/clientes/[id]/pagos — Modificar un pago registrado
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const body = await req.json()
    const { pagoId, monto, nota } = body

    if (!pagoId) {
        return NextResponse.json({ error: 'ID de pago requerido' }, { status: 400 })
    }
    const nuevoMonto = parseFloat(monto)
    if (isNaN(nuevoMonto) || nuevoMonto <= 0) {
        return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }

    const cliente = await prisma.cliente.findUnique({
        where: { id },
        select: { id: true, saldo: true }
    })
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const movimiento = await prisma.movimientoCC.findUnique({
        where: { id: pagoId }
    })

    if (!movimiento || movimiento.clienteId !== id || movimiento.tipo !== 'pago') {
        return NextResponse.json({ error: 'Movimiento de pago no encontrado' }, { status: 404 })
    }

    const montoViejo = Number(movimiento.monto)
    const diferencia = nuevoMonto - montoViejo

    const result = await prisma.$transaction(async (tx) => {
        await tx.cliente.update({
            where: { id },
            data: { saldo: { decrement: diferencia } },
        })

        const descFinal = nota ? (nota.startsWith('Pago recibido:') ? nota : `Pago recibido: ${nota}`) : 'Pago recibido'

        return tx.movimientoCC.update({
            where: { id: pagoId },
            data: {
                monto: nuevoMonto,
                descripcion: descFinal,
            },
        })
    })

    return NextResponse.json(result)
}
