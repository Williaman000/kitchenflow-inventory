import { useState, useRef, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { COLORS } from '../constants/theme';
import type { BulkImportResult } from '../types';
import type { BulkMaterialItem } from '../services/inventoryApi';

interface Props {
	onClose: () => void;
	onImport: (items: BulkMaterialItem[]) => Promise<BulkImportResult>;
	onComplete: () => void;
}

interface ParsedRow {
	name: string;
	unit: string;
	category: string;
	currentStock: number;
	minimumStock: number;
	valid: boolean;
	error?: string;
}

// CSV/XLSX 헤더 매핑 (한글 + 영어)
const HEADER_MAP: Record<string, keyof ParsedRow> = {
	'재료명': 'name',
	'name': 'name',
	'단위': 'unit',
	'unit': 'unit',
	'카테고리': 'category',
	'category': 'category',
	'현재재고': 'currentStock',
	'current_stock': 'currentStock',
	'currentstock': 'currentStock',
	'최소재고': 'minimumStock',
	'minimum_stock': 'minimumStock',
	'minimumstock': 'minimumStock',
};

function parseRawRows(rawRows: Record<string, string>[]): ParsedRow[] {
	return rawRows.map((raw) => {
		const mapped: Partial<ParsedRow> = {};

		for (const [key, value] of Object.entries(raw)) {
			const normalizedKey = key.trim().toLowerCase();
			const field = HEADER_MAP[normalizedKey];
			if (field) {
				if (field === 'currentStock' || field === 'minimumStock') {
					(mapped as Record<string, unknown>)[field] = parseFloat(value) || 0;
				} else {
					(mapped as Record<string, unknown>)[field] = value?.trim() ?? '';
				}
			}
		}

		const name = (mapped.name as string) ?? '';
		const unit = (mapped.unit as string) ?? '';
		const valid = name.length > 0 && unit.length > 0;

		return {
			name,
			unit,
			category: (mapped.category as string) || '기타',
			currentStock: (mapped.currentStock as number) ?? 0,
			minimumStock: (mapped.minimumStock as number) ?? 0,
			valid,
			error: !name ? '재료명 필수' : !unit ? '단위 필수' : undefined,
		};
	});
}

const CSV_TEMPLATE = '재료명,단위,카테고리,현재재고,최소재고\n닭고기,kg,육류,50,20\n식용유,L,유지류,30,10\n양념소스,L,소스류,15,5';

const BulkImportModal: FC<Props> = ({ onClose, onImport, onComplete }) => {
	const { t } = useTranslation();
	const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
	const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
	const [fileName, setFileName] = useState('');
	const [isImporting, setIsImporting] = useState(false);
	const [result, setResult] = useState<BulkImportResult | null>(null);
	const [parseError, setParseError] = useState<string | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const processFile = useCallback((file: File) => {
		setParseError(null);
		setFileName(file.name);
		const ext = file.name.split('.').pop()?.toLowerCase();

		if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
			Papa.parse<Record<string, string>>(file, {
				header: true,
				skipEmptyLines: true,
				complete: (results) => {
					if (results.data.length === 0) {
						setParseError(t('bulkImport.errorNoData'));
						return;
					}
					const rows = parseRawRows(results.data);
					setParsedRows(rows);
					setStep('preview');
				},
				error: () => {
					setParseError(t('bulkImport.errorCsv'));
				},
			});
		} else if (ext === 'xlsx' || ext === 'xls') {
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const data = new Uint8Array(e.target?.result as ArrayBuffer);
					const workbook = XLSX.read(data, { type: 'array' });
					const sheet = workbook.Sheets[workbook.SheetNames[0]];
					const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
					if (jsonData.length === 0) {
						setParseError(t('bulkImport.errorNoDataXlsx'));
						return;
					}
					const rows = parseRawRows(jsonData);
					setParsedRows(rows);
					setStep('preview');
				} catch {
					setParseError(t('bulkImport.errorXlsx'));
				}
			};
			reader.readAsArrayBuffer(file);
		} else {
			setParseError(t('bulkImport.errorFormat'));
		}
	}, []);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) processFile(file);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file) processFile(file);
	};

	const handleImport = async () => {
		const validRows = parsedRows.filter((r) => r.valid);
		if (validRows.length === 0) return;

		setIsImporting(true);
		try {
			const items: BulkMaterialItem[] = validRows.map((r) => ({
				name: r.name,
				unit: r.unit,
				category: r.category,
				current_stock: r.currentStock,
				minimum_stock: r.minimumStock,
			}));
			const res = await onImport(items);
			setResult(res);
			setStep('result');
		} catch {
			setParseError(t('bulkImport.errorServer'));
		} finally {
			setIsImporting(false);
		}
	};

	const handleDownloadTemplate = () => {
		const blob = new Blob(['\uFEFF' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'materials_template.csv';
		a.click();
		URL.revokeObjectURL(url);
	};

	const validCount = parsedRows.filter((r) => r.valid).length;
	const invalidCount = parsedRows.filter((r) => !r.valid).length;

	return (
		<div style={styles.overlay} onClick={onClose}>
			<div style={styles.modal} onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div style={styles.modalHeader}>
					<h3 style={styles.modalTitle}>
						{step === 'upload' && t('bulkImport.titleUpload')}
						{step === 'preview' && t('bulkImport.titlePreview')}
						{step === 'result' && t('bulkImport.titleResult')}
					</h3>
					<button style={styles.closeBtn} onClick={onClose}>&times;</button>
				</div>

				{/* Upload Step */}
				{step === 'upload' && (
					<div>
						<div
							style={{
								...styles.dropZone,
								borderColor: isDragOver ? COLORS.primary : COLORS.borderInput,
								backgroundColor: isDragOver ? '#E3F2FD' : COLORS.backgroundLight,
							}}
							onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
							onDragLeave={() => setIsDragOver(false)}
							onDrop={handleDrop}
							onClick={() => fileInputRef.current?.click()}
						>
							<div style={{ fontSize: 40, marginBottom: 8 }}>&#128196;</div>
							<p style={{ margin: 0, fontWeight: 600, color: COLORS.text }}>
								{t('bulkImport.dropText')}
							</p>
							<p style={{ margin: '8px 0 0', fontSize: 13, color: COLORS.textMuted }}>
								{t('bulkImport.dropHint')}
							</p>
							<input
								ref={fileInputRef}
								type="file"
								accept=".csv,.xlsx,.xls,.tsv,.txt"
								onChange={handleFileChange}
								style={{ display: 'none' }}
							/>
						</div>

						{parseError && (
							<div style={styles.errorBanner}>{parseError}</div>
						)}

						<div style={styles.templateSection}>
							<p style={{ margin: '0 0 8px', fontSize: 13, color: COLORS.textLight }}>
								{t('bulkImport.templateHint')}
							</p>
							<button style={styles.templateBtn} onClick={handleDownloadTemplate}>
								{t('bulkImport.templateBtn')}
							</button>
						</div>

						<div style={styles.helpSection}>
							<p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: COLORS.textLight }}>
								{t('bulkImport.requiredCols')}
							</p>
							<p style={{ margin: '4px 0 0', fontSize: 12, color: COLORS.textMuted }}>
								{t('bulkImport.requiredInfo')}
							</p>
						</div>
					</div>
				)}

				{/* Preview Step */}
				{step === 'preview' && (
					<div>
						<div style={styles.previewInfo}>
							<span style={{ fontSize: 13, color: COLORS.textLight }}>
								{fileName} &mdash; 총 <strong>{parsedRows.length}</strong>행
							</span>
							<div style={{ display: 'flex', gap: 8 }}>
								{validCount > 0 && (
									<span style={{ ...styles.badge, backgroundColor: '#E8F5E9', color: COLORS.success }}>
										{t('bulkImport.validBadge', { count: validCount })}
									</span>
								)}
								{invalidCount > 0 && (
									<span style={{ ...styles.badge, backgroundColor: '#FFEBEE', color: COLORS.danger }}>
										{t('bulkImport.invalidBadge', { count: invalidCount })}
									</span>
								)}
							</div>
						</div>

						<div style={styles.previewTableWrap}>
							<table style={styles.table}>
								<thead>
									<tr>
										<th style={styles.th}>{t('bulkImport.colRow')}</th>
										<th style={styles.th}>{t('bulkImport.colName')}</th>
										<th style={styles.th}>{t('bulkImport.colUnit')}</th>
										<th style={styles.th}>{t('bulkImport.colCategory')}</th>
										<th style={{ ...styles.th, textAlign: 'right' }}>{t('bulkImport.colCurrentStock')}</th>
										<th style={{ ...styles.th, textAlign: 'right' }}>{t('bulkImport.colMinStock')}</th>
										<th style={{ ...styles.th, textAlign: 'center' }}>{t('bulkImport.colStatus')}</th>
									</tr>
								</thead>
								<tbody>
									{parsedRows.map((row, i) => (
										<tr key={i} style={row.valid ? undefined : { backgroundColor: '#FFF5F5' }}>
											<td style={{ ...styles.td, color: COLORS.textMuted }}>{i + 1}</td>
											<td style={styles.td}>{row.name || <span style={{ color: COLORS.danger }}>-</span>}</td>
											<td style={styles.td}>{row.unit || <span style={{ color: COLORS.danger }}>-</span>}</td>
											<td style={styles.td}>{row.category}</td>
											<td style={{ ...styles.td, textAlign: 'right' }}>{row.currentStock}</td>
											<td style={{ ...styles.td, textAlign: 'right' }}>{row.minimumStock}</td>
											<td style={{ ...styles.td, textAlign: 'center' }}>
												{row.valid ? (
													<span style={{ color: COLORS.success, fontWeight: 700, fontSize: 12 }}>{t('bulkImport.statusOk')}</span>
												) : (
													<span style={{ color: COLORS.danger, fontSize: 12 }}>{row.error}</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div style={styles.previewActions}>
							<button style={styles.cancelBtn} onClick={() => { setStep('upload'); setParsedRows([]); }}>
								{t('bulkImport.reselect')}
							</button>
							<button
								style={{ ...styles.importBtn, opacity: validCount === 0 || isImporting ? 0.5 : 1 }}
								onClick={handleImport}
								disabled={validCount === 0 || isImporting}
							>
								{isImporting ? t('bulkImport.importing') : t('bulkImport.importBtn', { count: validCount })}
							</button>
						</div>
					</div>
				)}

				{/* Result Step */}
				{step === 'result' && result && (
					<div>
						<div style={styles.resultSummary}>
							<div style={styles.resultCard}>
								<div style={{ fontSize: 28, fontWeight: 800, color: COLORS.success }}>{result.imported}</div>
								<div style={{ fontSize: 13, color: COLORS.textMuted }}>{t('bulkImport.resultImported')}</div>
							</div>
							{result.skipped > 0 && (
								<div style={styles.resultCard}>
									<div style={{ fontSize: 28, fontWeight: 800, color: COLORS.warning }}>{result.skipped}</div>
									<div style={{ fontSize: 13, color: COLORS.textMuted }}>{t('bulkImport.resultSkipped')}</div>
								</div>
							)}
						</div>

						{result.errors.length > 0 && (
							<div style={styles.errorList}>
								<p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: COLORS.danger }}>
									{t('bulkImport.resultErrors', { count: result.errors.length })}
								</p>
								{result.errors.map((err, i) => (
									<div key={i} style={styles.errorItem}>
										<span style={{ fontWeight: 700, color: COLORS.textMuted }}>{t('bulkImport.resultRow', { row: err.row })}</span>
										<span style={{ color: COLORS.danger }}>{err.message}</span>
									</div>
								))}
							</div>
						)}

						<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
							<button style={styles.importBtn} onClick={() => { onComplete(); onClose(); }}>
								{t('bulkImport.confirm')}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

const styles: Record<string, React.CSSProperties> = {
	overlay: {
		position: 'fixed',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0.5)',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1000,
	},
	modal: {
		backgroundColor: COLORS.white,
		borderRadius: 12,
		padding: 0,
		width: '90%',
		maxWidth: 700,
		maxHeight: '85vh',
		display: 'flex',
		flexDirection: 'column',
	},
	modalHeader: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: '20px 24px 16px',
		borderBottom: `1px solid ${COLORS.border}`,
	},
	modalTitle: {
		margin: 0,
		fontSize: 18,
		fontWeight: 700,
		color: COLORS.text,
	},
	closeBtn: {
		background: 'none',
		border: 'none',
		fontSize: 24,
		color: COLORS.textMuted,
		cursor: 'pointer',
		padding: '0 4px',
		lineHeight: 1,
	},
	dropZone: {
		margin: '20px 24px 0',
		padding: '40px 20px',
		border: '2px dashed',
		borderRadius: 12,
		textAlign: 'center' as const,
		cursor: 'pointer',
		transition: 'all 0.2s',
	},
	errorBanner: {
		margin: '12px 24px 0',
		padding: '10px 14px',
		backgroundColor: '#FFEBEE',
		color: COLORS.danger,
		borderRadius: 8,
		fontSize: 13,
		fontWeight: 600,
	},
	templateSection: {
		margin: '20px 24px 0',
		padding: '16px',
		backgroundColor: COLORS.backgroundLight,
		borderRadius: 8,
	},
	templateBtn: {
		padding: '8px 16px',
		border: `1px solid ${COLORS.primary}`,
		borderRadius: 6,
		backgroundColor: COLORS.white,
		color: COLORS.primary,
		fontSize: 13,
		fontWeight: 700,
		cursor: 'pointer',
	},
	helpSection: {
		margin: '16px 24px 24px',
		padding: '12px 16px',
		backgroundColor: '#E3F2FD',
		borderRadius: 8,
	},
	previewInfo: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: '16px 24px',
	},
	badge: {
		padding: '4px 10px',
		borderRadius: 12,
		fontSize: 12,
		fontWeight: 700,
	},
	previewTableWrap: {
		margin: '0 24px',
		maxHeight: '40vh',
		overflow: 'auto',
		border: `1px solid ${COLORS.border}`,
		borderRadius: 8,
	},
	table: {
		width: '100%',
		borderCollapse: 'collapse' as const,
	},
	th: {
		padding: '10px 12px',
		fontSize: 12,
		fontWeight: 700,
		color: COLORS.textMuted,
		borderBottom: `2px solid ${COLORS.borderDark}`,
		textAlign: 'left' as const,
		backgroundColor: COLORS.backgroundLight,
		whiteSpace: 'nowrap' as const,
		position: 'sticky' as const,
		top: 0,
	},
	td: {
		padding: '8px 12px',
		fontSize: 13,
		color: COLORS.text,
		borderBottom: `1px solid ${COLORS.border}`,
	},
	previewActions: {
		display: 'flex',
		justifyContent: 'flex-end',
		gap: 10,
		padding: '16px 24px 24px',
	},
	cancelBtn: {
		padding: '10px 20px',
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 8,
		backgroundColor: COLORS.white,
		fontSize: 14,
		fontWeight: 600,
		cursor: 'pointer',
		color: COLORS.textLight,
	},
	importBtn: {
		padding: '10px 24px',
		border: 'none',
		borderRadius: 8,
		backgroundColor: COLORS.primary,
		color: COLORS.white,
		fontSize: 14,
		fontWeight: 700,
		cursor: 'pointer',
	},
	resultSummary: {
		display: 'flex',
		gap: 20,
		justifyContent: 'center',
		padding: '24px',
	},
	resultCard: {
		textAlign: 'center' as const,
		padding: '20px 32px',
		backgroundColor: COLORS.backgroundLight,
		borderRadius: 12,
	},
	errorList: {
		margin: '0 24px',
		padding: '12px 16px',
		backgroundColor: '#FFF5F5',
		borderRadius: 8,
		maxHeight: 200,
		overflow: 'auto',
	},
	errorItem: {
		display: 'flex',
		gap: 12,
		padding: '6px 0',
		fontSize: 13,
		borderBottom: `1px solid ${COLORS.border}`,
	},
};

export default BulkImportModal;
