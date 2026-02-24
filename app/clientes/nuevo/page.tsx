'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NuevoClientePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ nombre: '', direccion: '', telefono: '', saldo: '0' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const res = await fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, saldo: parseFloat(form.saldo) || 0 }),
        })
        const data = await res.json()
        setLoading(false)
        if (res.ok) router.push(`/clientes/${data.id}`)
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <Link href="/clientes" style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none' }}>← Clientes</Link>
                    <h1 className="page-title" style={{ marginTop: 4 }}>Nuevo Cliente</h1>
                </div>
            </div>

            <div className="page-body" style={{ maxWidth: 600 }}>
                <div className="card">
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="form-group">
                            <label>Nombre / Razón Social *</label>
                            <input
                                type="text"
                                value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })}
                                placeholder="Ej: Carnicería Don José"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label>Dirección</label>
                            <input
                                type="text"
                                value={form.direccion}
                                onChange={e => setForm({ ...form, direccion: e.target.value })}
                                placeholder="Ej: Av. Corrientes 1234"
                            />
                        </div>
                        <div className="two-col">
                            <div className="form-group">
                                <label>Teléfono / WhatsApp</label>
                                <input
                                    type="tel"
                                    value={form.telefono}
                                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                                    placeholder="Ej: 11 1234-5678"
                                />
                            </div>
                            <div className="form-group">
                                <label>Saldo inicial ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={form.saldo}
                                    onChange={e => setForm({ ...form, saldo: e.target.value })}
                                    placeholder="0.00"
                                />
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Positivo = debe, Negativo = a favor</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <Link href="/clientes" className="btn btn-secondary">Cancelar</Link>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Guardando...' : 'Guardar Cliente'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}
