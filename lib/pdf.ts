import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { formatCurrency } from './utils'

const TELEFONO_LEO = '11 3808-8724'
const WA_LINK = 'https://wa.me/5491138088724'

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
    doc.text(clienteNombre, margin + 20, y); y += 12

    // Detalle del recibo
    const boxX = margin, boxW = pw - 2 * margin
    doc.setDrawColor(200); doc.setLineWidth(0.3)
    doc.rect(boxX, y, boxW, 52)

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

    // Detalle del pago
    if (notaPago) {
        y += 7
        doc.setFont('helvetica', 'italic'); doc.setFontSize(9)
        doc.text(`Detalle: ${notaPago}`, boxX + 6, y)
        doc.setFontSize(11)
    }

    // Separador
    y += 8
    doc.setDrawColor(180)
    doc.line(boxX + 6, y, boxX + boxW - 6, y)

    // Saldo restante
    y += 8
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    if (saldoNuevo === 0) {
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

    // Footer
    y += 20
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150)
    doc.text('Papelera Leo | Documento no válido como factura', pw / 2, y, { align: 'center' })
    doc.setTextColor(0)

    window.open(doc.output('bloburl'), '_blank')
}

export async function renderBoletaEnDocumento(doc: jsPDF, pedido: any, qrDataUrl: string) {
    const pw = 210, margin = 12
    const cw = pw - 2 * margin // content width
    let y = margin

    // HEADER: Info + QR
    doc.setFontSize(26); doc.setFont('helvetica', 'bold')
    doc.text('Papelera', margin + 3, y + 8)

    doc.setFontSize(14); doc.setFont('helvetica', 'normal')
    doc.text('Leo', margin + 3, y + 16)
    doc.setFontSize(10)
    doc.text(TELEFONO_LEO, margin + 15, y + 16)

    if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', pw - margin - 22, y, 22, 22)
        doc.setFontSize(6); doc.setFont('helvetica', 'normal')
        doc.text('WhatsApp', pw - margin - 11, y + 24, { align: 'center' })
    }

    // Rectángulo superior dividido en 3
    y += 26
    const boxH = 14
    const col1W = cw * 0.4, col2W = cw * 0.3, col3W = cw * 0.3

    doc.setDrawColor(0); doc.setLineWidth(0.3)
    doc.rect(margin, y, col1W, boxH)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('X', margin + 4, y + 6)
    doc.setFontSize(7); doc.setFont('helvetica', 'normal')
    doc.text('Documento no válido', margin + 12, y + 5)
    doc.text('como factura', margin + 12, y + 9)

    doc.rect(margin + col1W, y, col2W, boxH)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text('PRESUPUESTO N°', margin + col1W + 3, y + 5)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text(String(pedido.numero).padStart(6, '0'), margin + col1W + 3, y + 12)

    const fechaEmision = new Date(pedido.createdAt)
    doc.rect(margin + col1W + col2W, y, col3W, boxH)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text('Fecha:', margin + col1W + col2W + 3, y + 5)
    doc.setFont('helvetica', 'bold')
    doc.text(fechaEmision.toLocaleDateString('es-AR'), margin + col1W + col2W + 15, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.text('Hora:', margin + col1W + col2W + 3, y + 10)
    doc.setFont('helvetica', 'bold')
    doc.text(fechaEmision.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), margin + col1W + col2W + 15, y + 10)

    // CLIENTE
    y += boxH + 4
    doc.setFillColor(245, 246, 248)
    doc.rect(margin, y, cw, 10, 'F')
    doc.rect(margin, y, cw, 10)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text('CLIENTE:', margin + 3, y + 7)
    doc.setFontSize(14)
    doc.text(pedido.cliente?.nombre || '—', margin + 28, y + 7)

    // TABLA DE ITEMS
    y += 14
    const cols = [
        { label: 'Cant.', w: 12, align: 'center' as const },
        { label: 'Descripción', w: 76, align: 'left' as const },
        { label: 'Estado', w: 18, align: 'center' as const },
        { label: 'P. Unit.', w: 20, align: 'right' as const },
        { label: '% Dto.', w: 12, align: 'center' as const },
        { label: 'P. c/Dto.', w: 22, align: 'right' as const },
        { label: 'Subtotal', w: 24, align: 'right' as const },
    ]
    const totalColW = cols.reduce((s, c) => s + c.w, 0)

    doc.setFillColor(50, 50, 60)
    doc.rect(margin, y, totalColW, 7, 'F')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255)
    let cx = margin
    for (const col of cols) {
        const tx = col.align === 'right' ? cx + col.w - 2 : col.align === 'center' ? cx + col.w / 2 : cx + 2
        doc.text(col.label, tx, y + 5, { align: col.align === 'left' ? undefined : col.align })
        cx += col.w
    }
    doc.setTextColor(0)
    y += 7

    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    let rowNum = 0
    const items = pedido.items || []
    let subtotalGeneral = 0

    for (const item of items) {
        if (y > 255) { doc.addPage(); y = margin }

        const cant = Number(item.cantidad)
        const precio = Number(item.precioUnitario)
        const desc = Number(item.descuento) || 0
        const precioConDesc = precio * (1 - desc / 100)
        const subtotal = cant * precioConDesc
        subtotalGeneral += subtotal

        if (rowNum % 2 === 0) {
            doc.setFillColor(250, 250, 252)
            doc.rect(margin, y, totalColW, 6, 'F')
        }
        doc.rect(margin, y, totalColW, 6)

        cx = margin
        doc.text(String(cant), cx + cols[0].w / 2, y + 4.5, { align: 'center' })
        cx += cols[0].w

        doc.setFont('helvetica', 'bold')
        doc.text((item.articulo?.nombre || '').substring(0, 48), cx + 2, y + 4.5)
        doc.setFont('helvetica', 'normal')
        cx += cols[1].w

        if (item.estadoItem) {
            doc.setFontSize(7)
            doc.text(item.estadoItem.substring(0, 12), cx + cols[2].w / 2, y + 4.5, { align: 'center' })
            doc.setFontSize(8)
        }
        cx += cols[2].w

        doc.text(formatCurrency(precio), cx + cols[3].w - 2, y + 4.5, { align: 'right' })
        cx += cols[3].w

        if (desc > 0) {
            doc.text(`${desc}%`, cx + cols[4].w / 2, y + 4.5, { align: 'center' })
        }
        cx += cols[4].w

        if (desc > 0) {
            doc.text(formatCurrency(precioConDesc), cx + cols[5].w - 2, y + 4.5, { align: 'right' })
        } else {
            doc.text('-', cx + cols[5].w / 2, y + 4.5, { align: 'center' })
        }
        cx += cols[5].w

        doc.setFont('helvetica', 'bold')
        doc.text(formatCurrency(subtotal), cx + cols[6].w - 2, y + 4.5, { align: 'right' })
        doc.setFont('helvetica', 'normal')

        y += 6
        rowNum++
    }

    // FOOTER: Subtotal / Saldo / TOTAL
    y = y + 4
    const footerX = margin + totalColW - 60
    const saldoAnterior = Number(pedido.saldoAnterior) || 0
    const totalFinal = subtotalGeneral + saldoAnterior

    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text('SUBTOTAL:', footerX, y + 5)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(subtotalGeneral), margin + totalColW - 2, y + 5, { align: 'right' })

    y += 6
    doc.setFont('helvetica', 'normal')
    if (saldoAnterior > 0) {
        doc.text('SALDO (DEBE):', footerX, y + 5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(220, 38, 38)
        doc.text(formatCurrency(saldoAnterior), margin + totalColW - 2, y + 5, { align: 'right' })
    } else if (saldoAnterior < 0) {
        doc.text('SALDO (A FAVOR):', footerX, y + 5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(22, 163, 74)
        doc.text(`-${formatCurrency(Math.abs(saldoAnterior))}`, margin + totalColW - 2, y + 5, { align: 'right' })
    } else {
        doc.text('SALDO:', footerX, y + 5)
        doc.setFont('helvetica', 'bold')
        doc.text(formatCurrency(0), margin + totalColW - 2, y + 5, { align: 'right' })
    }
    doc.setTextColor(0)

    y += 8
    doc.setFillColor(50, 50, 60)
    doc.rect(footerX - 2, y, 62, 10, 'F')
    doc.setTextColor(255)
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text('TOTAL:', footerX + 2, y + 7)
    doc.setFontSize(14)
    doc.text(formatCurrency(totalFinal), margin + totalColW - 2, y + 7, { align: 'right' })
    doc.setTextColor(0)

    // RECUADRO
    const frameTop = 38
    const frameBottom = y + 12
    doc.setDrawColor(180); doc.setLineWidth(0.4)
    doc.rect(margin, frameTop, totalColW, frameBottom - frameTop)

    if (pedido.notas) {
        y += 14
        doc.setFontSize(8); doc.setFont('helvetica', 'normal')
        doc.text(`Notas: ${pedido.notas}`, margin, y)
    }
}

export async function generarBoletasLotePDF(pedidos: any[]) {
    if (!pedidos || pedidos.length === 0) return alert('No hay pedidos para generar boletas.')

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    let qrDataUrl = ''
    try {
        qrDataUrl = await QRCode.toDataURL(WA_LINK, { width: 200, margin: 1, color: { dark: '#1a2332', light: '#ffffff' } })
    } catch { /* QR error */ }

    for (let i = 0; i < pedidos.length; i++) {
        if (i > 0) doc.addPage()
        await renderBoletaEnDocumento(doc, pedidos[i], qrDataUrl)
    }

    window.open(doc.output('bloburl'), '_blank')
}
