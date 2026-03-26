import { useState, type FC } from 'react';
import {
	LineChart, Line, BarChart, Bar, XAxis, YAxis,
	Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/theme';
import { formatCurrency, formatShortCurrency } from '../../utils/format';
import { trProduct } from '../../utils/dbTranslate';
import type { ProfitAnalysisData } from '../../types';
import type { ProfitPeriod } from '../../hooks/useProfitAnalysis';
import styles from './ProfitDashboard.module.scss';

interface Props {
	data: ProfitAnalysisData | null;
	period: ProfitPeriod;
	isLoading: boolean;
	error: string | null;
	onPeriodChange: (p: ProfitPeriod) => void;
	onRefresh: () => void;
}

const PERIODS: ProfitPeriod[] = ['today', 'week', 'month'];

const ProfitDashboard: FC<Props> = ({ data, period, isLoading, error, onPeriodChange, onRefresh }) => {
	const { t } = useTranslation();
	const [activeModal, setActiveModal] = useState<'revenue' | 'cost' | 'profit' | 'margin' | null>(null);

	if (isLoading && !data) {
		return <div className={styles.center}><p>{t('profit.loading')}</p></div>;
	}

	if (error && !data) {
		return (
			<div className={styles.center}>
				<p>{error}</p>
				<button className={styles.retryBtn} onClick={onRefresh}>{t('common.retry')}</button>
			</div>
		);
	}

	if (!data) return null;

	const profitClass = data.totalProfit >= 0 ? styles.profitPositive : styles.profitNegative;

	return (
		<div className={styles.container}>
			{/* Header */}
			<div className={styles.header}>
				<h2 className={styles.title}>{t('profit.title')}</h2>
				<div className={styles.periodRow}>
					{PERIODS.map((p) => (
						<button
							key={p}
							className={period === p ? styles.periodActive : styles.periodBtn}
							onClick={() => onPeriodChange(p)}
						>
							{t(`profit.period${p.charAt(0).toUpperCase() + p.slice(1)}`)}
						</button>
					))}
				</div>
			</div>

			{/* Coverage notice */}
			{data.costCoverageRate < 100 && (
				<div className={styles.coverageNotice}>
					{t('profit.coverageNotice', { rate: data.costCoverageRate })}
				</div>
			)}

			{/* Summary cards — clickable */}
			<div className={styles.summaryRow}>
				<div className={`${styles.summaryCard} ${styles.clickable}`} onClick={() => setActiveModal('revenue')}>
					<div className={styles.summaryLabel}>{t('profit.totalRevenue')}</div>
					<div className={styles.summaryValue}>{formatCurrency(data.totalRevenue)}</div>
				</div>
				<div className={`${styles.summaryCard} ${styles.clickable}`} onClick={() => setActiveModal('cost')}>
					<div className={styles.summaryLabel}>{t('profit.totalCost')}</div>
					<div className={styles.summaryValue}>{formatCurrency(data.totalMaterialCost)}</div>
				</div>
				<div className={`${styles.summaryCard} ${styles.clickable}`} onClick={() => setActiveModal('profit')}>
					<div className={styles.summaryLabel}>{t('profit.netProfit')}</div>
					<div className={`${styles.summaryValue} ${profitClass}`}>{formatCurrency(data.totalProfit)}</div>
				</div>
				<div className={`${styles.summaryCard} ${styles.clickable}`} onClick={() => setActiveModal('margin')}>
					<div className={styles.summaryLabel}>{t('profit.marginRate')}</div>
					<div className={`${styles.summaryValue} ${profitClass}`}>{data.overallMarginRate}%</div>
				</div>
			</div>

			{/* Section navigation */}
			<div className={styles.sectionNav}>
				<button className={styles.navBtn} onClick={() => document.getElementById('profit-daily')?.scrollIntoView({ behavior: 'smooth' })}>{t('profit.chartDaily')}</button>
				<button className={styles.navBtn} onClick={() => document.getElementById('profit-product')?.scrollIntoView({ behavior: 'smooth' })}>{t('profit.chartProduct')}</button>
				<button className={styles.navBtn} onClick={() => document.getElementById('profit-table')?.scrollIntoView({ behavior: 'smooth' })}>{t('profit.tableTitle')}</button>
			</div>

			{/* Daily profit chart */}
			{data.dailyBreakdown.length > 1 && (
				<div id="profit-daily" className={styles.chartSection}>
					<h3 className={styles.chartTitle}>{t('profit.chartDaily')}</h3>
					<div className={styles.chartWrap}>
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={data.dailyBreakdown}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="date" fontSize={11} tickFormatter={(v) => v.slice(5)} />
								<YAxis fontSize={11} tickFormatter={(v) => formatShortCurrency(v)} />
								<Tooltip formatter={(v: number | undefined, name: string | undefined) => [formatCurrency(v ?? 0), name === 'revenue' ? t('profit.totalRevenue') : name === 'materialCost' ? t('profit.totalCost') : t('profit.netProfit')]} />
								<Legend formatter={(v) => v === 'revenue' ? t('profit.totalRevenue') : v === 'materialCost' ? t('profit.totalCost') : t('profit.netProfit')} />
								<Line type="monotone" dataKey="revenue" stroke={COLORS.primary} strokeWidth={2} dot={false} />
								<Line type="monotone" dataKey="materialCost" stroke={COLORS.warning} strokeWidth={2} dot={false} />
								<Line type="monotone" dataKey="profit" stroke={COLORS.success} strokeWidth={2} dot={false} />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}

			{/* Product profit bar chart */}
			{data.productBreakdown.length > 0 && (
				<div id="profit-product" className={styles.chartSection}>
					<h3 className={styles.chartTitle}>{t('profit.chartProduct')}</h3>
					<div className={styles.chartWrap}>
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={data.productBreakdown.slice(0, 10).map((p) => ({
									name: trProduct(p.productName),
									profit: p.profit,
									marginRate: p.marginRate,
								}))}
								layout="vertical"
							>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis type="number" fontSize={11} tickFormatter={(v) => formatShortCurrency(v)} />
								<YAxis type="category" dataKey="name" fontSize={11} width={120} />
								<Tooltip formatter={(v: number | undefined) => [formatCurrency(v ?? 0), t('profit.netProfit')]} />
								<Bar dataKey="profit" fill={COLORS.success} radius={[0, 4, 4, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}

			{/* Product profit table */}
			{data.productBreakdown.length > 0 && (
				<div id="profit-table" className={styles.chartSection}>
					<h3 className={styles.chartTitle}>{t('profit.tableTitle')}</h3>
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th className={styles.th}>{t('profit.productName')}</th>
									<th className={styles.thRight}>{t('profit.quantity')}</th>
									<th className={styles.thRight}>{t('profit.totalRevenue')}</th>
									<th className={styles.thRight}>{t('profit.totalCost')}</th>
									<th className={styles.thRight}>{t('profit.netProfit')}</th>
									<th className={styles.thRight}>{t('profit.marginRate')}</th>
								</tr>
							</thead>
							<tbody>
								{data.productBreakdown.map((p) => (
									<tr key={p.productId}>
										<td className={styles.td}>{trProduct(p.productName)}</td>
										<td className={styles.tdRight}>{p.quantity}</td>
										<td className={styles.tdRight}>{formatCurrency(p.revenue)}</td>
										<td className={styles.tdRight}>
											{p.materialCost > 0 ? formatCurrency(p.materialCost) : <span className={styles.noCost}>{t('profit.noCost')}</span>}
										</td>
										<td className={styles.tdRight}>
											<span className={p.profit >= 0 ? styles.profitPositive : styles.profitNegative}>
												{formatCurrency(p.profit)}
											</span>
										</td>
										<td className={styles.tdRight}>
											<strong>{p.marginRate}%</strong>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Revenue detail modal */}
			{activeModal === 'revenue' && (
				<div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h3>{t('profit.modalRevenue')}</h3>
							<button className={styles.modalClose} onClick={() => setActiveModal(null)}>✕</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.modalChartWrap}>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={data.productBreakdown.slice(0, 10).map((p) => ({ name: trProduct(p.productName), revenue: p.revenue }))}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="name" fontSize={11} angle={-30} textAnchor="end" height={60} />
										<YAxis fontSize={11} tickFormatter={(v) => formatShortCurrency(v)} />
										<Tooltip formatter={(v: number | undefined) => [formatCurrency(v ?? 0), t('profit.totalRevenue')]} />
										<Bar dataKey="revenue" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
							<div className={styles.modalTableWrap}>
								<table className={styles.table}>
									<thead><tr><th className={styles.th}>{t('profit.productName')}</th><th className={styles.thRight}>{t('profit.quantity')}</th><th className={styles.thRight}>{t('profit.totalRevenue')}</th></tr></thead>
									<tbody>
										{data.productBreakdown.map((p) => (
											<tr key={p.productId}><td className={styles.td}>{trProduct(p.productName)}</td><td className={styles.tdRight}>{p.quantity}</td><td className={styles.tdRight}>{formatCurrency(p.revenue)}</td></tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Cost detail modal */}
			{activeModal === 'cost' && (
				<div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h3>{t('profit.modalCost')}</h3>
							<button className={styles.modalClose} onClick={() => setActiveModal(null)}>✕</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.modalChartWrap}>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={data.productBreakdown.filter((p) => p.materialCost > 0).slice(0, 10).map((p) => ({ name: trProduct(p.productName), cost: p.materialCost }))} layout="vertical">
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis type="number" fontSize={11} tickFormatter={(v) => formatShortCurrency(v)} />
										<YAxis type="category" dataKey="name" fontSize={11} width={120} />
										<Tooltip formatter={(v: number | undefined) => [formatCurrency(v ?? 0), t('profit.totalCost')]} />
										<Bar dataKey="cost" fill={COLORS.warning} radius={[0, 4, 4, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
							<div className={styles.modalTableWrap}>
								<table className={styles.table}>
									<thead><tr><th className={styles.th}>{t('profit.productName')}</th><th className={styles.thRight}>{t('profit.quantity')}</th><th className={styles.thRight}>{t('profit.totalCost')}</th></tr></thead>
									<tbody>
										{data.productBreakdown.map((p) => (
											<tr key={p.productId}><td className={styles.td}>{trProduct(p.productName)}</td><td className={styles.tdRight}>{p.quantity}</td><td className={styles.tdRight}>{p.materialCost > 0 ? formatCurrency(p.materialCost) : <span className={styles.noCost}>{t('profit.noCost')}</span>}</td></tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Profit detail modal */}
			{activeModal === 'profit' && (
				<div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h3>{t('profit.modalProfit')}</h3>
							<button className={styles.modalClose} onClick={() => setActiveModal(null)}>✕</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.modalChartWrap}>
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={data.dailyBreakdown}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" fontSize={11} tickFormatter={(v) => v.slice(5)} />
										<YAxis fontSize={11} tickFormatter={(v) => formatShortCurrency(v)} />
										<Tooltip formatter={(v: number | undefined) => [formatCurrency(v ?? 0), t('profit.netProfit')]} />
										<Line type="monotone" dataKey="profit" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
									</LineChart>
								</ResponsiveContainer>
							</div>
							<div className={styles.modalTableWrap}>
								<table className={styles.table}>
									<thead><tr><th className={styles.th}>{t('profit.date')}</th><th className={styles.thRight}>{t('profit.totalRevenue')}</th><th className={styles.thRight}>{t('profit.totalCost')}</th><th className={styles.thRight}>{t('profit.netProfit')}</th><th className={styles.thRight}>{t('profit.marginRate')}</th></tr></thead>
									<tbody>
										{data.dailyBreakdown.map((d) => (
											<tr key={d.date}>
												<td className={styles.td}>{d.date}</td>
												<td className={styles.tdRight}>{formatCurrency(d.revenue)}</td>
												<td className={styles.tdRight}>{formatCurrency(d.materialCost)}</td>
												<td className={styles.tdRight}><span className={d.profit >= 0 ? styles.profitPositive : styles.profitNegative}>{formatCurrency(d.profit)}</span></td>
												<td className={styles.tdRight}>{d.marginRate}%</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Margin detail modal */}
			{activeModal === 'margin' && (
				<div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h3>{t('profit.modalMargin')}</h3>
							<button className={styles.modalClose} onClick={() => setActiveModal(null)}>✕</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.modalChartWrap}>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={data.productBreakdown.filter((p) => p.materialCost > 0).slice(0, 10).map((p) => ({ name: trProduct(p.productName), marginRate: p.marginRate }))} layout="vertical">
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis type="number" domain={[0, 100]} fontSize={11} tickFormatter={(v) => `${v}%`} />
										<YAxis type="category" dataKey="name" fontSize={11} width={120} />
										<Tooltip formatter={(v: number | undefined) => [`${v ?? 0}%`, t('profit.marginRate')]} />
										<Bar dataKey="marginRate" fill={COLORS.accent} radius={[0, 4, 4, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
							<div className={styles.modalTableWrap}>
								<table className={styles.table}>
									<thead><tr><th className={styles.th}>{t('profit.productName')}</th><th className={styles.thRight}>{t('profit.totalRevenue')}</th><th className={styles.thRight}>{t('profit.totalCost')}</th><th className={styles.thRight}>{t('profit.marginRate')}</th></tr></thead>
									<tbody>
										{data.productBreakdown.filter((p) => p.materialCost > 0).map((p) => (
											<tr key={p.productId}><td className={styles.td}>{trProduct(p.productName)}</td><td className={styles.tdRight}>{formatCurrency(p.revenue)}</td><td className={styles.tdRight}>{formatCurrency(p.materialCost)}</td><td className={styles.tdRight}><strong>{p.marginRate}%</strong></td></tr>
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

export default ProfitDashboard;
