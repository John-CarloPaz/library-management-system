/**
 * QR Code Service
 * Handles QR code generation and printing for books and catalogues
 */

/**
 * Generate QR code data URL from item
 * @param {object} item - Book or catalogue item with qr_code or qrUrl property
 * @returns {string} - Data URL or SVG fallback
 */
export function generateQRCode(item) {
  if (!item) return null

  // Try multiple property names that APIs might use
  let dataUrl = item.qr_code || item.qrUrl || item.qrDataUrl || item.qrImage || null

  if (!dataUrl) {
    // Fallback: simple SVG placeholder with the id/text
    const label = String(item.reference_number || item.bookCode || item.title || item.id || 'N/A')
    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='100%' height='100%' fill='#fff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='#333'>QR ${label}</text></svg>`
    dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  }

  return dataUrl
}

/**
 * Get QR code URL from storage path
 * @param {string} qrCodePath - Storage path like 'qr_codes/catalogue_1_copy_1.png'
 * @returns {string} - Full URL to QR code image
 */
export function getQrCodeUrl(qrCodePath) {
  if (!qrCodePath) return null
  
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
  
  // If it's already a full URL, return as-is
  if (qrCodePath.startsWith('http')) {
    return qrCodePath
  }
  
  // If it's a data URL, return as-is
  if (qrCodePath.startsWith('data:')) {
    return qrCodePath
  }
  
  // Otherwise, prepend storage path
  return `${apiUrl}/storage/${qrCodePath}`
}

/**
 * Print single book QR code
 * @param {object} item - Book item with id, bookCode, title, and optionally qr_code
 * @param {string} title - Optional title for the print window
 */
export function printSingleQrCode(item, title = 'Print QR Code') {
  if (!item) {
    console.warn('printSingleQrCode called without item')
    return
  }

  const dataUrl = generateQRCode(item)
  if (!dataUrl) {
    try { window.alert('Failed to generate QR code') } catch (e) { /* noop */ }
    return
  }

  // Get the label/reference
  const label = item.reference_number || item.bookCode || item.title || item.id || 'N/A'

  // Open a print-friendly window with the QR image and trigger print
  const printWindow = window.open('', '_blank', 'width=420,height=640')
  if (!printWindow) {
    try { window.alert('Popup blocked. Please allow popups to print the QR code.') } catch (e) { /* noop */ }
    return
  }

  const html = `<!doctype html><html><head><title>${title}</title><meta charset="utf-8"><style>html,body{height:100%;margin:0}body{display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;padding:20px}img{max-width:90%;height:auto;border:0;margin:10px 0}.info{text-align:center;font-size:14px;color:#333;margin-top:10px}.label{font-weight:bold;margin-bottom:5px}</style></head><body><div><div class="info"><div class="label">${label}</div></div><img src="${dataUrl}" alt="QR Code"/></div><script>window.onload=function(){setTimeout(()=>{window.print();},200);};${'</scr' + 'ipt>'}</body></html>`
  
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

/**
 * Print multiple QR codes (for catalogue copies)
 * @param {array} items - Array of book items with qr_code property
 * @param {object} catalogueInfo - { title, callNumber, totalCopies } for header
 */
export function printMultipleQrCodes(items, catalogueInfo = {}) {
  if (!items || items.length === 0) {
    try { window.alert('No items to print') } catch (e) { /* noop */ }
    return
  }

  const { title = 'Books', callNumber = '', totalCopies = items.length } = catalogueInfo

  // Generate QR code items HTML
  const qrCodesHtml = items.map((item, index) => {
    const dataUrl = generateQRCode(item)
    const label = item.reference_number || `Copy ${item.copy_number || index + 1}`
    
    return `
      <div class="qr-code-item">
        <div class="qr-code-container">
          <img src="${dataUrl}" alt="QR Code ${index + 1}" class="qr-code-image">
        </div>
        <div class="qr-code-info">
          <p class="font-weight-bold">${label}</p>
        </div>
      </div>
    `
  }).join('')

  // Open a print-friendly window with all QR codes
  const printWindow = window.open('', '_blank', 'width=900,height=1200')
  if (!printWindow) {
    try { window.alert('Popup blocked. Please allow popups to print the QR codes.') } catch (e) { /* noop */ }
    return
  }

  const html = `<!doctype html><html><head><title>Print QR Codes</title><meta charset="utf-8"><style>html,body{height:100%;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:20px;background:#fff}.print-header{text-align:center;margin-bottom:40px}.print-header h2{margin:0;font-size:24px}.print-header p{margin:5px 0;font-size:14px;color:#666}.qr-codes-grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:30px;margin-top:20px}.qr-code-item{text-align:center;break-inside:avoid;page-break-inside:avoid}.qr-code-container{display:flex;justify-content:center;margin-bottom:10px;border:2px solid #e0e0e0;padding:10px;border-radius:4px;background:#fff}.qr-code-image{max-width:150px;height:auto}.qr-code-info{margin-top:8px}.qr-code-info p{margin:0;font-size:12px}@media print{body{margin:0;padding:0}.v-container{max-width:none}.qr-codes-grid{grid-template-columns:repeat(3, 1fr)}.qr-code-item{page-break-inside:avoid}}</style></head><body><div class="print-header"><h2>${title}</h2>${callNumber ? `<p>Call Number: ${callNumber}</p>` : ''}<p>Total Copies: ${totalCopies}</p><hr style="margin:20px 0"></div><div class="qr-codes-grid">${qrCodesHtml}</div><script>window.onload=function(){setTimeout(()=>{window.print();},200);};${'</scr' + 'ipt>'}</body></html>`
  
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

export default {
  generateQRCode,
  getQrCodeUrl,
  printSingleQrCode,
  printMultipleQrCodes,
}
