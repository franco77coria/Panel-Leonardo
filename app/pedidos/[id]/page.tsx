import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PedidoDetalle } from '@/components/PedidoDetalle'

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const pedido = await prisma.pedido.findUnique({
        where: { id },
        include: {
            cliente: true,
            items: { include: { articulo: { include: { rubro: true } } } },
        },
    })
    if (!pedido) notFound()
    return <PedidoDetalle pedido={JSON.parse(JSON.stringify(pedido))} />
}
