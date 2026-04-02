/**
 * Get QR code URL from storage path
 * @param {string} qrCodePath - Storage path like 'qr_codes/catalogue_1_copy_1.png'
 * @returns {string} - Full URL to QR code image
 */
export function getQrCodeUrl(qrCodePath) {
  if (!qrCodePath) return '';

  const asString = String(qrCodePath).trim();

  // If the backend already returned a full URL, return as-is
  if (asString.startsWith('http://') || asString.startsWith('https://')) return asString;

  const origin = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const baseUrl = `${origin}/public/storage/`;

  // Normalize the incoming path: strip leading slashes and common prefixes
  let normalized = asString.replace(/^\/+/, '');
  normalized = normalized.replace(/^api\//, '');
  normalized = normalized.replace(/^public\//, '');
  normalized = normalized.replace(/^storage\//, '');
  normalized = normalized.replace(/^public\/storage\//, '');

  return baseUrl + normalized;
}

/**
 * Print QR code(s) for books
 * @param {array} books - Array of book objects with qr_code property
 * @param {string} catalogueTitle - Title to display at top of print
 * @returns {void}
 */
export function printQrCodes(books, catalogueTitle) {
  if (!books || !Array.isArray(books) || books.length === 0) {
    console.warn('No books provided for printing');
    return;
  }

  // Create print window
  const printWindow = window.open('', '_blank');
  
  const htmlContent = generatePrintHtml(books, catalogueTitle);
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for images to load before printing
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
}

/**
 * Print Student Library ID Card(s)
 * Uses a fixed-size ID card layout with the QR code as the main visual.
 * @param {array} students - Array of student objects with identification fields
 * @returns {void}
 */
export function printStudentIdCards(students) {
  if (!students || !Array.isArray(students) || students.length === 0) {
    console.warn('No students provided for ID card printing');
    return;
  }

  const printWindow = window.open('', '_blank');
  const htmlContent = generateStudentIdCardsHtml(students);

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
}

/**
 * Generate HTML content for printing QR codes
 * @param {array} books - Array of book objects
 * @param {string} catalogueTitle - Title to display
 * @returns {string} - HTML string
 */
function generatePrintHtml(books, catalogueTitle) {
  const qrCodeItems = books
    .map(book => {
      const qrUrl = book.qr_code ? getQrCodeUrl(book.qr_code) : '';
      const title = book.title || catalogueTitle;
      const refNum = book.reference_number || '';
      const copyNum = book.copy_number || '';
      
      return `
        <div class="qr-code-item">
          <div class="qr-code-container">
            ${qrUrl ? `<img src="${qrUrl}" alt="QR Code ${copyNum}" class="qr-code-image">` : '<div class="qr-code-placeholder">QR Not Available</div>'}
          </div>
          <div class="qr-code-info">
            <p class="qr-title">${title}</p>
            <p class="qr-copy">Copy# ${copyNum} | Ref# ${refNum}</p>
          </div>
        </div>
      `;
    })
    .join('');

  const headerHtml = books.length > 1 
    ? `<div class="print-header">
        <h2>${catalogueTitle}</h2>
        <p class="total-copies">Total Copies: ${books.length}</p>
        <hr>
      </div>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Print QR Codes</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          background: white;
        }
        
        .print-header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }
        
        .print-header h2 {
          font-size: 24px;
          margin-bottom: 10px;
          color: #333;
        }
        
        .total-copies {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        
        .qr-codes-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
          margin-top: 20px;
        }
        
        .qr-code-item {
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .qr-code-container {
          display: flex;
          justify-content: center;
          margin-bottom: 15px;
          border: 2px solid #e0e0e0;
          padding: 15px;
          border-radius: 4px;
          background: white;
          min-height: 180px;
          align-items: center;
        }
        
        .qr-code-image {
          max-width: 160px;
          max-height: 160px;
          width: auto;
          height: auto;
        }
        
        .qr-code-placeholder {
          width: 160px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          color: #999;
          font-size: 12px;
          border: 1px dashed #ccc;
        }
        
        .qr-code-info {
          padding: 0 5px;
        }
        
        .qr-title {
          margin: 8px 0 4px 0;
          font-weight: 600;
          font-size: 13px;
          color: #333;
          word-wrap: break-word;
        }
        
        .qr-copy {
          margin: 0;
          font-size: 11px;
          color: #999;
        }
        
        @media print {
          body {
            padding: 0;
            background: white;
          }
          
          .qr-codes-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 40px;
          }
          
          .qr-code-item {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      ${headerHtml}
      <div class="qr-codes-grid">
        ${qrCodeItems}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML content for printing student library ID cards
 * @param {array} students - Array of student objects
 * @returns {string} - HTML string
 */
function generateStudentIdCardsHtml(students) {
  const cards = students
    .map(student => {
      const fullName = student.name || [
        student.first_name,
        student.middle_name,
        student.last_name,
        student.suffix,
      ].filter(Boolean).join(' ');

      const studentNumber = student.student_number || student.student_id || student.studentId || '';
      const program = student.program || '';
      const yearLevel = student.year_level || '';
      const email = student.email || '';
      const status = student.status || '';

      let qrUrl = '';
      if (student.qr_code) {
        // Support either raw storage path or full URL
        qrUrl = String(student.qr_code).startsWith('http')
          ? student.qr_code
          : getQrCodeUrl(student.qr_code);
      }

      return `
        <div class="id-card">
          <div class="id-card-header">
            <div class="school-name">Systems Plus College Foundation</div>
            <div class="card-label">Library Card</div>
          </div>
          <div class="id-card-body">
            <div class="id-card-qr-container">
              ${qrUrl
                ? `<img src="${qrUrl}" alt="Student QR Code" class="id-card-qr-image">`
                : '<div class="id-card-qr-placeholder">QR Not Available</div>'}
            </div>
            <div class="id-card-info">
              <div class="info-row name">${fullName || 'Unnamed Student'}</div>
              <div class="info-row"><span class="label">Student No.:</span><span class="value">${studentNumber}</span></div>
              ${program ? `<div class=\"info-row\"><span class=\"label\">Program:</span><span class=\"value\">${program}</span></div>` : ''}
              ${yearLevel ? `<div class=\"info-row\"><span class=\"label\">Year Level:</span><span class=\"value\">${yearLevel}</span></div>` : ''}
              ${email ? `<div class=\"info-row\"><span class=\"label\">Email:</span><span class=\"value\">${email}</span></div>` : ''}
              ${status ? `<div class=\"info-row\"><span class=\"label\">Status:</span><span class=\"value\">${status}</span></div>` : ''}
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Print Student Library Cards</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          padding: 10mm;
          background: white;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8mm;
        }

        .id-card {
          width: 85.6mm;
          height: 54mm;
          border-radius: 3mm;
          border: 1px solid #d0d0d0;
          padding: 3mm 4mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #ffffff;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .id-card-header {
          text-align: center;
          margin-bottom: 2mm;
        }

        .school-name {
          font-size: 9pt;
          font-weight: 700;
          color: #1f2933;
        }

        .card-label {
          font-size: 7pt;
          color: #4b5563;
          margin-top: 0.5mm;
        }

        .id-card-body {
          display: flex;
          flex: 1;
          align-items: center;
          gap: 3mm;
        }

        .id-card-qr-container {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30mm;
          height: 30mm;
          border-radius: 2mm;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          overflow: hidden;
        }

        .id-card-qr-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .id-card-qr-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7pt;
          color: #9ca3af;
        }

        .id-card-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1mm;
          font-size: 7pt;
          color: #111827;
        }

        .info-row.name {
          font-weight: 700;
          font-size: 8pt;
          margin-bottom: 1mm;
        }

        .info-row .label {
          display: inline-block;
          min-width: 18mm;
          color: #4b5563;
        }

        .info-row .value {
          font-weight: 600;
        }

        @media print {
          body {
            padding: 0;
            margin: 0;
          }

          .cards-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8mm;
            margin: 5mm;
          }

          .id-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="cards-grid">
        ${cards}
      </div>
    </body>
    </html>
  `;
}

export default {
  getQrCodeUrl,
  printQrCodes,
  printStudentIdCards,
};
