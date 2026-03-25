'use client'

import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'

interface ClienteOption {
    id: string
    nombre: string
    saldo: number
}

export function PagoRapido() {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [clientes, setClientes] = useState<ClienteOption[]>([])
    const [selected, setSelected] = useState<ClienteOption | null>(null)
    const [monto, setMonto] = useState('')
    const [nota, setNota] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [searching, setSearching] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

    // Buscar clientes al escribir
    useEffect(() => {
        if (!open || selected) return
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (query.length < 2) { setClientes([]); return }

        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            const res = await fetch(`/api/clientes?q=${encodeURIComponent(query)}`)
            const data = await res.json()
            setClientes(data.map((c: any) => ({ id: c.id, nombre: c.nombre, saldo: Number(c.saldo) })))
            setSearching(false)
        }, 300)

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [query, open, selected])

    const reset = () => {
        setQuery('')
        setClientes([])
        setSelected(null)
        setMonto('')
        setNota('')
        setSuccess(false)
    }

    const handleOpen = () => { reset(); setOpen(true) }
    const handleClose = () => { setOpen(false); reset() }

    const handleSelect = (c: ClienteOption) => {
        setSelected(c)
        setQuery(c.nombre)
        setClientes([])
    }

    const handleClearSelection = () => {
        setSelected(null)
        setQuery('')
        setClientes([])
    }

    const handleSubmit = async () => {
        if (!selected) return alert('Seleccioná un cliente')
        if (!monto || parseFloat(monto) <= 0) return alert('Ingresá un monto válido')

        setLoading(true)
        const res = await fetch(`/api/clientes/${selected.id}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monto: parseFloat(monto), nota }),
        })

        if (res.ok) {
            setSuccess(true)
            setTimeout(() => { handleClose(); window.location.reload() }, 2000)
        } else {
            alert('Error al registrar el pago')
        }
        setLoading(false)
    }

    const saldoLabel = selected
        ? selected.saldo > 0 ? `Debe ${formatCurrency(selected.saldo)}`
        : selected.saldo < 0 ? `A favor ${formatCurrency(Math.abs(selected.saldo))}`
        : 'Sin saldo'
        : ''
    const saldoColor = selected
        ? selected.saldo > 0 ? 'var(--red)' : selected.saldo < 0 ? 'var(--green)' : 'var(--text-muted)'
        : ''

    return (
        <>
            <button className="btn btn-primary btn-lg" onClick={handleOpen} style={{ background: 'var(--green)', borderColor: 'var(--green)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                Pago Rápido
            </button>

            {open && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={e => { if (e.target === e.currentTarget) handleClose() }}
                >
                    <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 420, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Pago Rápido</h2>
                            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>&times;</button>
                        </div>

                        {success ? (
                            <div className="alert alert-green" style={{ textAlign: 'center', padding: 24 }}>
                                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Pago registrado</div>
                                <div style={{ fontSize: 14 }}>
                                    {formatCurrency(parseFloat(monto))} a <strong>{selected?.nombre}</strong>
                                </div>
                                {nota && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{nota}</div>}
                            </div>
                        ) : (
                            <>
                                {/* Buscador de cliente */}
                                <div className="form-group">
                                    <label>Cliente</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            value={query}
                                            onChange={e => { setQuery(e.target.value); if (selected) handleClearSelection() }}
                                            placeholder="Escribí para buscar..."
                                            autoFocus
                                            style={{ width: '100%' }}
                                        />
                                        {selected && (
                                            <button
                                                onClick={handleClearSelection}
                                                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}
                                            >&times;</button>
                                        )}
                                    </div>
                                    {/* Dropdown de resultados */}
                                    {!selected && clientes.length > 0 && (
                                        <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 200, overflow: 'auto', background: 'white' }}>
                                            {clientes.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => handleSelect(c)}
                                                    style={{
                                                        padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        borderBottom: '1px solid var(--border)',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                                                >
                                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{c.nombre}</span>
                                                    <span style={{
                                                        fontSize: 12, fontWeight: 700,
                                                        color: c.saldo > 0 ? 'var(--red)' : c.saldo < 0 ? 'var(--green)' : 'var(--text-muted)'
                                                    }}>
                                                        {c.saldo > 0 ? `Debe ${formatCurrency(c.saldo)}` : c.saldo < 0 ? `A favor ${formatCurrency(Math.abs(c.saldo))}` : '$0'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!selected && searching && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Buscando...</div>}
                                    {!selected && query.length >= 2 && !searching && clientes.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>No se encontraron clientes</div>}
                                </div>

                                {/* Saldo del cliente seleccionado */}
                                {selected && (
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.nombre}</span>
                                        <span style={{ fontSize: 14, fontWeight: 800, color: saldoColor }}>{saldoLabel}</span>
                                    </div>
                                )}

                                {/* Monto */}
                                <div className="form-group">
                                    <label>Monto ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={monto}
                                        onChange={e => setMonto(e.target.value)}
                                        placeholder="Ej: 50000"
                                    />
                                    {selected && selected.saldo > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setMonto(selected.saldo.toString())}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 12, fontWeight: 700, marginTop: 4, padding: 0 }}
                                        >
                                            Completar saldo total ({formatCurrency(selected.saldo)})
                                        </button>
                                    )}
                                </div>

                                {/* Nota / tipo de pago */}
                                <div className="form-group">
                                    <label>Tipo de pago</label>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                                        {['Efectivo', 'Transferencia', 'Mercadería', 'Cheque'].map(tipo => (
                                            <button
                                                key={tipo}
                                                type="button"
                                                className={`btn btn-sm ${nota === tipo ? 'btn-primary' : 'btn-ghost'}`}
                                                onClick={() => setNota(nota === tipo ? '' : tipo)}
                                                style={{ fontSize: 12 }}
                                            >{tipo}</button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        value={nota}
                                        onChange={e => setNota(e.target.value)}
                                        placeholder="Otro detalle..."
                                    />
                                </div>

                                {/* Resumen antes de confirmar */}
                                {selected && monto && parseFloat(monto) > 0 && (
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span>Saldo actual</span>
                                            <span style={{ fontWeight: 700, color: saldoColor }}>{formatCurrency(selected.saldo)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span>Pago</span>
                                            <span style={{ fontWeight: 700, color: 'var(--green)' }}>- {formatCurrency(parseFloat(monto))}</span>
                                        </div>
                                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: 700 }}>Saldo restante</span>
                                            {(() => {
                                                const nuevo = selected.saldo - parseFloat(monto)
                                                return <span style={{ fontWeight: 800, color: nuevo > 0 ? 'var(--red)' : nuevo < 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                                                    {nuevo > 0 ? `Debe ${formatCurrency(nuevo)}` : nuevo < 0 ? `A favor ${formatCurrency(Math.abs(nuevo))}` : 'Saldado'}
                                                </span>
                                            })()}
                                        </div>
                                    </div>
                                )}

                                <button
                                    className="btn btn-primary"
                                    onClick={handleSubmit}
                                    disabled={loading || !selected || !monto}
                                    style={{ width: '100%', padding: '10px 0', fontSize: 15, background: 'var(--green)', borderColor: 'var(--green)' }}
                                >
                                    {loading ? 'Registrando...' : 'Confirmar Pago'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
