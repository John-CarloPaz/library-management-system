// Reusable export utilities for tables
// Functions:
// - normalizeFields(headersOrFields): returns array of { key, label }
// - generateCsv(items, headersOrFields)
// - generateJson(items)
// - generateXml(items, headersOrFields, options)
// - triggerDownload(filename, content, mime)
// - exportAsCsv(items, headersOrFields, filename)
// - exportAsJson(items, filename)
// - exportAsXml(items, headersOrFields, filename)

export function normalizeFields(headersOrFields = []) {
  if (!Array.isArray(headersOrFields)) return [];

  // If array of strings -> treat as keys with same label
  if (headersOrFields.length === 0) return [];
  if (typeof headersOrFields[0] === 'string') {
    return headersOrFields.map(k => ({ key: k, label: k }));
  }

  // Otherwise assume array of header objects
  return headersOrFields
    .map(h => {
      if (!h) return null;
      const key = h.value || h.key || h.field || h.name || h.text;
      const label = h.text || h.title || h.label || key || '';
      return { key, label };
    })
    .filter(Boolean)
    .filter(h => h.key !== 'actions'); // exclude actions column by default
}

export function generateJson(items = []) {
  return JSON.stringify(items || [], null, 2);
}

export function generateCsv(items = [], headersOrFields = []) {
  const fields = normalizeFields(headersOrFields);
  const headerRow = fields.map(f => `"${String(f.label).replace(/"/g, '""')}"`).join(',');

  const rows = (items || []).map(item =>
    fields
      .map(f => {
        let v = item && item[f.key] !== undefined && item[f.key] !== null ? String(item[f.key]) : '';
        v = v.replace(/"/g, '""');
        return `"${v}"`;
      })
      .join(',')
  );

  return [headerRow].concat(rows).join('\r\n');
}

export function generateXml(items = [], headersOrFields = [], options = {}) {
  const { rootName = 'items', itemName = 'item' } = options;
  const fields = normalizeFields(headersOrFields);

  const escapeXml = str => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n`;
  (items || []).forEach(item => {
    xml += `  <${itemName}>\n`;
    fields.forEach(f => {
      const tag = f.key || 'field';
      xml += `    <${tag}>${escapeXml(item && item[f.key])}</${tag}>\n`;
    });
    xml += `  </${itemName}>\n`;
  });
  xml += `</${rootName}>`;
  return xml;
}

export function triggerDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Convenience helpers
export function exportAsJson(items, filename = 'export.json') {
  const content = generateJson(items);
  triggerDownload(filename, content, 'application/json;charset=utf-8');
}

export function exportAsCsv(items, headersOrFields = [], filename = 'export.csv') {
  const content = generateCsv(items, headersOrFields);
  triggerDownload(filename, content, 'text/csv;charset=utf-8');
}

export function exportAsXml(items, headersOrFields = [], filename = 'export.xml', options = {}) {
  const content = generateXml(items, headersOrFields, options);
  triggerDownload(filename, content, 'application/xml;charset=utf-8');
}

export default {
  normalizeFields,
  generateJson,
  generateCsv,
  generateXml,
  triggerDownload,
  exportAsJson,
  exportAsCsv,
  exportAsXml,
};
