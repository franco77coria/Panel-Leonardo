'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { IconClipboard, IconUsers, IconPackage, IconGift, IconMenu, IconX } from './Icons'

const nav = [
    { href: '/', label: 'Dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
    { href: '/clientes', label: 'Clientes', icon: <IconUsers size={20} /> },
    { href: '/articulos', label: 'Artículos', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg> },
    { href: '/pedidos', label: 'Pedidos', icon: <IconClipboard size={20} /> },
    { href: '/logistica', label: 'Logística', icon: <IconPackage size={20} /> },
    { href: '/packs', label: 'Packs', icon: <IconGift size={20} /> },
]

export function Sidebar() {
    const pathname = usePathname()
    const [open, setOpen] = useState(false)

    return (
        <>
            {/* Mobile header */}
            <div className="mobile-header">
                <button className="mobile-toggle" onClick={() => setOpen(!open)}>
                    {open ? <IconX size={24} /> : <IconMenu size={24} />}
                </button>
                <img src="/logo.png" alt="Papelera Leo" style={{ height: 28, objectFit: 'contain' }} />
            </div>

            {/* Overlay */}
            <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

            {/* Sidebar */}
            <aside className={`sidebar ${open ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <img src="/logo.png" alt="Papelera Leo" style={{ height: 36, objectFit: 'contain', marginBottom: 4 }} />
                    <span>Sistema de Gestión</span>
                </div>
                <nav className="sidebar-nav">
                    {nav.map(({ href, label, icon }) => {
                        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                                onClick={() => setOpen(false)}
                            >
                                {icon}
                                {label}
                            </Link>
                        )
                    })}
                </nav>
            </aside>
        </>
    )
}
