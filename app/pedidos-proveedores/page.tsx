'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'

interface Proveedor { id: string; nombre: string; telefono?: string }
interface Articulo { id: string; nombre: string; costo: number; precio: number; unidad: string }
interface Item { articuloId: string; nombre: string; unidad: string; cantidad: number; costo: number }

const getCosto = (a: Articulo) => Number(a.costo) > 0 ? Number(a.costo) : Number(a.precio)

export default function PedidosProveedoresPage() {
    const [proveedores, setProveedores] = useState<Proveedor[]>([])
    const [proveedorId, setProveedorId] = useState<string>('')
    const [proveedorNombre, setProveedorNombre] = useState<string>('')

    const [articulosProveedor, setArticulosProveedor] = useState<Articulo[]>([])
    const [query, setQuery] = useState('')
    const [resultados, setResultados] = useState<Articulo[]>([])
    const [showResults, setShowResults] = useState(false)
    const [items, setItems] = useState<Item[]>([])

    const searchRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        fetch('/api/proveedores').then(r => r.json()).then(setProveedores).catch(() => {})
    }, [])

    useEffect(() => {
        if (!proveedorId) { setArticulosProveedor([]); return }
        fetch(`/api/articulos?proveedorId=${proveedorId}`)
            .then(r => r.json())
            .then(data => setArticulosProveedor(Array.isArray(data) ? data : []))
            .catch(() => {})
    }, [proveedorId])

    const buscar = useCallback((q: string) => {
        if (q.length < 2) { setResultados([]); return }
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            const url = proveedorId
                ? `/api/articulos?q=${encodeURIComponent(q)}&proveedorId=${proveedorId}`
                : `/api/articulos?q=${encodeURIComponent(q)}`
            const res = await fetch(url)
            const data = await res.json()
            setResultados(Array.isArray(data) ? data : [])
        }, 300)
    }, [proveedorId])

    useEffect(() => { buscar(query) }, [query, buscar])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const seleccionarProveedor = (id: string) => {
        const p = proveedores.find(p => p.id === id)
        setProveedorId(id)
        setProveedorNombre(p?.nombre || '')
        setItems([])
    }

    const agregarArticulo = (a: Articulo) => {
        const costo = getCosto(a)
        const existing = items.find(i => i.articuloId === a.id)
        if (existing) {
            setItems(items.map(i => i.articuloId === a.id ? { ...i, cantidad: i.cantidad + 1 } : i))
        } else {
            setItems([{ articuloId: a.id, nombre: a.nombre, unidad: a.unidad, cantidad: 1, costo }, ...items])
        }
        setQuery('')
        setResultados([])
        setShowResults(false)
    }

    const updateCantidad = (articuloId: string, val: string) => {
        const n = parseFloat(val) || 0
        setItems(items.map(i => i.articuloId === articuloId ? { ...i, cantidad: n } : i))
    }

    const removeItem = (articuloId: string) => {
        setItems(items.filter(i => i.articuloId !== articuloId))
    }

    const total = items.reduce((s, i) => s + i.cantidad * i.costo, 0)

    const limpiar = () => { setItems([]) }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Pedido a Proveedores</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                        Calculá el costo estimado de un pedido usando precios de costo (Lista 0)
                    </p>
                </div>
                {items.length > 0 && (
                    <button className="btn btn-ghost" onClick={limpiar} style={{ color: 'var(--red)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                        Limpiar
                    </button>
                )}
            </div>

            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

                    {/* Panel izquierdo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Selector de proveedor */}
                        <div className="card">
                            <div className="card-header">Proveedor</div>
                            <select
                                value={proveedorId}
                                onChange={e => seleccionarProveedor(e.target.value)}
                                style={{ fontSize: 14, fontWeight: 600 }}
                            >
                                <option value="">— Seleccionar proveedor —</option>
                                {proveedores.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Artículos del proveedor */}
                        {proveedorId && articulosProveedor.length > 0 && (
                            <div className="table-container">
                                <div className="table-header">
                                    <span className="table-title">Artículos de {proveedorNombre}</span>
                                </div>
                                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                    {articulosProveedor.map(a => (
                                        <div key={a.id} className="dropdown-item" onClick={() => agregarArticulo(a)}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Costo: {formatCurrency(getCosto(a))}</div>
                                            </div>
                                            <button className="btn btn-primary btn-sm" style={{ padding: '3px 8px' }}>+</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Panel derecho */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Buscador */}
                        <div className="card">
                            <div className="card-header">Buscar artículo</div>
                            <div ref={searchRef} style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder={proveedorId ? `Buscar en artículos de ${proveedorNombre}...` : 'Buscar artículo...'}
                                    value={query}
                                    onChange={e => { setQuery(e.target.value); setShowResults(true) }}
                                    onFocus={() => query && setShowResults(true)}
                                />
                                {showResults && resultados.length > 0 && (
                                    <div className="dropdown">
                                        {resultados.map(a => (
                                            <div key={a.id} className="dropdown-item" onClick={() => agregarArticulo(a)}>
                                                <span>{a.nombre}</span>
                                                <strong style={{ color: 'var(--primary-light)' }}>
                                                    {formatCurrency(getCosto(a))}
                                                </strong>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabla de items */}
                        {items.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Artículo</th>
                                            <th style={{ width: 90 }}>Cant.</th>
                                            <th style={{ width: 110 }}>P. Costo</th>
                                            <th style={{ width: 120 }}>Subtotal</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(item => (
                                            <tr key={item.articuloId}>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{item.nombre}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.unidad}</div>
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0"
                                                        value={item.cantidad}
                                                        onChange={e => updateCantidad(item.articuloId, e.target.value)}
                                                        style={{ width: 75, padding: '5px 8px', fontWeight: 700, textAlign: 'center' }}
                                                    />
                                                </td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                                    {formatCurrency(item.costo)}
                                                </td>
                                                <td>
                                                    <strong style={{ color: 'var(--primary)' }}>
                                                        {formatCurrency(item.cantidad * item.costo)}
                                                    </strong>
                                                </td>
                                                <td>
                                                    <button onClick={() => removeItem(item.articuloId)} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL ESTIMADO</td>
                                            <td colSpan={2}>
                                                <strong style={{ fontSize: 20, color: 'var(--primary)' }}>{formatCurrency(total)}</strong>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                Seleccioná un proveedor o buscá un artículo para empezar
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
