import * as XLSX from 'xlsx';

type CellValue = string | number | boolean | null | undefined;

/**
 * Download data as an Excel (.xlsx) file.
 * @param filename - File name including .xlsx extension
 * @param sheetName - Name of the worksheet
 * @param headers - Column header labels
 * @param rows - 2D array of cell values
 */
export function downloadExcel(
	filename: string,
	sheetName: string,
	headers: string[],
	rows: CellValue[][],
): void {
	const data = [headers, ...rows];
	const ws = XLSX.utils.aoa_to_sheet(data);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, sheetName);
	XLSX.writeFile(wb, filename);
}

/**
 * Download data with multiple sheets as an Excel (.xlsx) file.
 * @param filename - File name including .xlsx extension
 * @param sheets - Array of { name, headers, rows }
 */
export function downloadExcelMultiSheet(
	filename: string,
	sheets: { name: string; headers: string[]; rows: CellValue[][] }[],
): void {
	const wb = XLSX.utils.book_new();
	for (const sheet of sheets) {
		const data = [sheet.headers, ...sheet.rows];
		const ws = XLSX.utils.aoa_to_sheet(data);
		XLSX.utils.book_append_sheet(wb, ws, sheet.name);
	}
	XLSX.writeFile(wb, filename);
}
