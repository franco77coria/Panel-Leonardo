'use client'

import jsPDF from 'jspdf'
import { formatCurrency, formatDate } from '@/lib/utils'

// Print button (uses browser print dialog)
export function PrintButton() {
    return (
        <button onClick={() => window.print()} className="btn btn-secondary no-print">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            Imprimir
        </button>
    )
}


// Shared PDF utilities
function pdfHeader(doc: jsPDF, title: string, subtitle?: string): number {
    let y = 20
    doc.setFontSize(20); doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), 105, y, { align: 'center' }); y += 8
    if (subtitle) {
        doc.setFontSize(11); doc.setFont('helvetica', 'normal')
        doc.text(subtitle, 105, y, { align: 'center' }); y += 6
    }
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`, 105, y, { align: 'center' }); y += 8
    doc.setDrawColor(200); doc.line(20, y, 190, y); y += 6
    return y
}

function pdfTableHeader(doc: jsPDF, y: number, cols: { label: string; x: number }[]): number {
    doc.setFillColor(245, 246, 248)
    doc.rect(20, y - 4, 170, 8, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    cols.forEach(c => doc.text(c.label, c.x, y))
    y += 6; doc.setDrawColor(200); doc.line(20, y, 190, y); y += 5
    return y
}

function checkPage(doc: jsPDF, y: number, margin: number = 20): number {
    if (y > 265) { doc.addPage(); return margin }
    return y
}

// Pedidos List PDF
interface PedidoRow { numero: number; clienteNombre: string; fecha: string; total: number; estado: string; items: number }

export function ExportPedidosPDF({ pedidos }: { pedidos: PedidoRow[] }) {
    const exportar = () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        let y = pdfHeader(doc, 'Listado de Pedidos', `${pedidos.length} pedidos`)

        const cols = [
            { label: 'N°', x: 22 },
            { label: 'CLIENTE', x: 38 },
            { label: 'FECHA', x: 100 },
            { label: 'TOTAL', x: 135 },
            { label: 'ESTADO', x: 165 },
        ]
        y = pdfTableHeader(doc, y, cols)

        doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
        for (const p of pedidos) {
            y = checkPage(doc, y)
            doc.text(`#${p.numero}`, 22, y)
            doc.text(p.clienteNombre.substring(0, 25), 38, y)
            doc.text(formatDate(p.fecha), 100, y)
            doc.text(formatCurrency(p.total), 135, y)
            doc.text(p.estado.toUpperCase(), 165, y)
            y += 6
        }

        const totalGeneral = pedidos.reduce((s, p) => s + p.total, 0)
        y += 4; doc.setDrawColor(100); doc.setLineWidth(0.5); doc.line(20, y, 190, y); y += 8
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
        doc.text(`TOTAL GENERAL: ${formatCurrency(totalGeneral)}`, 190, y, { align: 'right' })

        doc.save(`pedidos-${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.pdf`)
    }

    return (
        <button onClick={exportar} className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            Exportar PDF
        </button>
    )
}

// Clientes List PDF
interface ClienteRow { nombre: string; direccion: string; telefono: string; saldo: number; fecha: string }

export function ExportClientesPDF({ clientes }: { clientes: ClienteRow[] }) {
    const exportar = () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        let y = pdfHeader(doc, 'Listado de Clientes', `${clientes.length} clientes activos`)

        const cols = [
            { label: 'CLIENTE', x: 22 },
            { label: 'DIRECCIÓN', x: 75 },
            { label: 'TELÉFONO', x: 130 },
            { label: 'SALDO', x: 168 },
        ]
        y = pdfTableHeader(doc, y, cols)

        doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
        for (const c of clientes) {
            y = checkPage(doc, y)
            doc.setFont('helvetica', 'bold')
            doc.text(c.nombre.substring(0, 22), 22, y)
            doc.setFont('helvetica', 'normal')
            doc.text((c.direccion || '–').substring(0, 22), 75, y)
            doc.text(c.telefono || '–', 130, y)
            const saldo = Number(c.saldo)
            if (saldo > 0) doc.setTextColor(220, 38, 38)
            else if (saldo < 0) doc.setTextColor(22, 163, 74)
            doc.text(formatCurrency(saldo), 168, y)
            doc.setTextColor(0)
            y += 6
        }

        const totalDeuda = clientes.filter(c => c.saldo > 0).reduce((s, c) => s + c.saldo, 0)
        y += 4; doc.setDrawColor(100); doc.setLineWidth(0.5); doc.line(20, y, 190, y); y += 8
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
        doc.text(`Deuda total de clientes: ${formatCurrency(totalDeuda)}`, 190, y, { align: 'right' })

        doc.save(`clientes-${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.pdf`)
    }

    return (
        <button onClick={exportar} className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            Exportar PDF
        </button>
    )
}

