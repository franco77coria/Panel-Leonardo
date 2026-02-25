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
