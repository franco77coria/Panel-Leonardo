// Genera un archivo SQL con todos los INSERTs para correr en Supabase SQL Editor
const XLSX = require('xlsx')
const { randomBytes } = require('crypto')

function cuid() {
    return randomBytes(12).toString('hex').substring(0, 25)
}

function parsePrecio(str) {
    if (!str) return 0
    const clean = String(str).replace(/\$/g, '').replace(/\s/g, '').trim()
    if (!clean || clean === '-') return 0
    const num = parseFloat(clean.replace(/,/g, ''))
    return isNaN(num) ? 0 : num
}

function esc(s) {
    return String(s).replace(/'/g, "''")
}

// Read Excel files
const wbPrecios = XLSX.readFile('c:\\Users\\Usuario\\OneDrive\\Escritorio\\Pagina web\\BASE PRECIOS.xlsx')
const sheetPrecios = wbPrecios.Sheets[wbPrecios.SheetNames[0]]
const rowsPrecios = XLSX.utils.sheet_to_json(sheetPrecios, { defval: '' })

const wbClientes = XLSX.readFile('c:\\Users\\Usuario\\OneDrive\\Escritorio\\Pagina web\\BASE CLIENTES.xlsx')
const sheetClientes = wbClientes.Sheets[wbClientes.SheetNames[0]]
const rowsClientes = XLSX.utils.sheet_to_json(sheetClientes, { defval: '' })

let sql = '-- Importación Papelera Leo\n-- Ejecutar en Supabase SQL Editor\n\n'

// 1. Proveedor
const provId = cuid()
sql += `-- PROVEEDOR\n`
sql += `INSERT INTO proveedores (id, nombre, "createdAt") VALUES ('${provId}', 'GUENAV', NOW()) ON CONFLICT DO NOTHING;\n\n`

// 2. Artículos
sql += `-- ARTÍCULOS (${rowsPrecios.length} registros)\n`
let artCount = 0
for (const row of rowsPrecios) {
    const nombre = (row['DESCRIPCION'] || row['\uFEFFDESCRIPCION'] || '').toString().trim()
    if (!nombre) continue
    const costo = parsePrecio(row['COSTO'] || row['COSTO '])
    const id = cuid()
    artCount++
    sql += `INSERT INTO articulos (id, nombre, "proveedorId", costo, precio, unidad, "permiteDecimal", "fechaPrecio", activo, "createdAt") VALUES ('${id}', '${esc(nombre)}', '${provId}', ${costo}, ${costo}, 'unidad', false, NOW(), true, NOW()) ON CONFLICT DO NOTHING;\n`
}

sql += `\n-- CLIENTES (${rowsClientes.length} registros)\n`
let cliCount = 0
for (const row of rowsClientes) {
    const nombre = (row['RAZONSOCIAL'] || row['\uFEFFRAZONSOCIAL'] || '').toString().trim()
    if (!nombre) continue
    const localidad = (row['LOCALIDAD'] || '').toString().trim()
    const id = cuid()
    cliCount++
    sql += `INSERT INTO clientes (id, nombre, direccion, saldo, activo, "createdAt") VALUES ('${id}', '${esc(nombre)}', '${esc(localidad)}', 0, true, NOW()) ON CONFLICT DO NOTHING;\n`
}

sql += `\n-- RESUMEN: ${artCount} artículos + ${cliCount} clientes generados\n`

require('fs').writeFileSync('c:\\Users\\Usuario\\OneDrive\\Escritorio\\Pagina web\\Panel-Leonardo\\scripts\\import-data.sql', sql, 'utf8')
console.log(`✅ Archivo generado: scripts/import-data.sql`)
console.log(`   ${artCount} artículos + ${cliCount} clientes`)
console.log(`\n👉 Abrí Supabase → SQL Editor → pegá el contenido del archivo y ejecutá`)
