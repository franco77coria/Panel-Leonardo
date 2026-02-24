import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0)
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
    }).format(num)
}

export function formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-'
    return format(new Date(date), 'dd/MM/yyyy', { locale: es })
}

export function formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return '-'
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es })
}

export function getSaldoStatus(saldo: number | string): {
    label: string
    color: 'red' | 'green' | 'gray'
    isDebt: boolean
} {
    const num = typeof saldo === 'string' ? parseFloat(saldo) : saldo
    if (num > 0) return { label: `DEBE ${formatCurrency(num)}`, color: 'red', isDebt: true }
    if (num < 0) return { label: `A FAVOR ${formatCurrency(Math.abs(num))}`, color: 'green', isDebt: false }
    return { label: 'Sin saldo', color: 'gray', isDebt: false }
}

export function getEstadoBadge(estado: string): {
    label: string
    className: string
} {
    switch (estado) {
        case 'pendiente':
            return { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
        case 'armado':
            return { label: 'Armado', className: 'bg-blue-100 text-blue-800 border-blue-200' }
        case 'cerrado':
            return { label: 'Cerrado', className: 'bg-green-100 text-green-800 border-green-200' }
        default:
            return { label: estado, className: 'bg-gray-100 text-gray-800 border-gray-200' }
    }
}

export function daysSince(date: Date | string | null | undefined): number {
    if (!date) return 999
    const diff = Date.now() - new Date(date).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
}
