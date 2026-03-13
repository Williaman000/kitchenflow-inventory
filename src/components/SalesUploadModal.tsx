import { useState, useRef, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { COLORS } from '../constants/theme';
import type { SalesUploadResult } from '../types';
import { uploadSalesData, type SalesUploadItemPayload } from '../services/inventoryAiApi';
import styles from './SalesUploadModal.module.scss';

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
		<div className={styles.overlay} onClick={onClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className={styles.modalHeader}>
					<h3 className={styles.modalTitle}>
						{step === 'upload' && t('salesUpload.titleUpload')}
						{step === 'preview' && t('salesUpload.titlePreview')}
						{step === 'result' && t('salesUpload.titleResult')}
					</h3>
					<button className={styles.closeBtn} onClick={onClose}>&times;</button>
				</div>

				{/* Upload Step */}
				{step === 'upload' && (
					<div>
						<div
							className={styles.dropZone}
							style={{
								borderColor: isDragOver ? COLORS.primary : COLORS.borderInput,
								backgroundColor: isDragOver ? '#E3F2FD' : COLORS.backgroundLight,
							}}
							onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
							onDragLeave={() => setIsDragOver(false)}
							onDrop={handleDrop}
							onClick={() => fileInputRef.current?.click()}
						>
							<div className={styles.dropZoneIcon}>&#128200;</div>
							<p className={styles.dropZoneText}>
								{t('salesUpload.dropText')}
							</p>
							<p className={styles.dropZoneHint}>
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
							<div className={styles.errorBanner}>{parseError}</div>
						)}

						<div className={styles.templateSection}>
							<p className={styles.templateHint}>
								{t('salesUpload.templateHint')}
							</p>
							<button className={styles.templateBtn} onClick={handleDownloadTemplate}>
								{t('salesUpload.templateBtn')}
							</button>
						</div>

						<div className={styles.helpSection}>
							<p className={styles.helpTitle}>
								{t('salesUpload.requiredCols')}
							</p>
							<p className={styles.helpInfo}>
								{t('salesUpload.requiredInfo')}
							</p>
						</div>
					</div>
				)}

				{/* Preview Step */}
				{step === 'preview' && (
					<div>
						<div className={styles.previewInfo}>
							<span className={styles.previewInfoText}>
								{fileName} &mdash; {parsedRows.length}행
							</span>
							<div className={styles.badgeGroup}>
								{validCount > 0 && (
									<span className={`${styles.badge} ${styles.badgeValid}`}>
										{t('salesUpload.validBadge', { count: validCount })}
									</span>
								)}
								{invalidCount > 0 && (
									<span className={`${styles.badge} ${styles.badgeInvalid}`}>
										{t('salesUpload.invalidBadge', { count: invalidCount })}
									</span>
								)}
							</div>
						</div>

						<div className={styles.previewTableWrap}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th className={styles.th}>{t('salesUpload.colRow')}</th>
										<th className={styles.th}>{t('salesUpload.colDate')}</th>
										<th className={styles.th}>{t('salesUpload.colProduct')}</th>
										<th className={styles.th} style={{ textAlign: 'right' }}>{t('salesUpload.colQuantity')}</th>
										<th className={styles.th} style={{ textAlign: 'right' }}>{t('salesUpload.colRevenue')}</th>
										<th className={styles.th} style={{ textAlign: 'right' }}>{t('salesUpload.colUnitPrice')}</th>
										<th className={styles.th}>{t('salesUpload.colCategory')}</th>
										<th className={styles.th} style={{ textAlign: 'center' }}>{t('salesUpload.colStatus')}</th>
									</tr>
								</thead>
								<tbody>
									{parsedRows.map((row, i) => (
										<tr key={i} className={row.valid ? undefined : styles.invalidRow}>
											<td className={styles.tdMuted}>{i + 1}</td>
											<td className={styles.td}>{row.saleDate || <span className={styles.dangerText}>-</span>}</td>
											<td className={styles.td}>{row.productName || <span className={styles.dangerText}>-</span>}</td>
											<td className={styles.td} style={{ textAlign: 'right' }}>{row.quantity}</td>
											<td className={styles.td} style={{ textAlign: 'right' }}>{row.revenue.toLocaleString()}</td>
											<td className={styles.td} style={{ textAlign: 'right' }}>{row.unitPrice.toLocaleString()}</td>
											<td className={styles.td}>{row.category}</td>
											<td className={styles.td} style={{ textAlign: 'center' }}>
												{row.valid ? (
													<span className={styles.statusOk}>{t('salesUpload.statusOk')}</span>
												) : (
													<span className={styles.statusError}>{row.error}</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className={styles.previewActions}>
							<button className={styles.cancelBtn} onClick={() => { setStep('upload'); setParsedRows([]); }}>
								{t('salesUpload.reselect')}
							</button>
							<button
								className={styles.uploadBtn}
								style={{ opacity: validCount === 0 || isUploading ? 0.5 : 1 }}
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
						<div className={styles.resultSummary}>
							<div className={styles.resultCard}>
								<div className={styles.resultValueSuccess}>{result.imported}</div>
								<div className={styles.resultLabel}>{t('salesUpload.resultImported')}</div>
							</div>
							{result.matchedProducts > 0 && (
								<div className={styles.resultCard}>
									<div className={styles.resultValuePrimary}>{result.matchedProducts}</div>
									<div className={styles.resultLabel}>{t('salesUpload.resultMatched')}</div>
								</div>
							)}
							{result.skipped > 0 && (
								<div className={styles.resultCard}>
									<div className={styles.resultValueWarning}>{result.skipped}</div>
									<div className={styles.resultLabel}>{t('salesUpload.resultSkipped')}</div>
								</div>
							)}
						</div>

						{result.errors.length > 0 && (
							<div className={styles.errorList}>
								<p className={styles.errorListTitle}>
									{t('salesUpload.resultErrors', { count: result.errors.length })}
								</p>
								{result.errors.map((err, i) => (
									<div key={i} className={styles.errorItem}>
										<span className={styles.errorItemRow}>{t('salesUpload.resultRow', { row: err.row })}</span>
										<span className={styles.errorItemMessage}>{err.message}</span>
									</div>
								))}
							</div>
						)}

						<div className={styles.resultActions}>
							<button className={styles.uploadBtn} onClick={() => { onComplete(); onClose(); }}>
								{t('salesUpload.confirm')}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default SalesUploadModal;
