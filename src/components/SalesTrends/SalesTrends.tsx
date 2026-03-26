import { useState, useMemo, type FC } from 'react';
import {
	LineChart, Line, BarChart, Bar, XAxis, YAxis,
	Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/theme';
import { formatShortCurrency } from '../../utils/format';
import { trProduct, trDayOfWeek } from '../../utils/dbTranslate';
import { formatCurrency } from '../../utils/format';
import type { SalesTrendData, SalesUploadRecord } from '../../types';
import type { TrendPeriod } from '../../hooks/useSalesTrends';
import SalesUploadModal from '../SalesUploadModal/SalesUploadModal';
import { downloadExcelMultiSheet } from '../../utils/exportExcel';
import { useTableSort } from '../../hooks/useTableSort';
import styles from './SalesTrends.module.scss';

function downloadCsv(filename: string, csvContent: string) {
	const bom = '\uFEFF';
	const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

interface Props {
	data: SalesTrendData | null;
	period: TrendPeriod;
	isLoading: boolean;
	error: string | null;
	onPeriodChange: (p: TrendPeriod) => void;
	onRefresh: () => void;
	uploads: SalesUploadRecord[];
	uploadsLoading: boolean;
	onDeleteUpload: (id: number) => void;
}

const SalesTrends: FC<Props> = ({ data, period, isLoading, error, onPeriodChange, onRefresh, uploads, uploadsLoading, onDeleteUpload }) => {
	const { t } = useTranslation();
	const [showUpload, setShowUpload] = useState(false);
	const [activeModal, setActiveModal] = useState<'revenue' | 'chicken' | 'orders' | null>(null);
	const { sorted: sortedUploads, toggleSort, getSortIcon } = useTableSort(uploads);

	const translatedProductRanking = useMemo(() =>
		data?.productRanking.map((p) => ({ ...p, productName: trProduct(p.productName) })) ?? []
	, [data]);

	const translatedDayOfWeek = useMemo(() =>
		data?.dayOfWeekPattern.map((d) => ({ ...d, day: trDayOfWeek(d.day) })) ?? []
	, [data]);

	const handleDownloadCsv = () => {
		if (!data) return;
		const rows: string[] = [];
		// Daily sales
		rows.push(`[${t('trends.chartDaily')}]`);
		rows.push([t('salesUpload.colDate'), t('trends.totalRevenue'), t('trends.totalQuantity'), t('trends.totalOrders')].join(','));
		for (const d of data.dailyBreakdown) {
			rows.push([d.date, d.totalRevenue, d.totalQuantity, d.orderCount].join(','));
		}
		rows.push('');
		// Sales by product
		rows.push(`[${t('trends.chartProduct')}]`);
		rows.push([t('salesUpload.colProduct'), t('trends.totalRevenue'), t('trends.totalQuantity')].join(','));
		for (const p of data.productRanking) {
			rows.push([`"${p.productName}"`, p.totalRevenue, p.totalQuantity].join(','));
		}
		rows.push('');
		// Average by day of week
		rows.push(`[${t('trends.chartDayOfWeek')}]`);
		rows.push([t('trends.chartDayOfWeek'), t('trends.totalRevenue'), t('trends.totalQuantity')].join(','));
		for (const d of data.dayOfWeekPattern) {
			rows.push([d.day, Math.round(d.avgRevenue), Math.round(d.avgQuantity)].join(','));
		}
		const filename = `sales_${data.period}_${data.startDate}_${data.endDate}.csv`;
		downloadCsv(filename, rows.join('\n'));
	};

	const handleDownloadExcel = () => {
		if (!data) return;
		const sheets: { name: string; headers: string[]; rows: (string | number)[][] }[] = [];
		// Daily sales
		sheets.push({
			name: t('trends.chartDaily'),
			headers: [t('salesUpload.colDate'), t('trends.totalRevenue'), t('trends.totalQuantity'), t('trends.totalOrders')],
			rows: data.dailyBreakdown.map((d) => [d.date, d.totalRevenue, d.totalQuantity, d.orderCount]),
		});
		// Sales by product
		sheets.push({
			name: t('trends.chartProduct'),
			headers: [t('salesUpload.colProduct'), t('trends.totalRevenue'), t('trends.totalQuantity')],
			rows: data.productRanking.map((p) => [p.productName, p.totalRevenue, p.totalQuantity]),
		});
		// Average by day of week
		sheets.push({
			name: t('trends.chartDayOfWeek'),
			headers: [t('trends.chartDayOfWeek'), t('trends.totalRevenue'), t('trends.totalQuantity')],
			rows: data.dayOfWeekPattern.map((d) => [d.day, Math.round(d.avgRevenue), Math.round(d.avgQuantity)]),
		});
		const filename = `sales_${data.period}_${data.startDate}_${data.endDate}.xlsx`;
		downloadExcelMultiSheet(filename, sheets);
	};

	const PERIOD_LABELS: Record<TrendPeriod, string> = {
		today: t('trends.periodToday'),
		week: t('trends.periodWeek'),
		month: t('trends.periodMonth'),
	};
	if (isLoading && !data) {
		return (
			<div className={styles.center}>
				<p className={styles.loadingText}>{t('trends.loading')}</p>
			</div>
		);
	}

	if (error && !data) {
		return (
			<div className={styles.center}>
				<p className={styles.errorText}>{error}</p>
				<button className={styles.retryBtn} onClick={onRefresh}>{t('common.retry')}</button>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h2 className={styles.title}>{t('trends.title')}</h2>
				<div className={styles.headerRight}>
					{data && (
						<>
							<button className={styles.downloadBtn} onClick={handleDownloadCsv}>
								CSV {t('trends.download')}
							</button>
							<button className={styles.downloadBtn} onClick={handleDownloadExcel}>
								Excel {t('trends.download')}
							</button>
						</>
					)}
					<button className={styles.uploadTriggerBtn} onClick={() => setShowUpload(true)}>
						CSV/Excel {t('trends.upload')}
					</button>
					<div className={styles.periodRow}>
						{(['today', 'week', 'month'] as TrendPeriod[]).map((p) => (
							<button
								key={p}
								className={period === p ? styles.periodActive : styles.periodBtn}
								onClick={() => onPeriodChange(p)}
							>
								{PERIOD_LABELS[p]}
							</button>
						))}
					</div>
				</div>
			</div>

			{showUpload && (
				<SalesUploadModal
					onClose={() => setShowUpload(false)}
					onComplete={onRefresh}
				/>
			)}

			{data && (
				<>
					{/* Summary cards */}
					<div className={styles.summaryRow}>
						<div className={`${styles.summaryCard} ${styles.clickable}`} onClick={() => setActiveModal('revenue')}>
							<div className={styles.summaryLabel}>{t('trends.totalRevenue')}</div>
							<div className={styles.summaryValue}>{formatCurrency(data.totalRevenue)}</div>
						</div>
						<div className={`${styles.summaryCard} ${styles.clickable}`} onClick={() => setActiveModal('chicken')}>
							<div className={styles.summaryLabel}>{t('trends.totalChicken')}</div>
							<div className={styles.summaryValue}>{data.totalChickenCount.toLocaleString()}{t('trends.unitChicken')}</div>
						</div>
						<div className={`${styles.summaryCard} ${styles.clickable}`} onClick={() => setActiveModal('orders')}>
							<div className={styles.summaryLabel}>{t('trends.totalOrders')}</div>
							<div className={styles.summaryValue}>{data.totalOrders.toLocaleString()}{t('trends.unitOrders')}</div>
						</div>
					</div>

					{/* Section navigation */}
					<div className={styles.sectionNav}>
						<button className={styles.navBtn} onClick={() => document.getElementById('section-daily')?.scrollIntoView({ behavior: 'smooth' })}>{t('trends.chartDaily')}</button>
						<button className={styles.navBtn} onClick={() => document.getElementById('section-product')?.scrollIntoView({ behavior: 'smooth' })}>{t('trends.chartProduct')}</button>
						<button className={styles.navBtn} onClick={() => document.getElementById('section-dow')?.scrollIntoView({ behavior: 'smooth' })}>{t('trends.chartDayOfWeek')}</button>
						<button className={styles.navBtn} onClick={() => document.getElementById('section-uploads')?.scrollIntoView({ behavior: 'smooth' })}>{t('trends.uploadHistory')}</button>
					</div>

					{/* Daily sales trend */}
					{data.dailyBreakdown.length > 0 && (
						<div id="section-daily" className={styles.chartSection}>
							<h3 className={styles.chartTitle}>{t('trends.chartDaily')}</h3>
							<div className={styles.chartWrap}>
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={data.dailyBreakdown}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" fontSize={12} />
										<YAxis fontSize={12} tickFormatter={(v: number) => formatShortCurrency(v)} />
										<Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), t('trends.revenue')]} />
										<Line
											type="monotone"
											dataKey="totalRevenue"
											stroke={COLORS.primary}
											strokeWidth={2}
											dot={{ r: 4, fill: COLORS.primary }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						</div>
					)}

					{/* Sales ranking by product */}
					{data.productRanking.length > 0 && (
						<div id="section-product" className={styles.chartSection}>
							<h3 className={styles.chartTitle}>{t('trends.chartProduct')}</h3>
							<div className={styles.chartWrap}>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={translatedProductRanking} layout="vertical">
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis type="number" fontSize={12} tickFormatter={(v: number) => formatShortCurrency(v)} />
										<YAxis type="category" dataKey="productName" fontSize={12} width={120} />
										<Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), t('trends.revenue')]} />
										<Bar dataKey="totalRevenue" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					)}

					{/* Average by day of week */}
					{data.dayOfWeekPattern.length > 0 && (
						<div id="section-dow" className={styles.chartSection}>
							<h3 className={styles.chartTitle}>{t('trends.chartDayOfWeek')}</h3>
							<div className={styles.chartWrapSmall}>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={translatedDayOfWeek}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="day" fontSize={12} />
										<YAxis fontSize={12} tickFormatter={(v: number) => formatShortCurrency(v)} />
										<Tooltip formatter={(value) => [formatCurrency(Math.round(Number(value ?? 0))), t('trends.avgRevenue')]} />
										<Bar dataKey="avgRevenue" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					)}
				</>
			)}

			{/* Upload history */}
			<div id="section-uploads" className={styles.chartSection}>
				<h3 className={styles.chartTitle}>{t('salesUpload.uploadHistory')}</h3>
				{uploadsLoading && <p className={styles.loadingText}>{t('app.loading')}</p>}
				{!uploadsLoading && uploads.length === 0 && (
					<p className={styles.noHistory}>{t('salesUpload.noHistory')}</p>
				)}
				{uploads.length > 0 && (
					<table className={styles.historyTable}>
						<thead>
							<tr>
								<th className={styles.historyTh}>#</th>
								<th className={styles.historyTh} onClick={() => toggleSort('createdAt')} style={{ cursor: 'pointer' }}>{t('salesUpload.colDate')}{getSortIcon('createdAt')}</th>
								<th className={styles.historyTh} onClick={() => toggleSort('fileName')} style={{ cursor: 'pointer' }}>{t('trends.fileName')}{getSortIcon('fileName')}</th>
								<th className={styles.historyTh} onClick={() => toggleSort('totalRows')} style={{ cursor: 'pointer' }}>{t('trends.totalRows')}{getSortIcon('totalRows')}</th>
								<th className={styles.historyTh} onClick={() => toggleSort('importedRows')} style={{ cursor: 'pointer' }}>{t('trends.importedRows')}{getSortIcon('importedRows')}</th>
								<th className={styles.historyTh}></th>
							</tr>
						</thead>
						<tbody>
							{sortedUploads.map((u, i) => (
								<tr key={u.id} className={i % 2 === 0 ? styles.historyRowEven : undefined}>
									<td className={styles.historyTd}>{i + 1}</td>
									<td className={styles.historyTd}>{new Date(u.createdAt).toLocaleDateString()}</td>
									<td className={styles.historyTd}>{u.fileName}</td>
									<td className={styles.historyTd} style={{ textAlign: 'right' }}>{u.totalRows}</td>
									<td className={styles.historyTd} style={{ textAlign: 'right' }}>{u.importedRows}</td>
									<td className={styles.historyTd} style={{ textAlign: 'center' }}>
										<button
											className={styles.deleteBtn}
											onClick={() => {
												if (confirm(t('salesUpload.deleteConfirm'))) {
													onDeleteUpload(u.id);
												}
											}}
										>
											{t('common.delete')}
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{/* Revenue detail modal */}
			{activeModal === 'revenue' && data && (
				<div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h3>{t('trends.modalRevenue')}</h3>
							<button className={styles.modalClose} onClick={() => setActiveModal(null)}>✕</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.modalChartWrap}>
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={data.dailyBreakdown}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" fontSize={11} />
										<YAxis fontSize={11} tickFormatter={(v: number) => formatShortCurrency(v)} />
										<Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), t('trends.revenue')]} />
										<Line type="monotone" dataKey="totalRevenue" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
									</LineChart>
								</ResponsiveContainer>
							</div>
							<div className={styles.modalTableWrap}>
								<table className={styles.historyTable}>
									<thead>
										<tr>
											<th className={styles.historyTh}>{t('salesUpload.colDate')}</th>
											<th className={styles.historyTh}>{t('trends.totalRevenue')}</th>
											<th className={styles.historyTh}>{t('trends.totalChicken')}</th>
											<th className={styles.historyTh}>{t('trends.totalOrders')}</th>
										</tr>
									</thead>
									<tbody>
										{data.dailyBreakdown.map((d) => (
											<tr key={d.date}>
												<td className={styles.historyTd}>{d.date}</td>
												<td className={styles.historyTd}>{formatCurrency(d.totalRevenue)}</td>
												<td className={styles.historyTd}>{d.chickenCount}{t('trends.unitChicken')}</td>
												<td className={styles.historyTd}>{d.orderCount}{t('trends.unitOrders')}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Chicken count detail modal */}
			{activeModal === 'chicken' && data && (
				<div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h3>{t('trends.modalChicken')}</h3>
							<button className={styles.modalClose} onClick={() => setActiveModal(null)}>✕</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.modalChartWrap}>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={data.dailyBreakdown}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" fontSize={11} />
										<YAxis fontSize={11} />
										<Tooltip formatter={(value) => [`${Number(value ?? 0)}${t('trends.unitChicken')}`, t('trends.totalChicken')]} />
										<Bar dataKey="chickenCount" fill="#FF6F00" radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
							<div className={styles.modalTableWrap}>
								<table className={styles.historyTable}>
									<thead>
										<tr>
											<th className={styles.historyTh}>{t('salesUpload.colDate')}</th>
											<th className={styles.historyTh}>{t('trends.totalChicken')}</th>
											<th className={styles.historyTh}>{t('trends.totalRevenue')}</th>
										</tr>
									</thead>
									<tbody>
										{data.dailyBreakdown.map((d) => (
											<tr key={d.date}>
												<td className={styles.historyTd}>{d.date}</td>
												<td className={styles.historyTd}><strong>{d.chickenCount}{t('trends.unitChicken')}</strong></td>
												<td className={styles.historyTd}>{formatCurrency(d.totalRevenue)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Orders detail modal */}
			{activeModal === 'orders' && data && (
				<div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h3>{t('trends.modalOrders')}</h3>
							<button className={styles.modalClose} onClick={() => setActiveModal(null)}>✕</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.modalChartWrap}>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={translatedProductRanking}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="productName" fontSize={11} angle={-30} textAnchor="end" height={60} />
										<YAxis fontSize={11} />
										<Tooltip formatter={(value) => [`${Number(value ?? 0)}${t('trends.unitPcs')}`, t('trends.totalQuantity')]} />
										<Bar dataKey="totalQuantity" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
							<div className={styles.modalTableWrap}>
								<table className={styles.historyTable}>
									<thead>
										<tr>
											<th className={styles.historyTh}>{t('salesUpload.colProduct')}</th>
											<th className={styles.historyTh}>{t('trends.totalQuantity')}</th>
											<th className={styles.historyTh}>{t('trends.totalRevenue')}</th>
										</tr>
									</thead>
									<tbody>
										{data.productRanking.map((p) => (
											<tr key={p.productId}>
												<td className={styles.historyTd}>{trProduct(p.productName)}</td>
												<td className={styles.historyTd}>{p.totalQuantity.toLocaleString()}{t('trends.unitPcs')}</td>
												<td className={styles.historyTd}>{formatCurrency(p.totalRevenue)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default SalesTrends;
