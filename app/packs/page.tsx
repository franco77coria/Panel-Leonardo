'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import jsPDF from 'jspdf'

interface Articulo { id: string; nombre: string; costo: number; precio: number; rubro?: { nombre: string } }
interface ListaItem { articuloId: string; nombre: string; rubroNombre: string; lista: number; precio: number }
interface PackSaved { id: string; nombre: string; descripcion?: string; rubro?: { nombre: string }; items: { articuloId: string; articulo: Articulo }[] }

const FACTORES: Record<number, number> = { 1: 1.20, 2: 1.25, 3: 1.35 }
const getPrecioBase = (a: Articulo) => Number(a.costo) > 0 ? Number(a.costo) : Number(a.precio)

export default function ListasPreciosPage() {
    // Listas guardadas
    const [listas, setListas] = useState<PackSaved[]>([])
    const [listaActualId, setListaActualId] = useState<string | null>(null)
    const [nombreLista, setNombreLista] = useState('')
    const [creandoNueva, setCreandoNueva] = useState(false)
    const [nombreNueva, setNombreNueva] = useState('')

    // Items de la lista activa
    const [items, setItems] = useState<ListaItem[]>([])
    const [listaDefault, setListaDefault] = useState<number>(1)
    const [query, setQuery] = useState('')
    const [resultados, setResultados] = useState<Articulo[]>([])
    const [showResults, setShowResults] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingValue, setEditingValue] = useState('')
    const [saving, setSaving] = useState(false)
    const [dirty, setDirty] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const articulosCache = useRef<Map<string, Articulo>>(new Map())

    // Cargar listas guardadas
    useEffect(() => {
        fetchListas()
    }, [])

    const fetchListas = () => fetch('/api/packs').then(r => r.json()).then(setListas).catch(() => {})

    // Buscar articulos
    const buscarArticulos = useCallback((q: string) => {
        if (q.length < 2) { setResultados([]); return }
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            const res = await fetch(`/api/articulos?q=${encodeURIComponent(q)}`)
            const data = await res.json()
            setResultados(Array.isArray(data) ? data : [])
        }, 300)
    }, [])

    useEffect(() => { buscarArticulos(query) }, [query, buscarArticulos])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Cargar una lista guardada
    const cargarLista = (pack: PackSaved) => {
        setListaActualId(pack.id)
        setNombreLista(pack.nombre)
        setDirty(false)

        const newItems: ListaItem[] = []
        for (const pi of pack.items) {
            const a = pi.articulo
            articulosCache.current.set(a.id, a)
            const precio = Math.round(getPrecioBase(a) * FACTORES[listaDefault] * 100) / 100
            newItems.push({ articuloId: a.id, nombre: a.nombre, rubroNombre: a.rubro?.nombre || '', lista: listaDefault, precio })
        }
        setItems(newItems)
    }

    // Nueva lista
    const crearNuevaLista = async () => {
        if (!nombreNueva.trim()) return alert('Ingresá un nombre para la lista')
        setSaving(true)
        const res = await fetch('/api/packs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nombreNueva.trim(), items: [] }),
        })
        const pack = await res.json()
        setSaving(false)
        setCreandoNueva(false)
        setNombreNueva('')
        await fetchListas()
        // Seleccionar la nueva lista
        setListaActualId(pack.id)
        setNombreLista(pack.nombre)
        setItems([])
        setDirty(false)
    }

    // Guardar lista actual
    const guardarLista = async () => {
        if (!listaActualId) return
        setSaving(true)
        await fetch(`/api/packs/${listaActualId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nombreLista,
                items: items.map(i => ({ articuloId: i.articuloId, cantidadSugerida: 1 })),
            }),
        })
        setSaving(false)
        setDirty(false)
        fetchListas()
    }

    // Eliminar lista
    const eliminarLista = async (id: string, nombre: string) => {
        if (!confirm(`¿Eliminar la lista "${nombre}"?`)) return
        await fetch(`/api/packs/${id}`, { method: 'DELETE' })
        if (listaActualId === id) {
            setListaActualId(null)
            setItems([])
            setNombreLista('')
        }
        fetchListas()
    }

    const agregarArticulo = (a: Articulo) => {
        if (items.find(i => i.articuloId === a.id)) return
        articulosCache.current.set(a.id, a)
        const precio = Math.round(getPrecioBase(a) * FACTORES[listaDefault] * 100) / 100
        setItems(prev => [...prev, { articuloId: a.id, nombre: a.nombre, rubroNombre: a.rubro?.nombre || '', lista: listaDefault, precio }])
        setQuery('')
        setShowResults(false)
        setDirty(true)
    }

    const quitarArticulo = (articuloId: string) => {
        setItems(prev => prev.filter(i => i.articuloId !== articuloId))
        setDirty(true)
    }

    const cambiarListaGlobal = (n: number) => {
        setListaDefault(n)
        setItems(prev => prev.map(item => {
            const art = articulosCache.current.get(item.articuloId)
            if (!art) return { ...item, lista: n }
            return { ...item, lista: n, precio: Math.round(getPrecioBase(art) * FACTORES[n] * 100) / 100 }
        }))
    }

    const cambiarListaItem = (articuloId: string, n: number) => {
        setItems(prev => prev.map(item => {
            if (item.articuloId !== articuloId) return item
            const art = articulosCache.current.get(articuloId)
            if (!art) return { ...item, lista: n }
            return { ...item, lista: n, precio: Math.round(getPrecioBase(art) * FACTORES[n] * 100) / 100 }
        }))
    }

    const actualizarPrecios = async () => {
        if (items.length === 0) return
        const ids = items.map(i => i.articuloId)
        const promises = ids.map(id => fetch(`/api/articulos/${id}`).then(r => r.json()).catch(() => null))
        const articulos = await Promise.all(promises)

        const newItems: ListaItem[] = []
        for (let idx = 0; idx < items.length; idx++) {
            const art = articulos[idx]
            if (!art) { newItems.push(items[idx]); continue }
            articulosCache.current.set(art.id, art)
            const itemLista = items[idx].lista
            newItems.push({
                ...items[idx],
                nombre: art.nombre,
                rubroNombre: art.rubro?.nombre || '',
                precio: Math.round(getPrecioBase(art) * FACTORES[itemLista] * 100) / 100,
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

        doc.setFontSize(26); doc.setFont('helvetica', 'bold')
        doc.text('PAPELERA LEO', 105, y, { align: 'center' }); y += 8
        doc.setFontSize(11); doc.setFont('helvetica', 'normal')
        doc.text('Tel: 11 3808-8724 - WhatsApp', 105, y, { align: 'center' }); y += 10

        doc.setFontSize(16); doc.setFont('helvetica', 'bold')
        doc.text(nombreLista || 'Lista de Precios', 105, y, { align: 'center' }); y += 7

        doc.setFontSize(10); doc.setFont('helvetica', 'normal')
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 105, y, { align: 'center' }); y += 6
        doc.line(20, y, 190, y); y += 8

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
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
                    {/* Panel izquierdo: listas guardadas */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h2 style={{ fontWeight: 700, fontSize: 15 }}>Mis Listas</h2>
                            <button onClick={() => setCreandoNueva(true)} className="btn btn-primary btn-sm">+ Nueva</button>
                        </div>

                        {creandoNueva && (
                            <div className="card" style={{ marginBottom: 12, padding: 12 }}>
                                <input
                                    value={nombreNueva}
                                    onChange={e => setNombreNueva(e.target.value)}
                                    placeholder="Nombre de la lista..."
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') crearNuevaLista(); if (e.key === 'Escape') setCreandoNueva(false) }}
                                    style={{ marginBottom: 8, width: '100%' }}
                                />
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={crearNuevaLista} disabled={saving} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                                        {saving ? '...' : 'Crear'}
                                    </button>
                                    <button onClick={() => setCreandoNueva(false)} className="btn btn-secondary btn-sm">Cancelar</button>
                                </div>
                            </div>
                        )}

                        {listas.length === 0 && !creandoNueva ? (
                            <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>
                                No hay listas creadas
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {listas.map(l => (
                                    <div
                                        key={l.id}
                                        onClick={() => cargarLista(l)}
                                        style={{
                                            padding: '12px 14px', borderRadius: 'var(--radius)', cursor: 'pointer',
                                            border: listaActualId === l.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            background: listaActualId === l.id ? 'var(--blue-light)' : 'white',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 14 }}>{l.nombre}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.items.length} artículo{l.items.length !== 1 ? 's' : ''}</div>
                                            </div>
                                            <button
                                                onClick={e => { e.stopPropagation(); eliminarLista(l.id, l.nombre) }}
                                                className="btn btn-ghost btn-sm"
                                                style={{ padding: 4, color: 'var(--red)' }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Panel derecho: editor */}
                    <div>
                        {!listaActualId ? (
                            <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                                Seleccioná una lista o creá una nueva
                            </div>
                        ) : (
                            <>
                                {/* Nombre editable + guardar */}
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                                    <input
                                        value={nombreLista}
                                        onChange={e => { setNombreLista(e.target.value); setDirty(true) }}
                                        style={{ flex: 1, fontSize: 18, fontWeight: 700, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                                    />
                                    <button onClick={guardarLista} disabled={saving} className="btn btn-primary">
                                        {saving ? 'Guardando...' : dirty ? 'Guardar *' : 'Guardar'}
                                    </button>
                                </div>

                                {/* Lista selector + acciones */}
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>Lista general:</span>
                                    {[1, 2, 3].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => cambiarListaGlobal(n)}
                                            className={listaDefault === n ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                                        >
                                            Lista {n} (×{FACTORES[n].toFixed(2)})
                                        </button>
                                    ))}
                                    <div style={{ flex: 1 }} />
                                    {items.length > 0 && (
                                        <button onClick={actualizarPrecios} className="btn btn-secondary btn-sm">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                                            Actualizar Precios
                                        </button>
                                    )}
                                </div>

                                {/* Buscador */}
                                <div ref={searchRef} style={{ position: 'relative', marginBottom: 16 }}>
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
                                                        {formatCurrency(Math.round(getPrecioBase(a) * FACTORES[listaDefault] * 100) / 100)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Tabla */}
                                {items.length === 0 ? (
                                    <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                        Buscá artículos y agregalos a la lista
                                    </div>
                                ) : (
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Artículo</th>
                                                    <th>Rubro</th>
                                                    <th style={{ textAlign: 'center' }}>Lista</th>
                                                    <th style={{ textAlign: 'right' }}>Precio</th>
                                                    <th style={{ width: 40 }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map(item => (
                                                    <tr key={item.articuloId}>
                                                        <td><strong>{item.nombre}</strong></td>
                                                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{item.rubroNombre || '–'}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div style={{ display: 'inline-flex', gap: 2 }}>
                                                                {[1, 2, 3].map(n => (
                                                                    <button
                                                                        key={n}
                                                                        onClick={() => cambiarListaItem(item.articuloId, n)}
                                                                        style={{
                                                                            width: 28, height: 26, border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                                                            background: item.lista === n ? 'var(--primary)' : 'var(--bg)',
                                                                            color: item.lista === n ? 'white' : 'var(--text-muted)',
                                                                        }}
                                                                    >
                                                                        {n}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </td>
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
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
