'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, getSaldoStatus } from '@/lib/utils'

interface Articulo { id: string; nombre: string; costo: number; precio: number; unidad: string; permiteDecimal: boolean }
interface Cliente { id: string; nombre: string; direccion?: string; telefono?: string; saldo: number }
interface Item { articuloId: string; nombre: string; cantidad: number; precioUnitario: number; precioBase: number; estadoItem?: string; descuento?: number }
interface Frecuente { articulo: Articulo; vecesComprado: number }

export default function NuevoPedidoPageWrapper() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Cargando...</div>}>
            <NuevoPedidoPage />
        </Suspense>
    )
}

function NuevoPedidoPage() {
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
    const [listaPrecio, setListaPrecio] = useState<number>(1.20) // Lista 1 = 20%
    const [loading, setLoading] = useState(false)

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

    const getPrecioBase = (articulo: Articulo) => {
        return Number(articulo.costo) > 0 ? Number(articulo.costo) : Number(articulo.precio)
    }

    const addItem = (articulo: Articulo) => {
        const precioBase = getPrecioBase(articulo)
        const precioAplicado = Number((precioBase * listaPrecio).toFixed(2))
        const existing = items.find(i => i.articuloId === articulo.id)
        if (existing) {
            setItems(items.map(i => i.articuloId === articulo.id ? { ...i, cantidad: i.cantidad + 1 } : i))
        } else {
            setItems([...items, { articuloId: articulo.id, nombre: articulo.nombre, cantidad: 1, precioUnitario: precioAplicado, precioBase, estadoItem: '', descuento: 0 }])
        }
        setArticuloQuery('')
        setArticulos([])
        setShowArticuloDropdown(false)
    }

    const handleListaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setListaPrecio(Number(e.target.value))
    }

    const updateCantidad = (articuloId: string, rawValue: string) => {
        const value = parseFloat(rawValue) || 0
        setItems(items.map(i => i.articuloId === articuloId ? { ...i, cantidad: value } : i))
    }

    const updatePrecio = (articuloId: string, rawValue: string) => {
        const value = parseFloat(rawValue) || 0
        setItems(items.map(i => i.articuloId === articuloId ? { ...i, precioUnitario: value } : i))
    }

    const updateEstadoItem = (articuloId: string, estado: string) => {
        setItems(items.map(i => {
            if (i.articuloId === articuloId) {
                // Automáticamente convertir cantidad a negativo si es devolución
                let nuevaCant = i.cantidad
                if (estado === 'Devolución' && nuevaCant > 0) nuevaCant = -nuevaCant
                if (estado !== 'Devolución' && nuevaCant < 0) nuevaCant = Math.abs(nuevaCant)
                return { ...i, estadoItem: estado, cantidad: nuevaCant }
            }
            return i
        }))
    }

    const updateDescuento = (articuloId: string, rawValue: string) => {
        const value = parseFloat(rawValue) || 0
        setItems(items.map(i => i.articuloId === articuloId ? { ...i, descuento: value } : i))
    }

    const removeItem = (articuloId: string) => {
        setItems(items.filter(i => i.articuloId !== articuloId))
    }

    const total = items.reduce((s, i) => {
        const desc = i.descuento || 0
        return s + i.cantidad * i.precioUnitario * (1 - desc / 100)
    }, 0)

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
                    <div className="breadcrumb">
                        <Link href="/pedidos">Pedidos</Link>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
                        <span>Nuevo</span>
                    </div>
                    <h1 className="page-title">Nuevo Pedido</h1>
                </div>
                <div className="page-actions">
                    <select value={estado} onChange={e => setEstado(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
                        <option value="pendiente">Pendiente de Armado</option>
                        <option value="armado">Armado</option>
                    </select>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg>
                        {loading ? 'Guardando...' : 'Guardar Pedido'}
                    </button>
                </div>
            </div>

            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Client selector */}
                        <div className="card">
                            <div className="card-header">Cliente</div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    value={clienteSeleccionado ? clienteSeleccionado.nombre : clienteQuery}
                                    onChange={e => { setClienteQuery(e.target.value); setClienteSeleccionado(null); searchClientes(e.target.value) }}
                                    onFocus={() => clienteQuery && setShowClienteDropdown(true)}
                                    style={{ fontSize: 16, fontWeight: 600 }}
                                />
                                {showClienteDropdown && clientes.length > 0 && (
                                    <div className="dropdown">
                                        {clientes.map(c => (
                                            <div key={c.id} className="dropdown-item" onClick={() => selectCliente(c)}>
                                                <span style={{ fontWeight: 500 }}>{c.nombre}</span>
                                                {Number(c.saldo) > 0 && <span className="badge badge-red">{formatCurrency(Number(c.saldo))}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {saldoInfo && (
                                <div className={`alert alert-${saldoInfo.isDebt ? 'red' : 'green'}`} style={{ marginTop: 10 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                    Saldo anterior: <strong style={{ marginLeft: 4 }}>{saldoInfo.label}</strong>
                                    {clienteSeleccionado?.direccion && <span style={{ marginLeft: 16, opacity: 0.8 }}>{clienteSeleccionado.direccion}</span>}
                                </div>
                            )}
                        </div>

                        {/* List Selector */}
                        <div className="card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                    Lista de Venta
                                </div>
                                <select value={listaPrecio} onChange={handleListaChange} style={{ flex: 1, padding: '8px 12px', fontSize: 15, fontWeight: 600 }}>
                                    <option value={1.20}>Lista 1 (+20% sobre costo)</option>
                                    <option value={1.25}>Lista 2 (+25% sobre costo)</option>
                                    <option value={1.35}>Lista 3 (+35% sobre costo)</option>
                                </select>
                            </div>
                        </div>

                        {/* Article search */}
                        <div className="card">
                            <div className="card-header">Agregar Artículos</div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Buscar artículo para agregar..."
                                    value={articuloQuery}
                                    onChange={e => { setArticuloQuery(e.target.value); searchArticulos(e.target.value) }}
                                    onFocus={() => articuloQuery && setShowArticuloDropdown(true)}
                                />
                                {showArticuloDropdown && articulos.length > 0 && (
                                    <div className="dropdown">
                                        {articulos.map(a => (
                                            <div key={a.id} className="dropdown-item" onClick={() => addItem(a)}>
                                                <span>{a.nombre}</span>
                                                <strong style={{ color: 'var(--primary-light)' }}>{formatCurrency(Number((getPrecioBase(a) * listaPrecio).toFixed(2)))}</strong>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items table */}
                        {items.length > 0 && (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Artículo</th>
                                            <th style={{ width: 80 }}>Cant.</th>
                                            <th className="hide-mobile">Precio ($)</th>
                                            <th className="hide-mobile" style={{ width: 60 }}>% Dto</th>
                                            <th className="hide-mobile" style={{ width: 130 }}>Estado</th>
                                            <th>Subtotal</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(item => {
                                            const subtotalNumber = item.cantidad * item.precioUnitario * (1 - (item.descuento || 0) / 100)
                                            return (
                                                <tr key={item.articuloId}>
                                                    <td>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.nombre}</div>
                                                        {/* Mostrar en mobile los campos extra */}
                                                        <div className="show-mobile-flex" style={{ display: 'none', gap: 6, marginTop: 4 }}>
                                                            <select value={item.estadoItem || ''} onChange={e => updateEstadoItem(item.articuloId, e.target.value)} style={{ padding: '2px 4px', fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4 }}>
                                                                <option value="">—</option>
                                                                <option value="Entregado">Entregado</option>
                                                                <option value="Cambio">Cambio</option>
                                                                <option value="Devolución">Devolución</option>
                                                            </select>
                                                            {item.precioUnitario > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>M: ${item.precioUnitario}</span>}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={item.cantidad}
                                                            onChange={e => updateCantidad(item.articuloId, e.target.value)}
                                                            style={{ width: 70, padding: '5px 8px', fontWeight: 700, textAlign: 'center', color: item.cantidad < 0 ? 'var(--red)' : 'inherit' }}
                                                            title="Usar número negativo para devoluciones"
                                                        />
                                                    </td>
                                                    <td className="hide-mobile">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.precioUnitario}
                                                            onChange={e => updatePrecio(item.articuloId, e.target.value)}
                                                            style={{ width: 80, padding: '5px 8px', fontWeight: 600, border: '1px solid var(--border)' }}
                                                        />
                                                    </td>
                                                    <td className="hide-mobile">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={item.descuento || ''}
                                                            onChange={e => updateDescuento(item.articuloId, e.target.value)}
                                                            placeholder="0"
                                                            style={{ width: 50, padding: '5px', textAlign: 'center', border: '1px solid var(--border)' }}
                                                        />
                                                    </td>
                                                    <td className="hide-mobile">
                                                        <select value={item.estadoItem || ''} onChange={e => updateEstadoItem(item.articuloId, e.target.value)} style={{ width: '100%', padding: '4px', fontSize: 12 }}>
                                                            <option value="">—</option>
                                                            <option value="Entregado">Entregado</option>
                                                            <option value="Cambio">Cambio</option>
                                                            <option value="Devolución">Devolución</option>
                                                        </select>
                                                    </td>
                                                    <td><strong style={{ color: subtotalNumber < 0 ? 'var(--red)' : 'inherit' }}>{formatCurrency(subtotalNumber)}</strong></td>
                                                    <td>
                                                        <button onClick={() => removeItem(item.articuloId)} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={5} className="hide-mobile" style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                                            <td colSpan={2} className="show-mobile-table-cell" style={{ display: 'none', textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                                            <td><strong style={{ fontSize: 18, color: 'var(--primary)' }}>{formatCurrency(total)}</strong></td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        <div className="card">
                            <div className="form-group">
                                <label>Notas (opcional)</label>
                                <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones del pedido..." />
                            </div>
                        </div>
                    </div>

                    {/* Frequent items panel */}
                    <div style={{ position: 'sticky', top: 20 }}>
                        <div className="table-container">
                            <div className="table-header" style={{ background: 'var(--yellow-bg)' }}>
                                <span className="table-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--yellow)" stroke="var(--yellow)" strokeWidth={1}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                    Frecuentes
                                </span>
                            </div>
                            {frecuentes.length === 0 ? (
                                <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                                    Seleccioná un cliente para ver sus artículos frecuentes
                                </div>
                            ) : (
                                <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                                    {frecuentes.map(({ articulo, vecesComprado }) => (
                                        <div key={articulo.id} className="dropdown-item" onClick={() => addItem(articulo)}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{articulo.nombre}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatCurrency(Number((getPrecioBase(articulo) * listaPrecio).toFixed(2)))} · {vecesComprado}x</div>
                                            </div>
                                            <button className="btn btn-primary btn-sm" style={{ padding: '3px 8px' }}>+</button>
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
