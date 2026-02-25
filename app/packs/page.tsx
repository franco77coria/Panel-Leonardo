'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import jsPDF from 'jspdf'
import { ExportAllPacksPDF, PrintButton } from '@/components/ExportPDF'

interface Rubro { id: string; nombre: string }
interface Articulo { id: string; nombre: string; precio: number; unidad: string }
interface PackItem { id: string; articuloId: string; articulo: Articulo; cantidadSugerida: number }
interface Pack { id: string; nombre: string; descripcion?: string; rubro?: Rubro; items: PackItem[] }

export default function PacksPage() {
    const [packs, setPacks] = useState<Pack[]>([])
    const [rubros, setRubros] = useState<Rubro[]>([])
    const [articulos, setArticulos] = useState<Articulo[]>([])
    const [showNuevo, setShowNuevo] = useState(false)
    const [packSeleccionado, setPackSeleccionado] = useState<Pack | null>(null)
    const [nuevoForm, setNuevoForm] = useState({ nombre: '', descripcion: '', rubroId: '' })
    const [itemsNuevo, setItemsNuevo] = useState<{ articuloId: string; cantidadSugerida: number }[]>([])

    // Edit state
    const [editingPack, setEditingPack] = useState(false)
    const [editForm, setEditForm] = useState({ id: '', nombre: '', descripcion: '', rubroId: '' })
    const [itemsEdit, setItemsEdit] = useState<{ articuloId: string; cantidadSugerida: number }[]>([])

    useEffect(() => {
        fetchPacks()
        fetch('/api/rubros').then(r => r.json()).then(setRubros).catch(() => { })
        fetch('/api/articulos').then(r => r.json()).then(setArticulos).catch(() => { })
    }, [])

    const fetchPacks = () => fetch('/api/packs').then(r => r.json()).then(setPacks).catch(() => { })

    const addItemAlPack = (articuloId: string) => {
        if (itemsNuevo.find(i => i.articuloId === articuloId)) return
        setItemsNuevo([...itemsNuevo, { articuloId, cantidadSugerida: 1 }])
    }

    const handleCrearPack = async () => {
        if (!nuevoForm.nombre) return alert('Ingresá un nombre')
        await fetch('/api/packs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...nuevoForm, items: itemsNuevo }),
        })
        setShowNuevo(false)
        setNuevoForm({ nombre: '', descripcion: '', rubroId: '' })
        setItemsNuevo([])
        fetchPacks()
    }

    const handleEliminar = async (id: string, nombre: string) => {
        if (!confirm(`¿Eliminar el pack "${nombre}"?`)) return
        await fetch(`/api/packs/${id}`, { method: 'DELETE' })
        fetchPacks()
        if (packSeleccionado?.id === id) setPackSeleccionado(null)
    }

    const startEditing = (pack: Pack) => {
        setEditForm({ id: pack.id, nombre: pack.nombre, descripcion: pack.descripcion || '', rubroId: pack.rubro?.id || '' })
        setItemsEdit(pack.items.map(i => ({ articuloId: i.articuloId, cantidadSugerida: i.cantidadSugerida })))
        setEditingPack(true)
    }

    const addItemEdit = (articuloId: string) => {
        if (itemsEdit.find(i => i.articuloId === articuloId)) return
        setItemsEdit([...itemsEdit, { articuloId, cantidadSugerida: 1 }])
    }

    const handleGuardarEdicion = async () => {
        if (!editForm.nombre) return alert('Ingresá un nombre')
        const res = await fetch(`/api/packs/${editForm.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...editForm, items: itemsEdit }),
        })
        const updated = await res.json()
        setEditingPack(false)
        setPackSeleccionado(updated)
        fetchPacks()
    }

    const imprimirPack = (pack: Pack) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        let y = 20

        doc.setFontSize(24); doc.setFont('helvetica', 'bold')
        doc.text(pack.nombre, 105, y, { align: 'center' }); y += 8

        if (pack.descripcion) {
            doc.setFontSize(12); doc.setFont('helvetica', 'normal')
            doc.text(pack.descripcion, 105, y, { align: 'center' }); y += 6
        }
        if (pack.rubro) {
            doc.setFontSize(11)
            doc.text(`Rubro: ${pack.rubro.nombre}`, 105, y, { align: 'center' }); y += 6
        }

        y += 4; doc.line(20, y, 190, y); y += 8

        doc.setFontSize(13); doc.setFont('helvetica', 'bold')
        doc.text('Artículo', 20, y)
        doc.text('Cant. Sugerida', 125, y)
        doc.text('Precio Unit.', 160, y)
        y += 5; doc.line(20, y, 190, y); y += 7

        doc.setFont('helvetica', 'normal')
        let totalPack = 0
        for (const item of pack.items) {
            doc.text(item.articulo.nombre.substring(0, 40), 20, y)
            doc.text(`${item.cantidadSugerida} ${item.articulo.unidad}`, 125, y)

            const precio = Number(item.articulo.precio)
            const sub = item.cantidadSugerida * precio
            totalPack += sub
            doc.text(formatCurrency(sub), 160, y)

            y += 8
            if (y > 270) { doc.addPage(); y = 20 }
        }

        y += 2; doc.line(20, y, 190, y); y += 8

        doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
        doc.text('TOTAL REFERENCIAL:', 100, y)
        doc.text(formatCurrency(totalPack), 160, y)

        window.open(doc.output('bloburl'), '_blank')
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Packs</h1>
                <ExportAllPacksPDF packs={packs.map(p => ({ nombre: p.nombre, descripcion: p.descripcion || undefined, rubro: p.rubro?.nombre || undefined, items: p.items.map(i => ({ nombre: i.articulo.nombre, cantidad: i.cantidadSugerida, unidad: i.articulo.unidad, precio: Number(i.articulo.precio) })) }))} />
                <PrintButton />
                <button onClick={() => setShowNuevo(!showNuevo)} className="btn btn-primary">+ Nuevo Pack</button>
            </div>

            {showNuevo && (
                <div className="page-body" style={{ paddingBottom: 0 }}>
                    <div className="card">
                        <h2 style={{ fontWeight: 700, marginBottom: 16 }}>Nuevo Pack</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Nombre del Pack *</label>
                                <input value={nuevoForm.nombre} onChange={e => setNuevoForm({ ...nuevoForm, nombre: e.target.value })} placeholder="Ej: Pack Carnicería" autoFocus />
                            </div>
                            <div className="form-group">
                                <label>Descripción</label>
                                <input value={nuevoForm.descripcion} onChange={e => setNuevoForm({ ...nuevoForm, descripcion: e.target.value })} placeholder="Opcional" />
                            </div>
                            <div className="form-group">
                                <label>Rubro</label>
                                <select value={nuevoForm.rubroId} onChange={e => setNuevoForm({ ...nuevoForm, rubroId: e.target.value })}>
                                    <option value="">Sin rubro</option>
                                    {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block' }}>Agregar artículos al pack:</label>
                            <select onChange={e => e.target.value && addItemAlPack(e.target.value)} value="" style={{ marginBottom: 10 }}>
                                <option value="">Seleccionar artículo...</option>
                                {articulos.filter(a => !itemsNuevo.find(i => i.articuloId === a.id)).map(a => (
                                    <option key={a.id} value={a.id}>{a.nombre} – {formatCurrency(Number(a.precio))}</option>
                                ))}
                            </select>
                            {itemsNuevo.length > 0 && (
                                <div className="table-container">
                                    <table>
                                        <thead><tr><th>Artículo</th><th>Cantidad Sugerida</th><th></th></tr></thead>
                                        <tbody>
                                            {itemsNuevo.map(item => {
                                                const art = articulos.find(a => a.id === item.articuloId)
                                                return (
                                                    <tr key={item.articuloId}>
                                                        <td><strong>{art?.nombre}</strong></td>
                                                        <td>
                                                            <input type="number" step="0.001" min="0" value={item.cantidadSugerida}
                                                                onChange={e => setItemsNuevo(itemsNuevo.map(i => i.articuloId === item.articuloId ? { ...i, cantidadSugerida: parseFloat(e.target.value) || 1 } : i))}
                                                                style={{ width: 100, padding: '6px 10px' }} />
                                                        </td>
                                                        <td><button onClick={() => setItemsNuevo(itemsNuevo.filter(i => i.articuloId !== item.articuloId))} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleCrearPack} className="btn btn-primary">Crear Pack</button>
                            <button onClick={() => setShowNuevo(false)} className="btn btn-secondary">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: packSeleccionado ? '1fr 1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                    {/* Cards de packs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, alignContent: 'start' }}>
                        {packs.length === 0 ? (
                            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                                <p>No hay packs creados.</p>
                                <button onClick={() => setShowNuevo(true)} className="btn btn-primary">Crear Pack</button>
                            </div>
                        ) : packs.map(pack => (
                            <div key={pack.id} className="card" style={{ cursor: 'pointer', border: packSeleccionado?.id === pack.id ? '2px solid var(--primary-light)' : '1px solid var(--border)' }}
                                onClick={() => { setPackSeleccionado(packSeleccionado?.id === pack.id ? null : pack); setEditingPack(false) }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 18 }}>{pack.nombre}</div>
                                        {pack.rubro && <span className="badge badge-blue" style={{ marginTop: 4 }}>{pack.rubro.nombre}</span>}
                                        {pack.descripcion && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{pack.descripcion}</p>}
                                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{pack.items.length} artículo{pack.items.length !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 14 }} onClick={e => e.stopPropagation()}>
                                    <button onClick={() => imprimirPack(pack)} className="btn btn-secondary btn-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg> PDF</button>
                                    <button onClick={() => handleEliminar(pack.id, pack.nombre)} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detalle del pack seleccionado */}
                    {packSeleccionado && (
                        <div>
                            <div className="table-container">
                                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong>{editingPack ? 'Editando Pack' : packSeleccionado.nombre}</strong>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {!editingPack && <button onClick={() => startEditing(packSeleccionado)} className="btn btn-secondary btn-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> Editar</button>}
                                        {!editingPack && <button onClick={() => imprimirPack(packSeleccionado)} className="btn btn-primary btn-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> PDF</button>}
                                        <button onClick={() => setPackSeleccionado(null)} className="btn btn-ghost btn-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                                    </div>
                                </div>

                                {editingPack ? (
                                    <div style={{ padding: 16 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 16 }}>
                                            <input className="form-input" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} placeholder="Nombre del Pack" />
                                            <input className="form-input" value={editForm.descripcion} onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })} placeholder="Descripción (opcional)" />
                                            <select className="form-select" value={editForm.rubroId} onChange={e => setEditForm({ ...editForm, rubroId: e.target.value })}>
                                                <option value="">Sin rubro</option>
                                                {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                            </select>
                                        </div>

                                        <div style={{ marginBottom: 16 }}>
                                            <select className="form-select" style={{ marginBottom: 10 }} onChange={e => e.target.value && addItemEdit(e.target.value)} value="">
                                                <option value="">Agregar artículo...</option>
                                                {articulos.filter(a => !itemsEdit.find(i => i.articuloId === a.id)).map(a => (
                                                    <option key={a.id} value={a.id}>{a.nombre}</option>
                                                ))}
                                            </select>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {itemsEdit.map(item => {
                                                    const art = articulos.find(a => a.id === item.articuloId)
                                                    return (
                                                        <div key={item.articuloId} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', padding: '6px 10px', borderRadius: 6 }}>
                                                            <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{art?.nombre}</div>
                                                            <input type="number" step="0.001" min="0" value={item.cantidadSugerida} onChange={e => setItemsEdit(itemsEdit.map(i => i.articuloId === item.articuloId ? { ...i, cantidadSugerida: parseFloat(e.target.value) || 0 } : i))} style={{ width: 70, padding: 4 }} />
                                                            <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 30 }}>{art?.unidad}</span>
                                                            <button onClick={() => setItemsEdit(itemsEdit.filter(i => i.articuloId !== item.articuloId))} className="btn btn-ghost btn-sm" style={{ padding: 4, color: 'var(--red)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={handleGuardarEdicion} className="btn btn-primary" style={{ flex: 1 }}>Guardar Cambios</button>
                                            <button onClick={() => setEditingPack(false)} className="btn btn-secondary">Cancelar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <table>
                                        <thead><tr><th>Artículo</th><th>Cant. Sugerida</th><th>Subtotal Ref.</th></tr></thead>
                                        <tbody>
                                            {packSeleccionado.items.map(item => {
                                                const subtotal = item.cantidadSugerida * Number(item.articulo.precio)
                                                return (
                                                    <tr key={item.id}>
                                                        <td><strong>{item.articulo.nombre}</strong></td>
                                                        <td>{item.cantidadSugerida} {item.articulo.unidad}</td>
                                                        <td>{formatCurrency(subtotal)}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL REFERENCIAL</td>
                                                <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                                    {formatCurrency(packSeleccionado.items.reduce((sum, item) => sum + (item.cantidadSugerida * Number(item.articulo.precio)), 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
