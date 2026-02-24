import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/pedidos/[id]/cerrar - Cierra el pedido y actualiza la cuenta corriente del cliente
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
    const pedido = await prisma.pedido.findUnique({
        where: { id: params.id },
        include: { cliente: true },
    })

    if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (pedido.estado === 'cerrado') return NextResponse.json({ error: 'Ya está cerrado' }, { status: 400 })

    const result = await prisma.$transaction(async (tx) => {
        // Actualizar saldo del cliente (sumar el total del pedido = nuevo cargo)
        await tx.cliente.update({
            where: { id: pedido.clienteId },
            data: { saldo: { increment: Number(pedido.total) } },
        })

        // Registrar movimiento en cuenta corriente
        await tx.movimientoCC.create({
            data: {
                clienteId: pedido.clienteId,
                pedidoId: pedido.id,
                tipo: 'cargo',
                monto: Number(pedido.total),
                descripcion: `Pedido #${pedido.numero}`,
            },
        })

        // Cerrar el pedido
        return tx.pedido.update({
            where: { id: params.id },
            data: { estado: 'cerrado', cerradoAt: new Date() },
        })
    })

    return NextResponse.json(result)
}
