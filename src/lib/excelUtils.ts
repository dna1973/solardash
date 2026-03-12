import type { WorkSheet } from "xlsx-js-style";

/**
 * Auto-fit column widths and bold header row.
 * Call after creating the worksheet with XLSX.utils.json_to_sheet.
 */
export function autoFitColumns(ws: WorkSheet, data: Record<string, unknown>[]): void {
  if (!data.length) return;
  const keys = Object.keys(data[0]);

  // Auto-fit widths
  ws["!cols"] = keys.map((key) => {
    let maxLen = key.length;
    for (const row of data) {
      const val = row[key];
      const len = val != null ? String(val).length : 0;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(maxLen + 2, 60) };
  });

  // Bold header cells
  keys.forEach((_, colIdx) => {
    const cellRef = cellAddress(0, colIdx);
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true },
      };
    }
  });
}

function cellAddress(row: number, col: number): string {
  let letter = "";
  let c = col;
  while (c >= 0) {
    letter = String.fromCharCode(65 + (c % 26)) + letter;
    c = Math.floor(c / 26) - 1;
  }
  return `${letter}${row + 1}`;
}