// Artículos List PDF
interface ArticuloRow { nombre: string; rubro: string; proveedor: string; costo: number; precio: number; unidad: string }

export function ExportArticulosPDF({ articulos }: { articulos: ArticuloRow[] }) {
    const exportar = () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        let y = pdfHeader(doc, 'Lista de Precios', `${articulos.length} artículos`)

        const cols = [
            { label: 'ARTÍCULO', x: 22 },
            { label: 'RUBRO', x: 85 },
            { label: 'UNIDAD', x: 120 },
            { label: 'COSTO', x: 145 },
            { label: 'PRECIO', x: 170 },
        ]
        y = pdfTableHeader(doc, y, cols)

        doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
        let currentRubro = ''
        for (const a of articulos) {
            y = checkPage(doc, y)
            // Rubro separator
            if (a.rubro && a.rubro !== currentRubro) {
                currentRubro = a.rubro
                if (y > 20) { y += 2 }
                doc.setFillColor(240, 240, 245)
                doc.rect(20, y - 4, 170, 7, 'F')
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
                doc.text(currentRubro.toUpperCase(), 22, y)
                y += 6
                doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
            }
            doc.text(a.nombre.substring(0, 28), 22, y)
            doc.text((a.rubro || '–').substring(0, 14), 85, y)
            doc.text(a.unidad, 120, y)
            doc.text(a.costo ? formatCurrency(a.costo) : '–', 145, y)
            doc.setFont('helvetica', 'bold')
            doc.text(formatCurrency(a.precio), 170, y)
            doc.setFont('helvetica', 'normal')
            y += 6
        }

        doc.save(`lista-precios-${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.pdf`)
    }

    return (
        <button onClick={exportar} className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            Exportar PDF
        </button>
    )
}

// Export All Packs PDF
interface PackRow { nombre: string; descripcion?: string; rubro?: string; items: { nombre: string; cantidad: number; unidad: string; precio: number }[] }

export function ExportAllPacksPDF({ packs }: { packs: PackRow[] }) {
    const exportar = () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        let y = pdfHeader(doc, 'Catálogo de Packs', `${packs.length} packs`)

        for (let pi = 0; pi < packs.length; pi++) {
            const pack = packs[pi]
            y = checkPage(doc, y)

            // Pack header
            doc.setFillColor(37, 99, 235)
            doc.rect(20, y - 4, 170, 9, 'F')
            doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
            doc.text(pack.nombre, 24, y + 1)
            if (pack.rubro) {
                doc.setFontSize(9); doc.text(pack.rubro, 180, y + 1, { align: 'right' })
            }
            doc.setTextColor(0); y += 8

            if (pack.descripcion) {
                doc.setFont('helvetica', 'italic'); doc.setFontSize(9)
                doc.text(pack.descripcion, 22, y); y += 5
            }

            // Items
            const itemCols = [
                { label: 'ARTÍCULO', x: 24 },
                { label: 'CANT. SUGERIDA', x: 120 },
                { label: 'PRECIO', x: 165 },
            ]
            y = pdfTableHeader(doc, y, itemCols)

            doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
            for (const item of pack.items) {
                y = checkPage(doc, y)
                doc.text(item.nombre.substring(0, 35), 24, y)
                doc.text(`${item.cantidad} ${item.unidad}`, 120, y)
                doc.text(formatCurrency(item.precio), 165, y)
                y += 6
            }
            y += 6
        }

        doc.save(`packs-catalogo-${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.pdf`)
    }

    return (
        <button onClick={exportar} className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            Exportar Catálogo PDF
        </button>
    )
}
