import jsPDF from 'jspdf'
import { formatCurrency, round2 } from './utils'

export function generarReciboPDF(
    clienteNombre: string,
    montoPago: number,
    notaPago: string,
    saldoAnterior: number,
    saldoNuevo: number
) {
    const doc = new jsPDF({ unit: 'mm', format: [148, 210] }) // A5
    const pw = 148, margin = 12
    let y = margin

    // Header
    doc.setFontSize(20); doc.setFont('helvetica', 'bold')
    doc.text('RECIBO DE PAGO', pw / 2, y + 8, { align: 'center' }); y += 14

    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`, pw / 2, y, { align: 'center' }); y += 10

    // Line
    doc.setDrawColor(180); doc.line(margin, y, pw - margin, y); y += 8

    // Cliente
    doc.setFontSize(11); doc.setFont('helvetica', 'normal')
    doc.text('Cliente:', margin, y)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text(clienteNombre.substring(0, 32), margin + 20, y); y += 12

    // Detalle del recibo
    const boxX = margin, boxW = pw - 2 * margin
    doc.setDrawColor(200); doc.setLineWidth(0.3)
    doc.rect(boxX, y, boxW, 58)

    // Saldo anterior
    y += 8
    doc.setFontSize(11); doc.setFont('helvetica', 'normal')
    doc.text('Saldo anterior:', boxX + 6, y)
    doc.setFont('helvetica', 'bold')
    const saldoAntColor = saldoAnterior > 0 ? [220, 38, 38] : saldoAnterior < 0 ? [22, 163, 74] : [0, 0, 0]
    doc.setTextColor(saldoAntColor[0], saldoAntColor[1], saldoAntColor[2])
    doc.text(formatCurrency(saldoAnterior), boxX + boxW - 6, y, { align: 'right' })
    doc.setTextColor(0)

    // Pago
    y += 10
    doc.setFont('helvetica', 'normal')
    doc.text('Pago recibido:', boxX + 6, y)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74)
    doc.text(`- ${formatCurrency(montoPago)}`, boxX + boxW - 6, y, { align: 'right' })
    doc.setTextColor(0)

    // Detalle del pago (con ajuste de línea automático)
    if (notaPago) {
        y += 7
        doc.setFont('helvetica', 'italic'); doc.setFontSize(9)
        const linesNota = doc.splitTextToSize(`Detalle: ${notaPago}`, boxW - 12)
        doc.text(linesNota, boxX + 6, y)
        y += (linesNota.length - 1) * 4
        doc.setFontSize(11)
    }

    // Separador
    y += 8
    doc.setDrawColor(180)
    doc.line(boxX + 6, y, boxX + boxW - 6, y)

    // Saldo restante
    y += 8
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    if (round2(saldoNuevo) === 0) {
        doc.setTextColor(22, 163, 74)
        doc.text('CUENTA SALDADA', boxX + 6, y)
        doc.text(formatCurrency(0), boxX + boxW - 6, y, { align: 'right' })
    } else if (saldoNuevo > 0) {
        doc.text('Saldo restante:', boxX + 6, y)
        doc.setTextColor(220, 38, 38)
        doc.text(formatCurrency(saldoNuevo), boxX + boxW - 6, y, { align: 'right' })
    } else {
        doc.text('Saldo a favor:', boxX + 6, y)
        doc.setTextColor(22, 163, 74)
        doc.text(formatCurrency(Math.abs(saldoNuevo)), boxX + boxW - 6, y, { align: 'right' })
    }
    doc.setTextColor(0)

    // Footer neutro sin datos de comercio
    y += 20
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150)
    doc.text('Documento no válido como factura', pw / 2, y, { align: 'center' })
    doc.setTextColor(0)

    window.open(doc.output('bloburl'), '_blank')
}

export async function renderBoletaEnDocumento(doc: jsPDF, pedido: any, _qrDataUrl?: string) {
    const pw = 210, margin = 12
    const cw = pw - 2 * margin // 186mm content width
    let y = margin

    const cols = [
        { label: 'CANT.', w: 14, align: 'center' as const },
        { label: 'CONCEPTO / DESCRIPCIÓN', w: 74, align: 'left' as const },
        { label: 'ESTADO', w: 18, align: 'center' as const },
        { label: 'P. UNIT.', w: 20, align: 'right' as const },
        { label: '% DTO.', w: 14, align: 'center' as const },
        { label: 'P. C/DTO.', w: 22, align: 'right' as const },
        { label: 'TOTAL', w: 24, align: 'right' as const },
    ]

    const renderHeader = (isContinuation = false) => {
        let currentY = margin

        // 1. BANNER SUPERIOR: "PRESUPUESTO"
        doc.setFillColor(236, 239, 243)
        doc.setDrawColor(165, 172, 182)
        doc.setLineWidth(0.35)
        doc.roundedRect(margin, currentY, cw, 12, 2, 2, 'FD')

        doc.setFontSize(17)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(45, 55, 72)
        doc.text(
            isContinuation ? 'PRESUPUESTO (Continuación)' : 'PRESUPUESTO',
            pw / 2,
            currentY + 8.5,
            { align: 'center' }
        )
        currentY += 15

        // 2. RECUADROS: CLIENTE (izq) y PRESUPUESTO / FECHA (der)
        const boxH = 20
        const gap = 4
        const w1 = 106 // Cliente
        const w2 = cw - w1 - gap // 76mm: N° Presupuesto y Fecha
        const x2 = margin + w1 + gap

        // Recuadro izquierdo: CLIENTE
        doc.setFillColor(250, 251, 252)
        doc.setDrawColor(180, 186, 196)
        doc.setLineWidth(0.3)
        doc.roundedRect(margin, currentY, w1, boxH, 2, 2, 'FD')

        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(110, 120, 135)
        doc.text('CLIENTE', margin + 4, currentY + 5)

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(20, 25, 35)
        const clienteNom = (pedido.cliente?.nombre || '—').substring(0, 36)
        doc.text(clienteNom, margin + 4, currentY + 11.5)

        const dirParts = [pedido.cliente?.direccion, pedido.cliente?.localidad].filter(Boolean)
        if (dirParts.length > 0) {
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(90, 100, 110)
            doc.text(dirParts.join(' - ').substring(0, 52), margin + 4, currentY + 16.5)
        }

        // Recuadro derecho: N° PRESUPUESTO Y FECHA
        doc.setFillColor(250, 251, 252)
        doc.setDrawColor(180, 186, 196)
        doc.roundedRect(x2, currentY, w2, boxH, 2, 2, 'FD')

        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(110, 120, 135)
        doc.text('N° PRESUPUESTO:', x2 + 4, currentY + 5.5)
        doc.setFontSize(10.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(20, 25, 35)
        doc.text(String(pedido.numero).padStart(6, '0'), x2 + w2 - 4, currentY + 5.5, { align: 'right' })

        const fechaEmision = new Date(pedido.createdAt)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(110, 120, 135)
        doc.text('FECHA:', x2 + 4, currentY + 11)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(35, 40, 50)
        doc.text(
            `${fechaEmision.toLocaleDateString('es-AR')} ${fechaEmision.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`,
            x2 + w2 - 4,
            currentY + 11,
            { align: 'right' }
        )

        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(125, 135, 145)
        doc.text('Documento no válido como factura', x2 + w2 / 2, currentY + 17, { align: 'center' })

        currentY += boxH + 4

        // 3. ENCABEZADO DE TABLA (colores grises con separadores verticales)
        doc.setFillColor(224, 228, 234)
        doc.setDrawColor(160, 168, 178)
        doc.setLineWidth(0.35)
        doc.rect(margin, currentY, cw, 7.5, 'FD')

        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(45, 55, 68)

        let cx = margin
        for (let i = 0; i < cols.length; i++) {
            const col = cols[i]
            const tx = col.align === 'right' ? cx + col.w - 2 : col.align === 'center' ? cx + col.w / 2 : cx + 2
            doc.text(col.label, tx, currentY + 5, { align: col.align === 'left' ? undefined : col.align })

            // Línea vertical divisoria entre columnas del header
            if (i > 0) {
                doc.setDrawColor(185, 192, 202)
                doc.line(cx, currentY, cx, currentY + 7.5)
            }
            cx += col.w
        }

        doc.setTextColor(0)
        return currentY + 7.5
    }

    y = renderHeader(false)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    let rowNum = 0
    const items = pedido.items || []
    let subtotalGeneral = 0
    const rowH = 6.2

    for (const item of items) {
        if (y > 245) {
            // Cerrar la tabla en esta página
            doc.setDrawColor(160, 168, 178)
            doc.setLineWidth(0.35)
            doc.line(margin, y, margin + cw, y)

            doc.addPage()
            y = renderHeader(true)
        }

        const cant = Number(item.cantidad)
        const precio = Number(item.precioUnitario)
        const desc = Number(item.descuento) || 0
        const precioConDesc = round2(precio * (1 - desc / 100))
        const subtotal = round2(cant * precioConDesc)
        subtotalGeneral += subtotal

        // Fondo alternado muy sutil
        if (rowNum % 2 === 1) {
            doc.setFillColor(252, 252, 254)
            doc.rect(margin, y, cw, rowH, 'F')
        }

        // Línea divisoria horizontal punteada (estilo cuadriculado de la referencia)
        doc.setLineDashPattern([0.8, 0.8], 0)
        doc.setDrawColor(200, 205, 212)
        doc.setLineWidth(0.2)
        doc.line(margin, y + rowH, margin + cw, y + rowH)
        doc.setLineDashPattern([], 0) // Restaurar a línea continua

        // Líneas verticales divisorias entre columnas (grilla cuadriculada)
        doc.setDrawColor(215, 220, 226)
        let divX = margin
        for (let i = 0; i < cols.length; i++) {
            divX += cols[i].w
            if (i < cols.length - 1) {
                doc.line(divX, y, divX, y + rowH)
            }
        }

        // Bordes laterales exteriores de la tabla
        doc.setDrawColor(160, 168, 178)
        doc.setLineWidth(0.3)
        doc.line(margin, y, margin, y + rowH)
        doc.line(margin + cw, y, margin + cw, y + rowH)

        // Contenido de la fila
        let cellX = margin
        // 0. Cantidad
        doc.setTextColor(30, 35, 45)
        doc.text(String(cant), cellX + cols[0].w / 2, y + 4.3, { align: 'center' })
        cellX += cols[0].w

        // 1. Concepto / Descripción
        doc.setFont('helvetica', 'bold')
        const nombreTrunc = (item.articulo?.nombre || '').substring(0, 42)
        doc.text(nombreTrunc, cellX + 2, y + 4.3)
        doc.setFont('helvetica', 'normal')
        cellX += cols[1].w

        // 2. Estado
        if (item.estadoItem) {
            doc.setFontSize(7)
            doc.setTextColor(100, 110, 120)
            doc.text(item.estadoItem.substring(0, 12), cellX + cols[2].w / 2, y + 4.3, { align: 'center' })
            doc.setFontSize(8)
            doc.setTextColor(30, 35, 45)
        }
        cellX += cols[2].w

        // 3. P. Unitario
        doc.text(formatCurrency(precio), cellX + cols[3].w - 2, y + 4.3, { align: 'right' })
        cellX += cols[3].w

        // 4. % Dto.
        if (desc > 0) {
            doc.text(`${desc}%`, cellX + cols[4].w / 2, y + 4.3, { align: 'center' })
        } else {
            doc.setTextColor(150, 155, 165)
            doc.text('-', cellX + cols[4].w / 2, y + 4.3, { align: 'center' })
            doc.setTextColor(30, 35, 45)
        }
        cellX += cols[4].w

        // 5. P. c/Dto.
        if (desc > 0) {
            doc.text(formatCurrency(precioConDesc), cellX + cols[5].w - 2, y + 4.3, { align: 'right' })
        } else {
            doc.setTextColor(150, 155, 165)
            doc.text('-', cellX + cols[5].w / 2, y + 4.3, { align: 'center' })
            doc.setTextColor(30, 35, 45)
        }
        cellX += cols[5].w

        // 6. Subtotal
        doc.setFont('helvetica', 'bold')
        doc.text(formatCurrency(subtotal), cellX + cols[6].w - 2, y + 4.3, { align: 'right' })
        doc.setFont('helvetica', 'normal')

        y += rowH
        rowNum++
    }

    // Línea de cierre inferior de la tabla
    doc.setDrawColor(160, 168, 178)
    doc.setLineWidth(0.35)
    doc.line(margin, y, margin + cw, y)

    // FOOTER / TOTALES
    if (y > 230) {
        doc.addPage()
        y = renderHeader(true)
        doc.setDrawColor(160, 168, 178)
        doc.setLineWidth(0.35)
        doc.line(margin, y, margin + cw, y)
    }

    y += 5
    const totBoxW = 76
    const totBoxX = margin + cw - totBoxW
    const saldoAnterior = round2(pedido.saldoAnterior)
    const totalFinal = round2(subtotalGeneral + saldoAnterior)

    // Subtotal
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(70, 80, 95)
    doc.text('SUBTOTAL:', totBoxX + 2, y + 4.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 25, 35)
    doc.text(formatCurrency(subtotalGeneral), margin + cw - 3, y + 4.5, { align: 'right' })
    let totalsOffset = 6

    // Saldo anterior (si aplica)
    if (saldoAnterior !== 0) {
        const saldoY = y + totalsOffset
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(70, 80, 95)
        if (saldoAnterior > 0) {
            doc.text('SALDO (DEBE):', totBoxX + 2, saldoY + 4.5)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(220, 38, 38)
            doc.text(formatCurrency(saldoAnterior), margin + cw - 3, saldoY + 4.5, { align: 'right' })
        } else {
            doc.text('SALDO (A FAVOR):', totBoxX + 2, saldoY + 4.5)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(22, 163, 74)
            doc.text(`-${formatCurrency(Math.abs(saldoAnterior))}`, margin + cw - 3, saldoY + 4.5, { align: 'right' })
        }
        totalsOffset += 6
    }

    // Recuadro TOTAL PRESUPUESTO (resaltado en grisáceo como la plantilla)
    const boxTotalY = y + totalsOffset
    doc.setFillColor(234, 238, 244)
    doc.setDrawColor(160, 168, 178)
    doc.setLineWidth(0.4)
    doc.roundedRect(totBoxX, boxTotalY, totBoxW, 10, 1.5, 1.5, 'FD')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 50, 65)
    doc.text('TOTAL PRESUPUESTO', totBoxX + 3, boxTotalY + 6.5)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(formatCurrency(totalFinal), margin + cw - 3, boxTotalY + 6.5, { align: 'right' })

    // Recuadro de OBSERVACIONES a la izquierda (si hay notas)
    if (pedido.notas) {
        const notasW = cw - totBoxW - 6
        const notasH = totalsOffset + 10
        doc.setFillColor(250, 251, 252)
        doc.setDrawColor(200, 205, 212)
        doc.setLineWidth(0.3)
        doc.roundedRect(margin, y, notasW, notasH, 1.5, 1.5, 'FD')

        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 110, 120)
        doc.text('OBSERVACIONES:', margin + 3, y + 4.5)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(50, 60, 70)
        const linesNotas = doc.splitTextToSize(pedido.notas, notasW - 6)
        doc.text(linesNotas, margin + 3, y + 9)
    }

    // Leyenda legal inferior neutra
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(140, 145, 155)
    doc.text('Documento no válido como factura', pw / 2, 287, { align: 'center' })
}

export async function generarBoletasLotePDF(pedidos: any[]) {
    if (!pedidos || pedidos.length === 0) return alert('No hay pedidos para generar boletas.')

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })

    for (let i = 0; i < pedidos.length; i++) {
        if (i > 0) doc.addPage()
        await renderBoletaEnDocumento(doc, pedidos[i])
    }

    window.open(doc.output('bloburl'), '_blank')
}
