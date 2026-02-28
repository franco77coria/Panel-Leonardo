'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import jsPDF from 'jspdf'

interface Articulo { id: string; nombre: string; costo: number; precio: number; rubro?: { nombre: string } }
interface ListaItem { articuloId: string; nombre: string; rubroNombre: string; precio: number }

const FACTORES: Record<number, number> = { 1: 1.20, 2: 1.25, 3: 1.35 }
const getPrecioBase = (a: Articulo) => Number(a.costo) > 0 ? Number(a.costo) : Number(a.precio)

export default function ListasPreciosPage() {
    const [items, setItems] = useState<ListaItem[]>([])
    const [lista, setLista] = useState<number>(1)
    const [query, setQuery] = useState('')
    const [resultados, setResultados] = useState<Articulo[]>([])
    const [showResults, setShowResults] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingValue, setEditingValue] = useState('')
    const searchRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Almacenar articulos originales para recalcular
    const articulosCache = useRef<Map<string, Articulo>>(new Map())

    const buscarArticulos = useCallback((q: string) => {
        if (q.length < 2) { setResultados([]); return }
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            const res = await fetch(`/api/articulos?q=${encodeURIComponent(q)}`)
            const data = await res.json()
            setResultados(Array.isArray(data) ? data : [])
        }, 300)
    }, [])

    useEffect(() => {
        buscarArticulos(query)
    }, [query, buscarArticulos])

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const agregarArticulo = (a: Articulo) => {
        if (items.find(i => i.articuloId === a.id)) return
        articulosCache.current.set(a.id, a)
        const precio = Math.round(getPrecioBase(a) * FACTORES[lista] * 100) / 100
        setItems(prev => [...prev, { articuloId: a.id, nombre: a.nombre, rubroNombre: a.rubro?.nombre || '', precio }])
        setQuery('')
        setShowResults(false)
    }

    const quitarArticulo = (articuloId: string) => {
        setItems(prev => prev.filter(i => i.articuloId !== articuloId))
    }

    const cambiarLista = (n: number) => {
        setLista(n)
        setItems(prev => prev.map(item => {
            const art = articulosCache.current.get(item.articuloId)
            if (!art) return item
            return { ...item, precio: Math.round(getPrecioBase(art) * FACTORES[n] * 100) / 100 }
        }))
    }

    const actualizarPrecios = async () => {
        if (items.length === 0) return
        // Re-fetch todos los articulos que tenemos en la lista
        const ids = items.map(i => i.articuloId)
        const promises = ids.map(id => fetch(`/api/articulos/${id}`).then(r => r.json()).catch(() => null))
        const articulos = await Promise.all(promises)

        const newItems: ListaItem[] = []
        for (let idx = 0; idx < items.length; idx++) {
            const art = articulos[idx]
            if (!art) { newItems.push(items[idx]); continue }
            articulosCache.current.set(art.id, art)
            newItems.push({
                ...items[idx],
                nombre: art.nombre,
                rubroNombre: art.rubro?.nombre || '',
                precio: Math.round(getPrecioBase(art) * FACTORES[lista] * 100) / 100,
            })
        }
        setItems(newItems)
    }

    const startEditPrice = (articuloId: string, currentPrice: number) => {
        setEditingId(articuloId)
        setEditingValue(String(currentPrice))
    }

    const saveEditPrice = () => {
        if (!editingId) return
        const num = parseFloat(editingValue)
        if (!isNaN(num) && num >= 0) {
            setItems(prev => prev.map(i => i.articuloId === editingId ? { ...i, precio: Math.round(num * 100) / 100 } : i))
        }
        setEditingId(null)
    }

    const generarPDF = () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        let y = 20

        // Header Papelera Leo
        doc.setFontSize(26); doc.setFont('helvetica', 'bold')
        doc.text('PAPELERA LEO', 105, y, { align: 'center' }); y += 8
        doc.setFontSize(11); doc.setFont('helvetica', 'normal')
        doc.text('Tel: 11 3808-8724 - WhatsApp', 105, y, { align: 'center' }); y += 10

        doc.setFontSize(16); doc.setFont('helvetica', 'bold')
        doc.text(`Lista de Precios ${lista}`, 105, y, { align: 'center' }); y += 7

        doc.setFontSize(10); doc.setFont('helvetica', 'normal')
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 105, y, { align: 'center' }); y += 6
        doc.line(20, y, 190, y); y += 8

        // Table header
        doc.setFillColor(245, 246, 248)
        doc.rect(20, y - 4, 170, 8, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
        doc.text('ARTÍCULO', 22, y)
        doc.text('PRECIO', 175, y, { align: 'right' })
        y += 6; doc.line(20, y, 190, y); y += 6

        doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
        for (const item of items) {
            if (y > 270) { doc.addPage(); y = 20 }
            doc.text(item.nombre.substring(0, 55), 22, y)
            doc.setFont('helvetica', 'bold')
            doc.text(formatCurrency(item.precio), 175, y, { align: 'right' })
            doc.setFont('helvetica', 'normal')
            y += 7
        }

        window.open(doc.output('bloburl'), '_blank')
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Listas de Precios</h1>
                {items.length > 0 && (
                    <button onClick={generarPDF} className="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        Exportar PDF
                    </button>
                )}
            </div>

            <div className="page-body">
                {/* Barra superior: Lista selector + Actualizar */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Lista:</span>
                    {[1, 2, 3].map(n => (
                        <button
                            key={n}
                            onClick={() => cambiarLista(n)}
                            className={lista === n ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                        >
                            Lista {n} (×{FACTORES[n].toFixed(2)})
                        </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    {items.length > 0 && (
                        <>
                            <button onClick={actualizarPrecios} className="btn btn-secondary btn-sm">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                                Actualizar Precios
                            </button>
                            <button onClick={() => { setItems([]); articulosCache.current.clear() }} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}>
                                Limpiar Lista
                            </button>
                        </>
                    )}
                </div>

                {/* Buscador de artículos */}
                <div ref={searchRef} style={{ position: 'relative', marginBottom: 20 }}>
                    <input
                        type="text"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setShowResults(true) }}
                        onFocus={() => query.length >= 2 && setShowResults(true)}
                        placeholder="Buscar artículo para agregar..."
                        style={{ width: '100%' }}
                    />
                    {showResults && resultados.length > 0 && (
                        <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                            background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                            maxHeight: 300, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            {resultados.map(a => (
                                <div
                                    key={a.id}
                                    onClick={() => agregarArticulo(a)}
                                    style={{
                                        padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                                        borderBottom: '1px solid var(--border)',
                                        background: items.find(i => i.articuloId === a.id) ? 'var(--bg)' : 'white',
                                        opacity: items.find(i => i.articuloId === a.id) ? 0.5 : 1,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = items.find(i => i.articuloId === a.id) ? 'var(--bg)' : 'white')}
                                >
                                    <div>
                                        <strong>{a.nombre}</strong>
                                        {a.rubro && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{a.rubro.nombre}</span>}
                                    </div>
                                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                        {formatCurrency(Math.round(getPrecioBase(a) * FACTORES[lista] * 100) / 100)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tabla de items */}
                {items.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        Buscá artículos y agregalos a la lista de precios
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Artículo</th>
                                    <th>Rubro</th>
                                    <th style={{ textAlign: 'right' }}>Precio</th>
                                    <th style={{ width: 40 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.articuloId}>
                                        <td><strong>{item.nombre}</strong></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{item.rubroNombre || '–'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            {editingId === item.articuloId ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editingValue}
                                                    onChange={e => setEditingValue(e.target.value)}
                                                    onBlur={saveEditPrice}
                                                    onKeyDown={e => { if (e.key === 'Enter') saveEditPrice(); if (e.key === 'Escape') setEditingId(null) }}
                                                    autoFocus
                                                    style={{ width: 100, textAlign: 'right', padding: '4px 8px' }}
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => startEditPrice(item.articuloId, item.precio)}
                                                    style={{ cursor: 'pointer', borderBottom: '1px dashed var(--text-muted)', fontWeight: 700, color: 'var(--primary)' }}
                                                    title="Click para editar"
                                                >
                                                    {formatCurrency(item.precio)}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <button onClick={() => quitarArticulo(item.articuloId)} className="btn btn-ghost btn-sm" style={{ padding: 4, color: 'var(--red)' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    )
}
