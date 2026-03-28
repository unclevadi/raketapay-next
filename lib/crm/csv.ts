/** Prostoj CSV (RFC-style: polja v kavychkah, kavychki udvajutsja). */

export function escapeCsvCell(v: string) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(headers: string[], rows: string[][]) {
  const head = headers.map(escapeCsvCell).join(",");
  const body = rows.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n");
  return `${head}\r\n${body}\r\n`;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
