// Script to import data from Excel files into the database
const XLSX = require('xlsx')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function parsePrecio(str) {
    if (!str) return 0
    // Remove "$", spaces, and handle Argentine format (dots for thousands, comma for decimals)
    const clean = String(str).replace(/\$/g, '').replace(/\s/g, '').trim()
    if (!clean || clean === '-') return 0
    // Format: "41,275.87" -> 41275.87
    // Or: "900.74" -> 900.74
    // The xlsx-cli shows format like: "$ 41,275.87"
    // Remove commas used as thousands separators
    const num = parseFloat(clean.replace(/,/g, ''))
    return isNaN(num) ? 0 : num
}

function parseDate(val) {
    if (!val) return new Date()
    // Excel dates can be numbers or strings
    if (typeof val === 'number') {
        // Excel serial date
        const d = new Date((val - 25569) * 86400 * 1000)
        return isNaN(d.getTime()) ? new Date() : d
    }
    // Try parsing as string
    const d = new Date(val)
    return isNaN(d.getTime()) ? new Date() : d
}

async function main() {
    console.log('=== Importación de Datos - Papelera Leo ===\n')

    // 1. Import Proveedores first (unique from PRECIOS)
    console.log('📦 Leyendo BASE PRECIOS.xlsx...')
    const wbPrecios = XLSX.readFile('c:\\Users\\Usuario\\OneDrive\\Escritorio\\Pagina web\\BASE PRECIOS.xlsx')
    const sheetPrecios = wbPrecios.Sheets[wbPrecios.SheetNames[0]]
    const rowsPrecios = XLSX.utils.sheet_to_json(sheetPrecios, { defval: '' })
    console.log(`   ${rowsPrecios.length} filas encontradas`)

    // Extract unique proveedores
    const proveedoresSet = new Set()
    for (const row of rowsPrecios) {
        const prov = (row['PROVEEDOR'] || '').toString().trim()
        if (prov && prov !== '') proveedoresSet.add(prov)
    }
    console.log(`   ${proveedoresSet.size} proveedores únicos: ${[...proveedoresSet].join(', ')}`)

    // Create proveedores
    const proveedorMap = {}
    for (const nombre of proveedoresSet) {
        const existing = await prisma.proveedor.findFirst({ where: { nombre } })
        if (existing) {
            proveedorMap[nombre] = existing.id
            console.log(`   Proveedor "${nombre}" ya existe (${existing.id})`)
        } else {
            const created = await prisma.proveedor.create({ data: { nombre } })
            proveedorMap[nombre] = created.id
            console.log(`   Proveedor "${nombre}" creado (${created.id})`)
        }
    }

    // 2. Import Artículos
    console.log(`\n📋 Importando ${rowsPrecios.length} artículos...`)
    let articlesCreated = 0
    let articlesSkipped = 0
    let articlesErrors = 0

    for (const row of rowsPrecios) {
        const nombre = (row['DESCRIPCION'] || row['﻿DESCRIPCION'] || '').toString().trim()
        if (!nombre) { articlesSkipped++; continue }

        const costo = parsePrecio(row['COSTO'] || row['COSTO '])
        const fecha = parseDate(row['FECHA'])
        const provNombre = (row['PROVEEDOR'] || '').toString().trim()
        const proveedorId = proveedorMap[provNombre] || null

        try {
            // Check if exists
            const existing = await prisma.articulo.findFirst({ where: { nombre } })
            if (existing) {
                // Update price and date
                await prisma.articulo.update({
                    where: { id: existing.id },
                    data: { costo, precio: costo, fechaPrecio: fecha, ...(proveedorId ? { proveedorId } : {}) }
                })
                articlesSkipped++
            } else {
                await prisma.articulo.create({
                    data: {
                        nombre,
                        costo,
                        precio: costo, // Precio = costo initially, user can adjust
                        unidad: 'unidad',
                        fechaPrecio: fecha,
                        ...(proveedorId ? { proveedorId } : {}),
                    }
                })
                articlesCreated++
            }
        } catch (err) {
            console.error(`   Error con "${nombre}": ${err.message}`)
            articlesErrors++
        }
    }
    console.log(`   ✓ Creados: ${articlesCreated} | Actualizados/Saltados: ${articlesSkipped} | Errores: ${articlesErrors}`)

    // 3. Import Clientes
    console.log('\n👥 Leyendo BASE CLIENTES.xlsx...')
    const wbClientes = XLSX.readFile('c:\\Users\\Usuario\\OneDrive\\Escritorio\\Pagina web\\BASE CLIENTES.xlsx')
    const sheetClientes = wbClientes.Sheets[wbClientes.SheetNames[0]]
    const rowsClientes = XLSX.utils.sheet_to_json(sheetClientes, { defval: '' })
    console.log(`   ${rowsClientes.length} filas encontradas`)

    let clientsCreated = 0
    let clientsSkipped = 0

    for (const row of rowsClientes) {
        const nombre = (row['RAZONSOCIAL'] || row['﻿RAZONSOCIAL'] || '').toString().trim()
        if (!nombre) { clientsSkipped++; continue }

        const direccion = (row['LOCALIDAD'] || '').toString().trim()

        try {
            const existing = await prisma.cliente.findFirst({ where: { nombre } })
            if (existing) {
                // Update direccion if empty
                if (!existing.direccion && direccion) {
                    await prisma.cliente.update({ where: { id: existing.id }, data: { direccion } })
                }
                clientsSkipped++
            } else {
                await prisma.cliente.create({
                    data: { nombre, direccion, saldo: 0 }
                })
                clientsCreated++
            }
        } catch (err) {
            console.error(`   Error con "${nombre}": ${err.message}`)
        }
    }
    console.log(`   ✓ Creados: ${clientsCreated} | Saltados: ${clientsSkipped}`)

    // Summary
    const totalArticulos = await prisma.articulo.count()
    const totalClientes = await prisma.cliente.count()
    console.log(`\n=== RESUMEN FINAL ===`)
    console.log(`Artículos en DB: ${totalArticulos}`)
    console.log(`Clientes en DB:  ${totalClientes}`)
    console.log(`Proveedores:     ${Object.keys(proveedorMap).length}`)
    console.log('==================\n')

    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
