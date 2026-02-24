'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, getSaldoStatus } from '@/lib/utils'

interface Articulo { id: string; nombre: string; precio: number; unidad: string; permiteDecimal: boolean }
interface Cliente { id: string; nombre: string; direccion?: string; telefono?: string; saldo: number }
interface Item { articuloId: string; nombre: string; cantidad: number; precioUnitario: number }
interface Frecuente { articulo: Articulo; vecesComprado: number }

export default function NuevoPedidoPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialClienteId = searchParams.get('clienteId')

    const [clienteQuery, setClienteQuery] = useState('')
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
    const [showClienteDropdown, setShowClienteDropdown] = useState(false)

    const [articuloQuery, setArticuloQuery] = useState('')
    const [articulos, setArticulos] = useState<Articulo[]>([])
    const [showArticuloDropdown, setShowArticuloDropdown] = useState(false)

    const [items, setItems] = useState<Item[]>([])
    const [frecuentes, setFrecuentes] = useState<Frecuente[]>([])
    const [estado, setEstado] = useState('pendiente')
    const [notas, setNotas] = useState('')
    const [loading, setLoading] = useState(false)

    // Load initial client if provided
    useEffect(() => {
        if (initialClienteId) {
            fetch(`/api/clientes/${initialClienteId}`).then(r => r.json()).then(c => {
                setClienteSeleccionado(c)
                loadFrecuentes(c.id)
            })
        }
    }, [initialClienteId])

    const searchClientes = useCallback(async (q: string) => {
        if (!q) return setClientes([])
        const res = await fetch(`/api/clientes?q=${q}`)
        setClientes(await res.json())
        setShowClienteDropdown(true)
    }, [])

    const searchArticulos = useCallback(async (q: string) => {
        if (!q) return setArticulos([])
        const res = await fetch(`/api/articulos?q=${q}`)
        setArticulos(await res.json())
        setShowArticuloDropdown(true)
    }, [])

    const loadFrecuentes = async (clienteId: string) => {
        const res = await fetch(`/api/clientes/${clienteId}/frecuentes`)
        setFrecuentes(await res.json())
    }

    const selectCliente = (c: Cliente) => {
        setClienteSeleccionado(c)
        setClienteQuery(c.nombre)
        setShowClienteDropdown(false)
        loadFrecuentes(c.id)
    }

    const addItem = (articulo: Articulo) => {
        const existing = items.find(i => i.articuloId === articulo.id)
        if (existing) {
            setItems(items.map(i => i.articuloId === articulo.id ? { ...i, cantidad: i.cantidad + 1 } : i))
        } else {
            setItems([...items, { articuloId: articulo.id, nombre: articulo.nombre, cantidad: 1, precioUnitario: Number(articulo.precio) }])
        }
        setArticuloQuery('')
        setArticulos([])
        setShowArticuloDropdown(false)
    }

    const updateCantidad = (articuloId: string, rawValue: string) => {
        const value = parseFloat(rawValue) || 0
        setItems(items.map(i => i.articuloId === articuloId ? { ...i, cantidad: value } : i))
    }

    const removeItem = (articuloId: string) => {
        setItems(items.filter(i => i.articuloId !== articuloId))
    }

    const total = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clienteSeleccionado) return alert('Seleccioná un cliente')
        if (items.length === 0) return alert('Agregá al menos un artículo')
        setLoading(true)
        const res = await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clienteId: clienteSeleccionado.id, items, notas, estado }),
        })
        const data = await res.json()
        setLoading(false)
        if (res.ok) router.push(`/pedidos/${data.id}`)
    }

    const saldoInfo = clienteSeleccionado ? getSaldoStatus(Number(clienteSeleccionado.saldo)) : null

    return (
        <>
            <div className="page-header">
                <div>
                    <Link href="/pedidos" style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none' }}>← Pedidos</Link>
                    <h1 className="page-title" style={{ marginTop: 4 }}>Nuevo Pedido</h1>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <select value={estado} onChange={e => setEstado(e.target.value)} style={{ width: 'auto' }}>
                        <option value="pendiente">Pendiente de Armado</option>
                        <option value="armado">Armado</option>
                    </select>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Guardando...' : '💾 Guardar Pedido'}
                    </button>
                </div>
            </div>

            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
                    {/* Columna principal */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Selector de cliente */}
                        <div className="card">
                            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Cliente</h2>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    value={clienteSeleccionado ? clienteSeleccionado.nombre : clienteQuery}
                                    onChange={e => { setClienteQuery(e.target.value); setClienteSeleccionado(null); searchClientes(e.target.value) }}
                                    onFocus={() => clienteQuery && setShowClienteDropdown(true)}
                                    style={{ fontSize: 18, fontWeight: 600 }}
                                />
                                {showClienteDropdown && clientes.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 10, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                        {clientes.map(c => (
                                            <div key={c.id} onClick={() => selectCliente(c)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontWeight: 500 }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                                                {c.nombre} {c.saldo > 0 && <span style={{ color: 'var(--red)', fontSize: 12 }}>• Debe {formatCurrency(Number(c.saldo))}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {saldoInfo && (
                                <div className={`alert alert-${saldoInfo.isDebt ? 'red' : 'green'}`} style={{ marginTop: 10 }}>
                                    {saldoInfo.isDebt ? '⚠️' : '✅'} Saldo anterior: <strong>{saldoInfo.label}</strong>
                                    {clienteSeleccionado?.direccion && <span style={{ marginLeft: 16 }}>📍 {clienteSeleccionado.direccion}</span>}
                                </div>
                            )}
                        </div>

                        {/* Buscador de artículos */}
                        <div className="card">
                            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Agregar Artículos</h2>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Buscar artículo para agregar..."
                                    value={articuloQuery}
                                    onChange={e => { setArticuloQuery(e.target.value); searchArticulos(e.target.value) }}
                                    onFocus={() => articuloQuery && setShowArticuloDropdown(true)}
                                />
                                {showArticuloDropdown && articulos.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 10, maxHeight: 240, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                        {articulos.map(a => (
                                            <div key={a.id} onClick={() => addItem(a)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                                                <span>{a.nombre}</span>
                                                <strong style={{ color: 'var(--primary-light)' }}>{formatCurrency(Number(a.precio))}</strong>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabla de ítems */}
                        {items.length > 0 && (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Artículo</th>
                                            <th style={{ width: 120 }}>Cantidad</th>
                                            <th>Precio Unit.</th>
                                            <th>Subtotal</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(item => (
                                            <tr key={item.articuloId}>
                                                <td><strong>{item.nombre}</strong></td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0"
                                                        value={item.cantidad}
                                                        onChange={e => updateCantidad(item.articuloId, e.target.value)}
                                                        style={{ width: 100, padding: '6px 10px', fontWeight: 700 }}
                                                    />
                                                </td>
                                                <td>{formatCurrency(item.precioUnitario)}</td>
                                                <td><strong>{formatCurrency(item.cantidad * item.precioUnitario)}</strong></td>
                                                <td>
                                                    <button onClick={() => removeItem(item.articuloId)} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}>✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, fontSize: 16 }}>TOTAL:</td>
                                            <td><strong style={{ fontSize: 20, color: 'var(--primary)' }}>{formatCurrency(total)}</strong></td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {/* Notas */}
                        <div className="card">
                            <div className="form-group">
                                <label>Notas (opcional)</label>
                                <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones del pedido..." />
                            </div>
                        </div>
                    </div>

                    {/* Panel frecuentes */}
                    <div style={{ position: 'sticky', top: 20 }}>
                        <div className="table-container">
                            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, background: '#fef9c3' }}>
                                ⭐ Frecuentes del Cliente
                            </div>
                            {frecuentes.length === 0 ? (
                                <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>
                                    Seleccioná un cliente para ver sus artículos frecuentes
                                </div>
                            ) : (
                                <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                                    {frecuentes.map(({ articulo, vecesComprado }) => (
                                        <div key={articulo.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{articulo.nombre}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatCurrency(Number(articulo.precio))} • {vecesComprado}x</div>
                                            </div>
                                            <button onClick={() => addItem(articulo)} className="btn btn-primary btn-sm">+</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
