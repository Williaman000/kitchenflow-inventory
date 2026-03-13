import { useState, useRef, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { COLORS } from '../constants/theme';
import type { BulkImportResult } from '../types';
import type { BulkMaterialItem } from '../services/inventoryApi';
import styles from './BulkImportModal.module.scss';

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
		<div className={styles.overlay} onClick={onClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className={styles.modalHeader}>
					<h3 className={styles.modalTitle}>
						{step === 'upload' && t('bulkImport.titleUpload')}
						{step === 'preview' && t('bulkImport.titlePreview')}
						{step === 'result' && t('bulkImport.titleResult')}
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
							<div className={styles.dropZoneIcon}>&#128196;</div>
							<p className={styles.dropZoneText}>
								{t('bulkImport.dropText')}
							</p>
							<p className={styles.dropZoneHint}>
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
							<div className={styles.errorBanner}>{parseError}</div>
						)}

						<div className={styles.templateSection}>
							<p className={styles.templateHint}>
								{t('bulkImport.templateHint')}
							</p>
							<button className={styles.templateBtn} onClick={handleDownloadTemplate}>
								{t('bulkImport.templateBtn')}
							</button>
						</div>

						<div className={styles.helpSection}>
							<p className={styles.helpTitle}>
								{t('bulkImport.requiredCols')}
							</p>
							<p className={styles.helpInfo}>
								{t('bulkImport.requiredInfo')}
							</p>
						</div>
					</div>
				)}

				{/* Preview Step */}
				{step === 'preview' && (
					<div>
						<div className={styles.previewInfo}>
							<span className={styles.previewInfoText}>
								{fileName} &mdash; 총 <strong>{parsedRows.length}</strong>행
							</span>
							<div className={styles.badgeGroup}>
								{validCount > 0 && (
									<span className={`${styles.badge} ${styles.badgeValid}`}>
										{t('bulkImport.validBadge', { count: validCount })}
									</span>
								)}
								{invalidCount > 0 && (
									<span className={`${styles.badge} ${styles.badgeInvalid}`}>
										{t('bulkImport.invalidBadge', { count: invalidCount })}
									</span>
								)}
							</div>
						</div>

						<div className={styles.previewTableWrap}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th className={styles.th}>{t('bulkImport.colRow')}</th>
										<th className={styles.th}>{t('bulkImport.colName')}</th>
										<th className={styles.th}>{t('bulkImport.colUnit')}</th>
										<th className={styles.th}>{t('bulkImport.colCategory')}</th>
										<th className={styles.th} style={{ textAlign: 'right' }}>{t('bulkImport.colCurrentStock')}</th>
										<th className={styles.th} style={{ textAlign: 'right' }}>{t('bulkImport.colMinStock')}</th>
										<th className={styles.th} style={{ textAlign: 'center' }}>{t('bulkImport.colStatus')}</th>
									</tr>
								</thead>
								<tbody>
									{parsedRows.map((row, i) => (
										<tr key={i} className={row.valid ? undefined : styles.invalidRow}>
											<td className={styles.tdMuted}>{i + 1}</td>
											<td className={styles.td}>{row.name || <span className={styles.dangerText}>-</span>}</td>
											<td className={styles.td}>{row.unit || <span className={styles.dangerText}>-</span>}</td>
											<td className={styles.td}>{row.category}</td>
											<td className={styles.td} style={{ textAlign: 'right' }}>{row.currentStock}</td>
											<td className={styles.td} style={{ textAlign: 'right' }}>{row.minimumStock}</td>
											<td className={styles.tdCenter}>
												{row.valid ? (
													<span className={styles.statusOk}>{t('bulkImport.statusOk')}</span>
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
								{t('bulkImport.reselect')}
							</button>
							<button
								className={styles.importBtn}
								style={{ opacity: validCount === 0 || isImporting ? 0.5 : 1 }}
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
						<div className={styles.resultSummary}>
							<div className={styles.resultCard}>
								<div className={styles.resultValueSuccess}>{result.imported}</div>
								<div className={styles.resultLabel}>{t('bulkImport.resultImported')}</div>
							</div>
							{result.skipped > 0 && (
								<div className={styles.resultCard}>
									<div className={styles.resultValueWarning}>{result.skipped}</div>
									<div className={styles.resultLabel}>{t('bulkImport.resultSkipped')}</div>
								</div>
							)}
						</div>

						{result.errors.length > 0 && (
							<div className={styles.errorList}>
								<p className={styles.errorListTitle}>
									{t('bulkImport.resultErrors', { count: result.errors.length })}
								</p>
								{result.errors.map((err, i) => (
									<div key={i} className={styles.errorItem}>
										<span className={styles.errorItemRow}>{t('bulkImport.resultRow', { row: err.row })}</span>
										<span className={styles.errorItemMessage}>{err.message}</span>
									</div>
								))}
							</div>
						)}

						<div className={styles.resultActions}>
							<button className={styles.importBtn} onClick={() => { onComplete(); onClose(); }}>
								{t('bulkImport.confirm')}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default BulkImportModal;
