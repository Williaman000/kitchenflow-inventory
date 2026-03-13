import { useState, useMemo, type FC } from 'react';
import {
	LineChart, Line, BarChart, Bar, XAxis, YAxis,
	Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/theme';
import { formatShortCurrency } from '../utils/format';
import { trProduct, trDayOfWeek } from '../utils/dbTranslate';
import { formatCurrency } from '../utils/format';
import type { SalesTrendData, SalesUploadRecord } from '../types';
import type { TrendPeriod } from '../hooks/useSalesTrends';
import SalesUploadModal from './SalesUploadModal';

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

	const translatedProductRanking = useMemo(() =>
		data?.productRanking.map((p) => ({ ...p, productName: trProduct(p.productName) })) ?? []
	, [data]);

	const translatedDayOfWeek = useMemo(() =>
		data?.dayOfWeekPattern.map((d) => ({ ...d, day: trDayOfWeek(d.day) })) ?? []
	, [data]);

	const handleDownloadCsv = () => {
		if (!data) return;
		const rows: string[] = [];
		// 일별 매출
		rows.push(`[${t('trends.chartDaily')}]`);
		rows.push([t('salesUpload.colDate'), t('trends.totalRevenue'), t('trends.totalQuantity'), t('trends.totalOrders')].join(','));
		for (const d of data.dailyBreakdown) {
			rows.push([d.date, d.totalRevenue, d.totalQuantity, d.orderCount].join(','));
		}
		rows.push('');
		// 상품별 매출
		rows.push(`[${t('trends.chartProduct')}]`);
		rows.push([t('salesUpload.colProduct'), t('trends.totalRevenue'), t('trends.totalQuantity')].join(','));
		for (const p of data.productRanking) {
			rows.push([`"${p.productName}"`, p.totalRevenue, p.totalQuantity].join(','));
		}
		rows.push('');
		// 요일별 평균
		rows.push(`[${t('trends.chartDayOfWeek')}]`);
		rows.push([t('trends.chartDayOfWeek'), t('trends.totalRevenue'), t('trends.totalQuantity')].join(','));
		for (const d of data.dayOfWeekPattern) {
			rows.push([d.day, Math.round(d.avgRevenue), Math.round(d.avgQuantity)].join(','));
		}
		const filename = `sales_${data.period}_${data.startDate}_${data.endDate}.csv`;
		downloadCsv(filename, rows.join('\n'));
	};

	const PERIOD_LABELS: Record<TrendPeriod, string> = {
		today: t('trends.periodToday'),
		week: t('trends.periodWeek'),
		month: t('trends.periodMonth'),
	};
	if (isLoading && !data) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.textMuted }}>{t('trends.loading')}</p>
			</div>
		);
	}

	if (error && !data) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.danger }}>{error}</p>
				<button style={styles.retryBtn} onClick={onRefresh}>{t('common.retry')}</button>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h2 style={styles.title}>{t('trends.title')}</h2>
				<div style={styles.headerRight}>
					{data && (
						<button style={styles.downloadBtn} onClick={handleDownloadCsv}>
							CSV {t('trends.download')}
						</button>
					)}
					<button style={styles.uploadTriggerBtn} onClick={() => setShowUpload(true)}>
						CSV/Excel {t('trends.upload')}
					</button>
					<div style={styles.periodRow}>
						{(['today', 'week', 'month'] as TrendPeriod[]).map((p) => (
							<button
								key={p}
								style={period === p ? styles.periodActive : styles.periodBtn}
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
					{/* 요약 카드 */}
					<div style={styles.summaryRow}>
						<div style={styles.summaryCard}>
							<div style={styles.summaryLabel}>{t('trends.totalRevenue')}</div>
							<div style={styles.summaryValue}>{formatCurrency(data.totalRevenue)}</div>
						</div>
						<div style={styles.summaryCard}>
							<div style={styles.summaryLabel}>{t('trends.totalQuantity')}</div>
							<div style={styles.summaryValue}>{data.totalQuantity.toLocaleString()}{t('trends.unitPcs')}</div>
						</div>
						<div style={styles.summaryCard}>
							<div style={styles.summaryLabel}>{t('trends.totalOrders')}</div>
							<div style={styles.summaryValue}>{data.totalOrders.toLocaleString()}{t('trends.unitOrders')}</div>
						</div>
					</div>

					{/* 일별 매출 추이 */}
					{data.dailyBreakdown.length > 0 && (
						<div style={styles.chartSection}>
							<h3 style={styles.chartTitle}>{t('trends.chartDaily')}</h3>
							<div style={{ width: '100%', height: 300 }}>
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

					{/* 상품별 매출 순위 */}
					{data.productRanking.length > 0 && (
						<div style={styles.chartSection}>
							<h3 style={styles.chartTitle}>{t('trends.chartProduct')}</h3>
							<div style={{ width: '100%', height: 300 }}>
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

					{/* 요일별 평균 */}
					{data.dayOfWeekPattern.length > 0 && (
						<div style={styles.chartSection}>
							<h3 style={styles.chartTitle}>{t('trends.chartDayOfWeek')}</h3>
							<div style={{ width: '100%', height: 280 }}>
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

			{/* 업로드 이력 */}
			<div style={styles.chartSection}>
				<h3 style={styles.chartTitle}>{t('salesUpload.uploadHistory')}</h3>
				{uploadsLoading && <p style={{ color: COLORS.textMuted }}>{t('app.loading')}</p>}
				{!uploadsLoading && uploads.length === 0 && (
					<p style={{ color: COLORS.textMuted, fontSize: 14 }}>{t('salesUpload.noHistory')}</p>
				)}
				{uploads.length > 0 && (
					<table style={styles.historyTable}>
						<thead>
							<tr>
								<th style={styles.historyTh}>#</th>
								<th style={styles.historyTh}>{t('salesUpload.colDate')}</th>
								<th style={styles.historyTh}>{t('trends.fileName')}</th>
								<th style={styles.historyTh}>{t('trends.totalRows')}</th>
								<th style={styles.historyTh}>{t('trends.importedRows')}</th>
								<th style={styles.historyTh}></th>
							</tr>
						</thead>
						<tbody>
							{uploads.map((u, i) => (
								<tr key={u.id} style={i % 2 === 0 ? styles.historyRowEven : undefined}>
									<td style={styles.historyTd}>{i + 1}</td>
									<td style={styles.historyTd}>{new Date(u.createdAt).toLocaleDateString()}</td>
									<td style={styles.historyTd}>{u.fileName}</td>
									<td style={{ ...styles.historyTd, textAlign: 'right' }}>{u.totalRows}</td>
									<td style={{ ...styles.historyTd, textAlign: 'right' }}>{u.importedRows}</td>
									<td style={{ ...styles.historyTd, textAlign: 'center' }}>
										<button
											style={styles.deleteBtn}
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
		</div>
	);
};

const styles: Record<string, React.CSSProperties> = {
	container: {
		padding: 24,
		maxWidth: 1000,
		margin: '0 auto',
	},
	center: {
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		height: '100%',
		gap: 12,
	},
	retryBtn: {
		padding: '8px 20px',
		border: 'none',
		borderRadius: 6,
		backgroundColor: COLORS.primary,
		color: COLORS.white,
		fontSize: 14,
		fontWeight: 600,
		cursor: 'pointer',
	},
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 24,
	},
	headerRight: {
		display: 'flex',
		alignItems: 'center',
		gap: 12,
	},
	downloadBtn: {
		padding: '8px 16px',
		border: `1px solid ${COLORS.primary}`,
		borderRadius: 20,
		backgroundColor: COLORS.white,
		fontSize: 13,
		fontWeight: 700,
		color: COLORS.primary,
		cursor: 'pointer',
	},
	uploadTriggerBtn: {
		padding: '8px 16px',
		border: `1px solid ${COLORS.accent}`,
		borderRadius: 20,
		backgroundColor: COLORS.white,
		fontSize: 13,
		fontWeight: 700,
		color: COLORS.accent,
		cursor: 'pointer',
	},
	title: {
		margin: 0,
		fontSize: 22,
		fontWeight: 700,
		color: COLORS.text,
	},
	periodRow: {
		display: 'flex',
		gap: 8,
	},
	periodBtn: {
		padding: '8px 18px',
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 20,
		backgroundColor: COLORS.white,
		fontSize: 13,
		fontWeight: 500,
		color: COLORS.textMuted,
		cursor: 'pointer',
	},
	periodActive: {
		padding: '8px 18px',
		border: `1px solid ${COLORS.primary}`,
		borderRadius: 20,
		backgroundColor: COLORS.primary,
		fontSize: 13,
		fontWeight: 700,
		color: COLORS.white,
		cursor: 'pointer',
	},
	summaryRow: {
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
		gap: 16,
		marginBottom: 32,
	},
	summaryCard: {
		backgroundColor: COLORS.white,
		borderRadius: 12,
		padding: '20px 24px',
		boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
	},
	summaryLabel: {
		fontSize: 13,
		color: COLORS.textMuted,
		fontWeight: 600,
		marginBottom: 8,
	},
	summaryValue: {
		fontSize: 24,
		fontWeight: 800,
		color: COLORS.text,
	},
	chartSection: {
		backgroundColor: COLORS.white,
		borderRadius: 12,
		padding: 24,
		marginBottom: 24,
		boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
	},
	chartTitle: {
		fontSize: 15,
		fontWeight: 700,
		color: COLORS.text,
		margin: '0 0 16px 0',
	},
	historyTable: {
		width: '100%',
		borderCollapse: 'collapse' as const,
		fontSize: 13,
	},
	historyTh: {
		textAlign: 'left' as const,
		padding: '8px 12px',
		borderBottom: `2px solid ${COLORS.border}`,
		fontWeight: 700,
		color: COLORS.textMuted,
		fontSize: 12,
	},
	historyTd: {
		padding: '8px 12px',
		borderBottom: `1px solid ${COLORS.border}`,
		color: COLORS.text,
	},
	historyRowEven: {
		backgroundColor: '#fafafa',
	},
	deleteBtn: {
		padding: '4px 12px',
		border: `1px solid ${COLORS.danger}`,
		borderRadius: 4,
		backgroundColor: COLORS.white,
		color: COLORS.danger,
		fontSize: 12,
		fontWeight: 600,
		cursor: 'pointer',
	},
};

export default SalesTrends;
