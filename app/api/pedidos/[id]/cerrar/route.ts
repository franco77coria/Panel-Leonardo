import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/pedidos/[id]/cerrar
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const pedido = await prisma.pedido.findUnique({
        where: { id },
        include: { cliente: true },
    })

    if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (pedido.estado === 'cerrado') return NextResponse.json({ error: 'Ya está cerrado' }, { status: 400 })

    const result = await prisma.$transaction(async (tx) => {
        await tx.cliente.update({
            where: { id: pedido.clienteId },
            data: { saldo: { increment: Number(pedido.total) } },
        })

        await tx.movimientoCC.create({
            data: {
                clienteId: pedido.clienteId,
                pedidoId: pedido.id,
                tipo: 'cargo',
                monto: Number(pedido.total),
                descripcion: `Pedido #${pedido.numero}`,
            },
        })

        return tx.pedido.update({
            where: { id },
            data: { estado: 'cerrado', cerradoAt: new Date() },
        })
    })

    return NextResponse.json(result)
}
