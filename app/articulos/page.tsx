'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, daysSince, formatDate } from '@/lib/utils'
import { ExportArticulosPDF, PrintButton } from '@/components/ExportPDF'
import { ExportArticulosCSV } from '@/components/ExportCSV'
import { ArticuloPrecioEditor } from '@/components/ArticuloPrecioEditor'
import { ArticuloNombreEditor } from '@/components/ArticuloNombreEditor'
import { ArticuloProveedorEditor } from '@/components/ArticuloProveedorEditor'

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

    // Quick Add Modals inline
    const [quickAdd, setQuickAdd] = useState<{ tipo: 'rubro' | 'proveedor' | null, nombre: '' }>({ tipo: null, nombre: '' })
    const [page, setPage] = useState(1)
    const PER_PAGE = 20

    useEffect(() => { setPage(1); fetchAll() }, [q, rubroId, proveedorId])
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
        alert(`Se actualizaron ${data.updated} artículos`)
        setShowMasivo(false); fetchAll()
    }

    const handleNuevo = async () => {
        if (!nuevoForm.nombre.trim()) return alert('El nombre del artículo es requerido')

        try {
            const res = await fetch('/api/articulos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...nuevoForm,
                    precio: parseFloat(nuevoForm.precio) || 0,
                    costo: parseFloat(nuevoForm.costo) || 0
                })
            })

            if (!res.ok) {
                let message = 'No se pudo guardar el artículo.'
                try {
                    const data = await res.json()
                    if (data?.error) {
                        message += `\n\nDetalle: ${data.error}`
                    }
                } catch { }
                alert(message)
                return
            }

            // Limpiamos filtros para asegurarnos de ver el nuevo artículo
            setQ('')
            setRubroId('')
            setProveedorId('')

            setShowNuevo(false);
            setNuevoForm({ nombre: '', rubroId: '', proveedorId: '', costo: '', precio: '', unidad: 'unidad', permiteDecimal: false });
            fetchAll()
        } catch {
            alert('Ocurrió un error al guardar el artículo. Verificá la conexión e intentá nuevamente.')
        }
    }

    const handleQuickAdd = async () => {
        if (!quickAdd.nombre) return
        const endpoint = quickAdd.tipo === 'rubro' ? '/api/rubros' : '/api/proveedores'
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: quickAdd.nombre })
        })
        const data = await res.json()

        if (quickAdd.tipo === 'rubro') {
            setRubros([...rubros, data])
            setNuevoForm({ ...nuevoForm, rubroId: data.id })
        } else {
            setProveedores([...proveedores, data])
            setNuevoForm({ ...nuevoForm, proveedorId: data.id })
        }
        setQuickAdd({ tipo: null, nombre: '' })
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
                    <ExportArticulosPDF articulos={articulos.map(a => ({ nombre: a.nombre, proveedor: a.proveedor?.nombre || '', precio: Number(a.precio), unidad: a.unidad }))} />
                    <ExportArticulosCSV articulos={articulos.map(a => ({
                        nombre: a.nombre,
                        proveedor: a.proveedor?.nombre || '',
                        rubro: a.rubro?.nombre || '',
                        unidad: a.unidad,
                        precio: Number(a.precio),
                        fecha: a.fechaPrecio,
                    }))} />
                    <PrintButton />
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
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <select style={{ flex: 1 }} value={nuevoForm.rubroId} onChange={e => setNuevoForm({ ...nuevoForm, rubroId: e.target.value })}>
                                        <option value="">Sin rubro</option>
                                        {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                    </select>
                                    <button onClick={() => setQuickAdd({ tipo: 'rubro', nombre: '' })} className="btn btn-secondary" style={{ padding: '0 10px' }} title="Agregar nuevo rubro">+</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Proveedor</label>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <select style={{ flex: 1 }} value={nuevoForm.proveedorId} onChange={e => setNuevoForm({ ...nuevoForm, proveedorId: e.target.value })}>
                                        <option value="">Sin proveedor</option>
                                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                    <button onClick={() => setQuickAdd({ tipo: 'proveedor', nombre: '' })} className="btn btn-secondary" style={{ padding: '0 10px' }} title="Agregar nuevo proveedor">+</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Costo de Compra ($)</label>
                                <input type="number" step="0.01" value={nuevoForm.costo} onChange={e => setNuevoForm({ ...nuevoForm, costo: e.target.value })} placeholder="Ej: 1500" />
                            </div>
                            <div className="form-group">
                                <label>Precio de Venta ($)</label>
                                <input type="number" step="0.01" value={nuevoForm.precio} onChange={e => setNuevoForm({ ...nuevoForm, precio: e.target.value })} placeholder="(Opcional)" />
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dejalo vacío si vas a manejar listas de precios (Lista 1, 2 o 3) a partir del costo.</span>
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

            {quickAdd.tipo && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                    <div className="card" style={{ width: '100%', maxWidth: 400 }}>
                        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Nuevo {quickAdd.tipo === 'rubro' ? 'Rubro' : 'Proveedor'}</h3>
                        <div className="form-group">
                            <label>Nombre</label>
                            <input value={quickAdd.nombre} onChange={e => setQuickAdd({ ...quickAdd, nombre: e.target.value as any })} autoFocus onKeyDown={e => e.key === 'Enter' && handleQuickAdd()} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                            <button onClick={handleQuickAdd} className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
                            <button onClick={() => setQuickAdd({ tipo: null, nombre: '' })} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
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
                                        <th>Proveedor</th>
                                        <th>Precio venta</th>
                                        <th>Unidad</th>
                                        <th>Últ. Actualización</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {articulos.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(a => {
                                        const dias = daysSince(a.fechaPrecio)
                                        return (
                                            <tr key={a.id}>
                                                <td><ArticuloNombreEditor articuloId={a.id} nombre={a.nombre} onUpdate={fetchAll} /></td>
                                                <td>
                                                    <ArticuloProveedorEditor
                                                        articuloId={a.id}
                                                        proveedores={proveedores}
                                                        proveedorId={a.proveedor?.id}
                                                        proveedorNombre={a.proveedor?.nombre}
                                                        onUpdate={fetchAll}
                                                    />
                                                </td>
                                                <td>
                                                    <ArticuloPrecioEditor articuloId={a.id} precio={Number(a.precio)} onUpdate={fetchAll} />
                                                </td>
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
                        {/* Pagination */}
                        {articulos.length > PER_PAGE && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                    Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, articulos.length)} de {articulos.length}
                                </span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6" /></svg>
                                        Anterior
                                    </button>
                                    <span style={{ padding: '4px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{page} / {Math.ceil(articulos.length / PER_PAGE)}</span>
                                    <button onClick={() => setPage(p => Math.min(Math.ceil(articulos.length / PER_PAGE), p + 1))} disabled={page >= Math.ceil(articulos.length / PER_PAGE)} className="btn btn-secondary btn-sm">
                                        Siguiente
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
