import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { round2 } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// POST /api/pedidos/[id]/cerrar
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params

        const result = await prisma.$transaction(async (tx) => {
            const pedido = await tx.pedido.findUnique({
                where: { id },
                include: { cliente: true },
            })

            if (!pedido) throw new Error('NOT_FOUND')
            if (pedido.estado === 'cerrado') throw new Error('ALREADY_CLOSED')

            const totalMonto = round2(Number(pedido.total))

            await tx.cliente.update({
                where: { id: pedido.clienteId },
                data: { saldo: { increment: totalMonto } },
            })

            await tx.movimientoCC.create({
                data: {
                    clienteId: pedido.clienteId,
                    pedidoId: pedido.id,
                    tipo: 'cargo',
                    monto: totalMonto,
                    descripcion: `Pedido #${pedido.numero}`,
                },
            })

            return tx.pedido.update({
                where: { id },
                data: { estado: 'cerrado', cerradoAt: new Date() },
            })
        })

        return NextResponse.json(result)
    } catch (err: any) {
        if (err?.message === 'NOT_FOUND') return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
        if (err?.message === 'ALREADY_CLOSED') return NextResponse.json({ error: 'El pedido ya está cerrado' }, { status: 400 })
        return NextResponse.json({ error: 'Error al cerrar pedido' }, { status: 500 })
    }
}
