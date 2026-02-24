'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, daysSince, formatDate } from '@/lib/utils'

interface Rubro { id: string; nombre: string }
interface Proveedor { id: string; nombre: string }
interface Articulo { id: string; nombre: string; precio: number; costo: number; unidad: string; fechaPrecio: string; rubro?: Rubro; proveedor?: Proveedor }

export default function ArticulosPage() {
    const [articulos, setArticulos] = useState<Articulo[]>([])
    const [rubros, setRubros] = useState<Rubro[]>([])
    const [proveedores, setProveedores] = useState<Proveedor[]>([])
    const [q, setQ] = useState('')
    const [rubroId, setRubroId] = useState('')
    const [proveedorId, setProveedorId] = useState('')
    const [loading, setLoading] = useState(false)
    const [showMasivo, setShowMasivo] = useState(false)
    const [masivo, setMasivo] = useState({ tipo: 'rubro', id: '', porcentaje: '' })
    const [showNuevo, setShowNuevo] = useState(false)
    const [nuevoForm, setNuevoForm] = useState({ nombre: '', rubroId: '', proveedorId: '', costo: '', precio: '', unidad: 'unidad', permiteDecimal: false })

    useEffect(() => { fetchAll() }, [q, rubroId, proveedorId])
    useEffect(() => {
        fetch('/api/rubros').then(r => r.json()).then(setRubros).catch(() => { })
        fetch('/api/proveedores').then(r => r.json()).then(setProveedores).catch(() => { })
    }, [])

    const fetchAll = async () => {
        setLoading(true)
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        if (rubroId) params.set('rubroId', rubroId)
        if (proveedorId) params.set('proveedorId', proveedorId)
        const res = await fetch(`/api/articulos?${params}`)
        setArticulos(await res.json())
        setLoading(false)
    }

    const handleMasivo = async () => {
        if (!masivo.id || !masivo.porcentaje) return alert('Completá todos los campos')
        if (!confirm(`¿Aumentar ${masivo.porcentaje}% a todos los artículos del ${masivo.tipo} seleccionado?`)) return
        const res = await fetch('/api/articulos/masivo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(masivo) })
        const data = await res.json()
        alert(`✅ Se actualizaron ${data.updated} artículos`)
        setShowMasivo(false); fetchAll()
    }

    const handleNuevo = async () => {
        if (!nuevoForm.nombre || !nuevoForm.precio) return alert('Nombre y precio son requeridos')
        await fetch('/api/articulos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...nuevoForm, precio: parseFloat(nuevoForm.precio), costo: parseFloat(nuevoForm.costo) || 0 }) })
        setShowNuevo(false); setNuevoForm({ nombre: '', rubroId: '', proveedorId: '', costo: '', precio: '', unidad: 'unidad', permiteDecimal: false }); fetchAll()
    }

    const handleDelete = async (id: string, nombre: string) => {
        if (!confirm(`¿Eliminar "${nombre}"?`)) return
        await fetch(`/api/articulos/${id}`, { method: 'DELETE' })
        fetchAll()
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Artículos</h1>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setShowMasivo(!showMasivo)} className="btn btn-secondary">Actualización Masiva</button>
                    <button onClick={() => setShowNuevo(!showNuevo)} className="btn btn-primary">+ Nuevo Artículo</button>
                </div>
            </div>

            {showNuevo && (
                <div className="page-body" style={{ paddingBottom: 0 }}>
                    <div className="card">
                        <h2 style={{ fontWeight: 700, marginBottom: 16 }}>Nuevo Artículo</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Nombre *</label>
                                <input value={nuevoForm.nombre} onChange={e => setNuevoForm({ ...nuevoForm, nombre: e.target.value })} placeholder="Ej: Bolsas 60x90" autoFocus />
                            </div>
                            <div className="form-group">
                                <label>Rubro</label>
                                <select value={nuevoForm.rubroId} onChange={e => setNuevoForm({ ...nuevoForm, rubroId: e.target.value })}>
                                    <option value="">Sin rubro</option>
                                    {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Proveedor</label>
                                <select value={nuevoForm.proveedorId} onChange={e => setNuevoForm({ ...nuevoForm, proveedorId: e.target.value })}>
                                    <option value="">Sin proveedor</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Costo ($)</label>
                                <input type="number" step="0.01" value={nuevoForm.costo} onChange={e => setNuevoForm({ ...nuevoForm, costo: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label>Precio Venta ($) *</label>
                                <input type="number" step="0.01" value={nuevoForm.precio} onChange={e => setNuevoForm({ ...nuevoForm, precio: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label>Unidad</label>
                                <select value={nuevoForm.unidad} onChange={e => setNuevoForm({ ...nuevoForm, unidad: e.target.value })}>
                                    <option value="unidad">Unidad</option>
                                    <option value="kg">Kilogramo</option>
                                    <option value="litro">Litro</option>
                                    <option value="bulto">Bulto</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                                <label style={{ visibility: 'hidden' }}>.</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={handleNuevo} className="btn btn-primary">Guardar</button>
                                    <button onClick={() => setShowNuevo(false)} className="btn btn-secondary">Cancelar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showMasivo && (
                <div className="page-body" style={{ paddingBottom: 0 }}>
                    <div className="card" style={{ background: '#fef9c3', borderColor: '#fde047' }}>
                        <h2 style={{ fontWeight: 700, marginBottom: 12 }}>Actualización Masiva de Precios</h2>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div className="form-group">
                                <label>Filtrar por</label>
                                <select value={masivo.tipo} onChange={e => setMasivo({ ...masivo, tipo: e.target.value, id: '' })} style={{ width: 140 }}>
                                    <option value="rubro">Rubro</option>
                                    <option value="proveedor">Proveedor</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{masivo.tipo === 'rubro' ? 'Rubro' : 'Proveedor'}</label>
                                <select value={masivo.id} onChange={e => setMasivo({ ...masivo, id: e.target.value })} style={{ width: 180 }}>
                                    <option value="">Seleccionar...</option>
                                    {(masivo.tipo === 'rubro' ? rubros : proveedores).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Porcentaje de aumento (%)</label>
                                <input type="number" step="0.1" value={masivo.porcentaje} onChange={e => setMasivo({ ...masivo, porcentaje: e.target.value })} placeholder="ej: 5" style={{ width: 120 }} />
                            </div>
                            <button onClick={handleMasivo} className="btn btn-primary">Aplicar Aumento</button>
                            <button onClick={() => setShowMasivo(false)} className="btn btn-secondary">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-body">
                <div className="filters-row" style={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16 }}>
                    <input style={{ flex: 1, minWidth: 200 }} placeholder="Buscar artículo..." value={q} onChange={e => setQ(e.target.value)} />
                    <select value={rubroId} onChange={e => setRubroId(e.target.value)}>
                        <option value="">Todos los rubros</option>
                        {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                    <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
                        <option value="">Todos los proveedores</option>
                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{articulos.length} artículos</span>
                </div>

                {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }}></div></div> : (
                    <div className="table-container">
                        {articulos.length === 0 ? (
                            <div className="empty-state"><p>No hay artículos.</p><button onClick={() => setShowNuevo(true)} className="btn btn-primary">Agregar Artículo</button></div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Artículo</th>
                                        <th>Rubro</th>
                                        <th>Proveedor</th>
                                        <th>Costo</th>
                                        <th>Precio</th>
                                        <th>Unidad</th>
                                        <th>Últ. Actualización</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {articulos.map(a => {
                                        const dias = daysSince(a.fechaPrecio)
                                        return (
                                            <tr key={a.id}>
                                                <td><strong>{a.nombre}</strong></td>
                                                <td>{a.rubro?.nombre ? <span className="badge badge-blue">{a.rubro.nombre}</span> : '-'}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>{a.proveedor?.nombre || '-'}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>{a.costo ? formatCurrency(Number(a.costo)) : '-'}</td>
                                                <td><strong style={{ color: 'var(--primary)' }}>{formatCurrency(Number(a.precio))}</strong></td>
                                                <td><span className="badge badge-gray">{a.unidad}</span></td>
                                                <td>
                                                    <span style={{ color: dias > 30 ? 'var(--red)' : 'var(--text-muted)', fontSize: 13, fontWeight: dias > 30 ? 700 : 400 }}>
                                                        {formatDate(a.fechaPrecio)} {dias > 30 && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth={2} style={{ verticalAlign: 'middle', marginLeft: 4 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button onClick={() => handleDelete(a.id, a.nombre)} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
