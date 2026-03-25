'use client'

import { useState, useMemo } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import jsPDF from 'jspdf'
import Link from 'next/link'

interface Pago {
    id: string
    monto: number
    descripcion: string | null
    createdAt: string
    cliente: { id: string; nombre: string }
}

export default function PagosPage() {
    const [desde, setDesde] = useState('')
    const [hasta, setHasta] = useState('')
    const [pagos, setPagos] = useState<Pago[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    const [filtroTipo, setFiltroTipo] = useState('Todos')

    const buscar = async () => {
        if (!desde || !hasta) return alert('Seleccioná ambas fechas')
        setLoading(true)
        setFiltroTipo('Todos')
        const res = await fetch(`/api/pagos?desde=${desde}&hasta=${hasta}`)
        const data = await res.json()
        setPagos(data.pagos)
        setTotal(data.total)
        setSearched(true)
        setLoading(false)
    }

    const getDetalle = (descripcion: string | null): string => {
        if (!descripcion) return 'Sin detalle'
        const match = descripcion.match(/^Pago recibido:\s*(.+)$/i)
        return match ? match[1].trim() : (descripcion === 'Pago recibido' ? 'Sin detalle' : descripcion)
    }

    // Calcular desglose por tipo de pago
    const desglose = useMemo(() => {
        const tipos: Record<string, { count: number; total: number }> = {}
        pagos.forEach(p => {
            const tipo = getDetalle(p.descripcion)
            if (!tipos[tipo]) tipos[tipo] = { count: 0, total: 0 }
            tipos[tipo].count++
            tipos[tipo].total += Number(p.monto)
        })
        return Object.entries(tipos)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([tipo, data]) => ({ tipo, ...data }))
    }, [pagos])

    // Filtrar pagos por tipo
    const pagosFiltrados = useMemo(() => {
        if (filtroTipo === 'Todos') return pagos
        return pagos.filter(p => getDetalle(p.descripcion) === filtroTipo)
    }, [pagos, filtroTipo])

    const totalFiltrado = useMemo(() => {
        return pagosFiltrados.reduce((sum, p) => sum + Number(p.monto), 0)
    }, [pagosFiltrados])

    const generarPDF = () => {
        if (pagosFiltrados.length === 0) return
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        let y = 20

        // Header
        doc.setFontSize(18); doc.setFont('helvetica', 'bold')
        doc.text('REPORTE DE PAGOS RECIBIDOS', 105, y, { align: 'center' }); y += 8
        doc.setFontSize(10); doc.setFont('helvetica', 'normal')
        const fDesde = desde.split('-').reverse().join('/')
        const fHasta = hasta.split('-').reverse().join('/')
        doc.text(`Período: ${fDesde} al ${fHasta}`, 105, y, { align: 'center' }); y += 5
        doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')}`, 105, y, { align: 'center' }); y += 5
        if (filtroTipo !== 'Todos') {
            doc.text(`Filtro: ${filtroTipo}`, 105, y, { align: 'center' }); y += 5
        }
        doc.text(`${pagosFiltrados.length} pagos encontrados`, 105, y, { align: 'center' }); y += 6
        doc.setDrawColor(200); doc.line(15, y, 195, y); y += 6

        // Desglose por tipo (solo si no hay filtro activo)
        if (filtroTipo === 'Todos' && desglose.length > 1) {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
            doc.text('DESGLOSE POR TIPO:', 17, y); y += 6
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
            for (const d of desglose) {
                doc.text(`${d.tipo}: ${d.count} pagos — ${formatCurrency(d.total)}`, 22, y); y += 5
            }
            y += 3; doc.setDrawColor(200); doc.line(15, y, 195, y); y += 6
        }

        // Table header
        doc.setFillColor(245, 246, 248)
        doc.rect(15, y - 4, 180, 8, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
        doc.text('FECHA', 17, y)
        doc.text('CLIENTE', 48, y)
        doc.text('DETALLE', 110, y)
        doc.text('MONTO', 175, y, { align: 'right' })
        y += 6; doc.setDrawColor(200); doc.line(15, y, 195, y); y += 5

        // Rows
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
        for (const p of pagosFiltrados) {
            if (y > 265) { doc.addPage(); y = 20 }
            doc.text(formatDate(p.createdAt), 17, y)
            doc.text(p.cliente.nombre.substring(0, 28), 48, y)
            doc.text(getDetalle(p.descripcion).substring(0, 25), 110, y)
            doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74)
            doc.text(formatCurrency(Number(p.monto)), 175, y, { align: 'right' })
            doc.setTextColor(0); doc.setFont('helvetica', 'normal')
            y += 6
        }

        // Total
        y += 4; doc.setLineWidth(0.5); doc.line(15, y, 195, y); y += 8
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
        doc.text(`TOTAL: ${formatCurrency(totalFiltrado)}`, 195, y, { align: 'right' })

        // Footer
        y += 12
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150)
        doc.text('Papelera Leo | Documento no válido como factura', 105, y, { align: 'center' })

        window.open(doc.output('bloburl'), '_blank')
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reporte de Pagos</h1>
                    <p className="page-subtitle">Consultá los pagos recibidos en un período de tiempo</p>
                </div>
            </div>

            {/* Filtros de fecha */}
            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Desde</label>
                        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Hasta</label>
                        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={buscar} disabled={loading}>
                        {loading ? 'Buscando...' : 'Buscar'}
                    </button>
                    {pagosFiltrados.length > 0 && (
                        <button className="btn btn-secondary" onClick={generarPDF}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            Exportar PDF
                        </button>
                    )}
                </div>
            </div>

            {/* Resultados */}
            {searched && (
                <>
                    {pagos.length === 0 ? (
                        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No se encontraron pagos en el período seleccionado.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desglose por tipo */}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                                <button
                                    className={`btn btn-sm ${filtroTipo === 'Todos' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setFiltroTipo('Todos')}
                                    style={{ fontSize: 12 }}
                                >
                                    Todos ({pagos.length})
                                </button>
                                {desglose.map(d => (
                                    <button
                                        key={d.tipo}
                                        className={`btn btn-sm ${filtroTipo === d.tipo ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setFiltroTipo(d.tipo)}
                                        style={{ fontSize: 12 }}
                                    >
                                        {d.tipo} ({d.count})
                                    </button>
                                ))}
                            </div>

                            {/* Cards de resumen por tipo */}
                            {filtroTipo === 'Todos' && desglose.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(desglose.length, 3)}, 1fr)`, gap: 8, marginBottom: 12 }}>
                                    {desglose.map(d => (
                                        <div
                                            key={d.tipo}
                                            className="card"
                                            style={{ padding: 12, cursor: 'pointer', transition: 'background .15s' }}
                                            onClick={() => setFiltroTipo(d.tipo)}
                                        >
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{d.tipo}</div>
                                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', marginTop: 2 }}>
                                                {formatCurrency(d.total)}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                                {d.count} {d.count === 1 ? 'pago' : 'pagos'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tabla de pagos */}
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Cliente</th>
                                            <th>Detalle</th>
                                            <th style={{ textAlign: 'right' }}>Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagosFiltrados.map(p => (
                                            <tr key={p.id}>
                                                <td style={{ fontSize: 12 }}>{formatDate(p.createdAt)}</td>
                                                <td>
                                                    <Link href={`/clientes/${p.cliente.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                                                        {p.cliente.nombre}
                                                    </Link>
                                                </td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{getDetalle(p.descripcion)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>
                                                    {formatCurrency(Number(p.monto))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Total */}
                            <div className="card" style={{ marginTop: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                    {pagosFiltrados.length} pagos{filtroTipo !== 'Todos' ? ` (${filtroTipo})` : ''}
                                </span>
                                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>
                                    Total: {formatCurrency(totalFiltrado)}
                                </span>
                            </div>
                        </>
                    )}
                </>
            )}
        </>
    )
}
