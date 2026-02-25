// Genera SQL con precios corregidos (columna ' COSTO ' con espacios)
const XLSX = require('xlsx')
const { randomBytes } = require('crypto')

function cuid() { return randomBytes(12).toString('hex').substring(0, 25) }
function esc(s) { return String(s).replace(/'/g, "''") }

const wbPrecios = XLSX.readFile('c:\\Users\\Usuario\\OneDrive\\Escritorio\\Pagina web\\BASE PRECIOS.xlsx')
const sheetPrecios = wbPrecios.Sheets[wbPrecios.SheetNames[0]]
const rowsPrecios = XLSX.utils.sheet_to_json(sheetPrecios, { defval: '' })

// Generate UPDATE SQL (articles already exist, just fix prices)
let sql = '-- Actualización de precios de artículos (corregido)\n\n'

let count = 0
for (const row of rowsPrecios) {
    const nombre = (row['DESCRIPCION'] || '').toString().trim()
    if (!nombre) continue

    // The column is ' COSTO ' with spaces!
    const costo = Number(row[' COSTO ']) || 0
    const costoRound = Math.round(costo * 100) / 100

    if (costoRound > 0) {
        sql += `UPDATE articulos SET costo = ${costoRound}, precio = ${costoRound} WHERE nombre = '${esc(nombre)}';\n`
        count++
    }
}

sql += `\n-- ${count} artículos actualizados con precios\n`

require('fs').writeFileSync('c:\\Users\\Usuario\\OneDrive\\Escritorio\\Pagina web\\Panel-Leonardo\\scripts\\fix-precios.sql', sql, 'utf8')
console.log(`✅ Generado scripts/fix-precios.sql con ${count} UPDATE statements`)
console.log(`\nEjemplos de precios:`)
for (let i = 0; i < 5; i++) {
    const r = rowsPrecios[i]
    console.log(`  ${r['DESCRIPCION']}: $${(Number(r[' COSTO ']) || 0).toFixed(2)}`)
}
