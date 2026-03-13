import { useState, useRef, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { COLORS } from '../constants/theme';
import type { SalesUploadResult } from '../types';
import { uploadSalesData, type SalesUploadItemPayload } from '../services/inventoryAiApi';

interface Props {
	onClose: () => void;
	onComplete: () => void;
}

interface ParsedRow {
	saleDate: string;
	productName: string;
	quantity: number;
	revenue: number;
	unitPrice: number;
	category: string;
	orderNumber: string;
	valid: boolean;
	error?: string;
}

const HEADER_MAP: Record<string, keyof ParsedRow> = {
	'날짜': 'saleDate',
	'일자': 'saleDate',
	'판매일': 'saleDate',
	'sale_date': 'saleDate',
	'date': 'saleDate',
	'상품명': 'productName',
	'메뉴명': 'productName',
	'메뉴': 'productName',
	'product_name': 'productName',
	'product': 'productName',
	'수량': 'quantity',
	'판매수량': 'quantity',
	'quantity': 'quantity',
	'qty': 'quantity',
	'매출': 'revenue',
	'매출액': 'revenue',
	'금액': 'revenue',
	'revenue': 'revenue',
	'amount': 'revenue',
	'단가': 'unitPrice',
	'unit_price': 'unitPrice',
	'price': 'unitPrice',
	'카테고리': 'category',
	'분류': 'category',
	'category': 'category',
	'주문번호': 'orderNumber',
	'order_number': 'orderNumber',
	'order': 'orderNumber',
};

function parseDateValue(val: unknown): string {
	if (val == null || val === '') return '';
	const s = String(val).trim();
	// Excel serial date number
	if (/^\d{5}(\.\d+)?$/.test(s)) {
		const serial = parseFloat(s);
		const utcDays = serial - 25569;
		const d = new Date(utcDays * 86400000);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}
	// Try common date formats
	for (const sep of ['/', '-', '.']) {
		const parts = s.split(sep);
		if (parts.length === 3) {
			const [a, b, c] = parts.map((p) => p.trim());
			if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
			if (c.length === 4) return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
		}
	}
	return s;
}

function parseRawRows(rawRows: Record<string, string>[]): ParsedRow[] {
	return rawRows.map((raw) => {
		const mapped: Partial<ParsedRow> = {};

		for (const [key, value] of Object.entries(raw)) {
			const normalizedKey = key.trim().toLowerCase();
			const field = HEADER_MAP[normalizedKey];
			if (field) {
				if (field === 'saleDate') {
					mapped.saleDate = parseDateValue(value);
				} else if (field === 'quantity' || field === 'revenue' || field === 'unitPrice') {
					(mapped as Record<string, unknown>)[field] = parseInt(String(value).replace(/[,\s]/g, ''), 10) || 0;
				} else {
					(mapped as Record<string, unknown>)[field] = String(value ?? '').trim();
				}
			}
		}

		const saleDate = mapped.saleDate ?? '';
		const productName = mapped.productName ?? '';
		const quantity = (mapped.quantity as number) ?? 0;

		const errors: string[] = [];
		if (!saleDate) errors.push('날짜 필수');
		if (!productName) errors.push('상품명 필수');
		if (quantity <= 0) errors.push('수량 > 0');
		const valid = errors.length === 0;

		return {
			saleDate,
			productName,
			quantity,
			revenue: (mapped.revenue as number) ?? 0,
			unitPrice: (mapped.unitPrice as number) ?? 0,
			category: (mapped.category as string) || '',
			orderNumber: (mapped.orderNumber as string) || '',
			valid,
			error: errors.length > 0 ? errors.join(', ') : undefined,
		};
	});
}

const CSV_TEMPLATE = '날짜,상품명,수량,매출액,단가,카테고리,주문번호\n2026-03-01,양념치킨,5,90000,18000,치킨,ORD-001\n2026-03-01,후라이드,3,48000,16000,치킨,ORD-002';

const SalesUploadModal: FC<Props> = ({ onClose, onComplete }) => {
	const { t } = useTranslation();
	const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
	const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
	const [fileName, setFileName] = useState('');
	const [isUploading, setIsUploading] = useState(false);
	const [result, setResult] = useState<SalesUploadResult | null>(null);
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
						setParseError(t('salesUpload.errorNoData'));
						return;
					}
					setParsedRows(parseRawRows(results.data));
					setStep('preview');
				},
				error: () => {
					setParseError(t('salesUpload.errorCsv'));
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
						setParseError(t('salesUpload.errorNoDataXlsx'));
						return;
					}
					setParsedRows(parseRawRows(jsonData));
					setStep('preview');
				} catch {
					setParseError(t('salesUpload.errorXlsx'));
				}
			};
			reader.readAsArrayBuffer(file);
		} else {
			setParseError(t('salesUpload.errorFormat'));
		}
	}, [t]);

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

	const handleUpload = async () => {
		const validRows = parsedRows.filter((r) => r.valid);
		if (validRows.length === 0) return;

		setIsUploading(true);
		try {
			const items: SalesUploadItemPayload[] = validRows.map((r) => ({
				sale_date: r.saleDate,
				product_name: r.productName,
				quantity: r.quantity,
				revenue: r.revenue,
				unit_price: r.unitPrice,
				category: r.category || null,
				order_number: r.orderNumber || null,
			}));
			const res = await uploadSalesData(fileName, items);
			setResult(res);
			setStep('result');
		} catch {
			setParseError(t('salesUpload.errorServer'));
		} finally {
			setIsUploading(false);
		}
	};

	const handleDownloadTemplate = () => {
		const blob = new Blob(['\uFEFF' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'sales_template.csv';
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
						{step === 'upload' && t('salesUpload.titleUpload')}
						{step === 'preview' && t('salesUpload.titlePreview')}
						{step === 'result' && t('salesUpload.titleResult')}
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
							<div style={{ fontSize: 40, marginBottom: 8 }}>&#128200;</div>
							<p style={{ margin: 0, fontWeight: 600, color: COLORS.text }}>
								{t('salesUpload.dropText')}
							</p>
							<p style={{ margin: '8px 0 0', fontSize: 13, color: COLORS.textMuted }}>
								{t('salesUpload.dropHint')}
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
								{t('salesUpload.templateHint')}
							</p>
							<button style={styles.templateBtn} onClick={handleDownloadTemplate}>
								{t('salesUpload.templateBtn')}
							</button>
						</div>

						<div style={styles.helpSection}>
							<p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: COLORS.textLight }}>
								{t('salesUpload.requiredCols')}
							</p>
							<p style={{ margin: '4px 0 0', fontSize: 12, color: COLORS.textMuted }}>
								{t('salesUpload.requiredInfo')}
							</p>
						</div>
					</div>
				)}

				{/* Preview Step */}
				{step === 'preview' && (
					<div>
						<div style={styles.previewInfo}>
							<span style={{ fontSize: 13, color: COLORS.textLight }}>
								{fileName} &mdash; {parsedRows.length}행
							</span>
							<div style={{ display: 'flex', gap: 8 }}>
								{validCount > 0 && (
									<span style={{ ...styles.badge, backgroundColor: '#E8F5E9', color: COLORS.success }}>
										{t('salesUpload.validBadge', { count: validCount })}
									</span>
								)}
								{invalidCount > 0 && (
									<span style={{ ...styles.badge, backgroundColor: '#FFEBEE', color: COLORS.danger }}>
										{t('salesUpload.invalidBadge', { count: invalidCount })}
									</span>
								)}
							</div>
						</div>

						<div style={styles.previewTableWrap}>
							<table style={styles.table}>
								<thead>
									<tr>
										<th style={styles.th}>{t('salesUpload.colRow')}</th>
										<th style={styles.th}>{t('salesUpload.colDate')}</th>
										<th style={styles.th}>{t('salesUpload.colProduct')}</th>
										<th style={{ ...styles.th, textAlign: 'right' }}>{t('salesUpload.colQuantity')}</th>
										<th style={{ ...styles.th, textAlign: 'right' }}>{t('salesUpload.colRevenue')}</th>
										<th style={{ ...styles.th, textAlign: 'right' }}>{t('salesUpload.colUnitPrice')}</th>
										<th style={styles.th}>{t('salesUpload.colCategory')}</th>
										<th style={{ ...styles.th, textAlign: 'center' }}>{t('salesUpload.colStatus')}</th>
									</tr>
								</thead>
								<tbody>
									{parsedRows.map((row, i) => (
										<tr key={i} style={row.valid ? undefined : { backgroundColor: '#FFF5F5' }}>
											<td style={{ ...styles.td, color: COLORS.textMuted }}>{i + 1}</td>
											<td style={styles.td}>{row.saleDate || <span style={{ color: COLORS.danger }}>-</span>}</td>
											<td style={styles.td}>{row.productName || <span style={{ color: COLORS.danger }}>-</span>}</td>
											<td style={{ ...styles.td, textAlign: 'right' }}>{row.quantity}</td>
											<td style={{ ...styles.td, textAlign: 'right' }}>{row.revenue.toLocaleString()}</td>
											<td style={{ ...styles.td, textAlign: 'right' }}>{row.unitPrice.toLocaleString()}</td>
											<td style={styles.td}>{row.category}</td>
											<td style={{ ...styles.td, textAlign: 'center' }}>
												{row.valid ? (
													<span style={{ color: COLORS.success, fontWeight: 700, fontSize: 12 }}>{t('salesUpload.statusOk')}</span>
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
								{t('salesUpload.reselect')}
							</button>
							<button
								style={{ ...styles.uploadBtn, opacity: validCount === 0 || isUploading ? 0.5 : 1 }}
								onClick={handleUpload}
								disabled={validCount === 0 || isUploading}
							>
								{isUploading ? t('salesUpload.uploading') : t('salesUpload.uploadBtn', { count: validCount })}
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
								<div style={{ fontSize: 13, color: COLORS.textMuted }}>{t('salesUpload.resultImported')}</div>
							</div>
							{result.matchedProducts > 0 && (
								<div style={styles.resultCard}>
									<div style={{ fontSize: 28, fontWeight: 800, color: COLORS.primary }}>{result.matchedProducts}</div>
									<div style={{ fontSize: 13, color: COLORS.textMuted }}>{t('salesUpload.resultMatched')}</div>
								</div>
							)}
							{result.skipped > 0 && (
								<div style={styles.resultCard}>
									<div style={{ fontSize: 28, fontWeight: 800, color: COLORS.warning }}>{result.skipped}</div>
									<div style={{ fontSize: 13, color: COLORS.textMuted }}>{t('salesUpload.resultSkipped')}</div>
								</div>
							)}
						</div>

						{result.errors.length > 0 && (
							<div style={styles.errorList}>
								<p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: COLORS.danger }}>
									{t('salesUpload.resultErrors', { count: result.errors.length })}
								</p>
								{result.errors.map((err, i) => (
									<div key={i} style={styles.errorItem}>
										<span style={{ fontWeight: 700, color: COLORS.textMuted }}>{t('salesUpload.resultRow', { row: err.row })}</span>
										<span style={{ color: COLORS.danger }}>{err.message}</span>
									</div>
								))}
							</div>
						)}

						<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, padding: '0 24px 24px' }}>
							<button style={styles.uploadBtn} onClick={() => { onComplete(); onClose(); }}>
								{t('salesUpload.confirm')}
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
		maxWidth: 800,
		maxHeight: '85vh',
		display: 'flex',
		flexDirection: 'column',
		overflow: 'hidden',
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
	uploadBtn: {
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

export default SalesUploadModal;
