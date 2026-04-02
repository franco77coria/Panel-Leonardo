import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/pagos?desde=2026-03-01&hasta=2026-03-24
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    const whereDate = desde && hasta
        ? { gte: new Date(desde + 'T00:00:00-03:00'), lte: new Date(hasta + 'T23:59:59-03:00') }
        : undefined

    const pagos = await prisma.movimientoCC.findMany({
        where: {
            tipo: 'pago',
            ...(whereDate ? { createdAt: whereDate } : {}),
        },
        include: {
            cliente: { select: { id: true, nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
    })

    const total = pagos.reduce((sum, p) => sum + Number(p.monto), 0)

    return NextResponse.json({ pagos, total })
}
