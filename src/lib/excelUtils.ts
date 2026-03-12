import type { WorkSheet } from "xlsx";

/**
 * Auto-fit column widths based on content.
 * Call after creating the worksheet with XLSX.utils.json_to_sheet.
 */
export function autoFitColumns(ws: WorkSheet, data: Record<string, unknown>[]): void {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  ws["!cols"] = keys.map((key) => {
    let maxLen = key.length;
    for (const row of data) {
      const val = row[key];
      const len = val != null ? String(val).length : 0;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(maxLen + 2, 60) };
  });
}
