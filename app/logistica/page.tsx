'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import jsPDF from 'jspdf'

interface Pedido { id: string; numero: number; estado: string; total: number; createdAt: string; cliente: { nombre: string }; items: { id: string }[] }
interface Consolidado { nombre: string; rubro: string; cantidad: number; unidad: string }

export default function LogisticaPage() {
    const [pedidos, setPedidos] = useState<Pedido[]>([])
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
    const [consolidado, setConsolidado] = useState<Consolidado[]>([])
    const [loading, setLoading] = useState(false)
    const [generado, setGenerado] = useState(false)

    useEffect(() => {
        fetch('/api/pedidos?estado=pendiente').then(r => r.json()).then(data => {
            setPedidos(Array.isArray(data) ? data : [])
        })
    }, [])

    const togglePedido = (id: string) => {
        const next = new Set(seleccionados)
        next.has(id) ? next.delete(id) : next.add(id)
        setSeleccionados(next)
        setGenerado(false)
    }

    const toggleTodos = () => {
        if (seleccionados.size === pedidos.length) {
            setSeleccionados(new Set())
        } else {
            setSeleccionados(new Set(pedidos.map(p => p.id)))
        }
        setGenerado(false)
    }

    const handleConsolidar = async () => {
        if (seleccionados.size === 0) return alert('Seleccioná al menos un pedido')
        setLoading(true)
        const res = await fetch('/api/logistica/consolidar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pedidoIds: Array.from(seleccionados) }),
        })
        setConsolidado(await res.json())
        setLoading(false)
        setGenerado(true)
    }

    const generarPDF = () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        let y = 20

        doc.setFontSize(22); doc.setFont('helvetica', 'bold')
        doc.text('LISTA DE ARMADO', 105, y, { align: 'center' }); y += 10

        doc.setFontSize(12); doc.setFont('helvetica', 'normal')
        doc.text(`Fecha: ${formatDate(new Date().toISOString())}`, 20, y)
        doc.text(`Pedidos: ${seleccionados.size}`, 130, y); y += 8
        doc.line(20, y, 190, y); y += 8

        // Por rubro
        let currentRubro = ''
        for (const item of consolidado) {
            if (item.rubro !== currentRubro) {
                if (y > 250) { doc.addPage(); y = 20 }
                currentRubro = item.rubro
                y += 4
                doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
                doc.text(`▪ ${currentRubro}`, 20, y); y += 7
            }
            doc.setFont('helvetica', 'normal'); doc.setFontSize(12)
            const cantStr = `${item.cantidad} ${item.unidad}`
            doc.text(`   ${item.nombre}`, 20, y)
            doc.text(cantStr, 170, y, { align: 'right' }); y += 7
            if (y > 270) { doc.addPage(); y = 20 }
        }

        doc.save(`lista-armado-${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.pdf`)
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Logística – Lista de Armado</h1>
                {generado && (
                    <button onClick={generarPDF} className="btn btn-primary"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>Exportar PDF</button>
                )}
            </div>
            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Panel izquierdo: pedidos */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h2 style={{ fontWeight: 700, fontSize: 16 }}>Pedidos Pendientes ({pedidos.length})</h2>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={toggleTodos} className="btn btn-secondary btn-sm">
                                    {seleccionados.size === pedidos.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                                </button>
                                <button onClick={handleConsolidar} disabled={loading || seleccionados.size === 0} className="btn btn-primary btn-sm">
                                    {loading ? '...' : `Generar Lista (${seleccionados.size})`}
                                </button>
                            </div>
                        </div>
                        {pedidos.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                No hay pedidos pendientes de armado
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {pedidos.map(p => (
                                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: seleccionados.has(p.id) ? 'var(--blue-light)' : 'white', border: `1px solid ${seleccionados.has(p.id) ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.15s' }}>
                                        <input type="checkbox" checked={seleccionados.has(p.id)} onChange={() => togglePedido(p.id)} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700 }}>#{p.numero} – {p.cliente.nombre}</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.items.length} artículo{p.items.length !== 1 ? 's' : ''} • {formatDate(p.createdAt)}</div>
                                        </div>
                                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(Number(p.total))}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Panel derecho: consolidado */}
                    <div>
                        <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
                            Lista de Armado Consolidada
                            {generado && <span className="badge badge-blue" style={{ marginLeft: 10 }}>{seleccionados.size} pedidos</span>}
                        </h2>
                        {!generado ? (
                            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                Seleccioná los pedidos y hacé click en <strong>Generar Lista</strong>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Artículo</th>
                                            <th>Rubro</th>
                                            <th style={{ textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {consolidado.map((item, i) => (
                                            <tr key={i}>
                                                <td><strong>{item.nombre}</strong></td>
                                                <td><span className="badge badge-blue">{item.rubro}</span></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <strong style={{ fontSize: 17, color: 'var(--primary)' }}>{item.cantidad} {item.unidad}</strong>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
