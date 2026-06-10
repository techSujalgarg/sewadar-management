import * as XLSX from "xlsx";

/**
 * Exports JSON data to a downloadable Excel file (.xlsx)
 */
export function exportToExcel(data: any[], fileName: string) {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    
    // Auto-fit column widths
    const maxLens = data.reduce((acc: any, row: any) => {
      Object.keys(row).forEach((key) => {
        const valStr = String(row[key] ?? "");
        acc[key] = Math.max(acc[key] ?? 10, valStr.length);
      });
      return acc;
    }, {});
    
    worksheet["!cols"] = Object.keys(maxLens).map((key) => ({
      wch: Math.min(maxLens[key] + 3, 50)
    }));

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    return true;
  } catch (err) {
    console.error("Error exporting to Excel:", err);
    return false;
  }
}

/**
 * Helper to read spreadsheet file as JSON array
 */
export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
