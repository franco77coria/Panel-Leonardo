'use client'

import { formatCurrency, formatDate } from '@/lib/utils'

function buildCSV(rows: string[][]): string {
    return rows
        .map(cols =>
            cols
                .map((value) => {
                    const str = String(value ?? '')
                    const escaped = str.replace(/"/g, '""')
                    return `"${escaped}"`
                })
                .join(';')
        )
        .join('\n')
}

function downloadCSV(filename: string, rows: string[][]) {
    if (!rows.length) return
    const csvContent = buildCSV(rows)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

interface ArticuloCSVRow {
    nombre: string
    proveedor: string
    rubro: string
    unidad: string
    precio: number
    fecha: string
}

export function ExportArticulosCSV({ articulos }: { articulos: ArticuloCSVRow[] }) {
    const handleExport = () => {
        if (!articulos.length) {
            alert('No hay artículos para exportar.')
            return
        }

        const header = ['Artículo', 'Proveedor', 'Rubro', 'Unidad', 'Precio', 'Últ. actualización']
        const rows = articulos.map(a => [
            a.nombre,
            a.proveedor || '',
            a.rubro || '',
            a.unidad,
            formatCurrency(a.precio),
            formatDate(a.fecha),
        ])

        downloadCSV('articulos.csv', [header, ...rows])
    }

    return (
        <button onClick={handleExport} className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4h16v4H4z" /><path d="M4 12h16v8H4z" /><path d="M8 12V4" /><path d="M16 20v-8" /></svg>
            Exportar Excel
        </button>
    )
}

interface DeudorCSVRow {
    nombre: string
    ciudad: string
    direccion: string
    telefono: string
    saldo: number
    fechaAlta: string
}

export function ExportDeudoresCSV({ deudores }: { deudores: DeudorCSVRow[] }) {
    const handleExport = () => {
        if (!deudores.length) {
            alert('No hay deudores para exportar.')
            return
        }

        const header = ['Cliente', 'Ciudad', 'Dirección', 'Teléfono', 'Saldo', 'Cliente desde']
        const rows = deudores.map(d => [
            d.nombre,
            d.ciudad || '',
            d.direccion || '',
            d.telefono || '',
            formatCurrency(d.saldo),
            formatDate(d.fechaAlta),
        ])

        downloadCSV('deudores.csv', [header, ...rows])
    }

    return (
        <button onClick={handleExport} className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4h16v4H4z" /><path d="M4 12h16v8H4z" /><path d="M8 12V4" /><path d="M16 20v-8" /></svg>
            Exportar Deudores
        </button>
    )
}

