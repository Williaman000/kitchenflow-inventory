import { type FC } from 'react';
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

			{/* Summary cards */}
			<div className={styles.summaryRow}>
				<div className={styles.summaryCard}>
					<div className={styles.summaryLabel}>{t('profit.totalRevenue')}</div>
					<div className={styles.summaryValue}>{formatCurrency(data.totalRevenue)}</div>
				</div>
				<div className={styles.summaryCard}>
					<div className={styles.summaryLabel}>{t('profit.totalCost')}</div>
					<div className={styles.summaryValue}>{formatCurrency(data.totalMaterialCost)}</div>
				</div>
				<div className={styles.summaryCard}>
					<div className={styles.summaryLabel}>{t('profit.netProfit')}</div>
					<div className={`${styles.summaryValue} ${profitClass}`}>{formatCurrency(data.totalProfit)}</div>
				</div>
				<div className={styles.summaryCard}>
					<div className={styles.summaryLabel}>{t('profit.marginRate')}</div>
					<div className={`${styles.summaryValue} ${profitClass}`}>{data.overallMarginRate}%</div>
				</div>
			</div>

			{/* Daily profit chart */}
			{data.dailyBreakdown.length > 1 && (
				<div className={styles.chartSection}>
					<h3 className={styles.chartTitle}>{t('profit.chartDaily')}</h3>
					<div className={styles.chartWrap}>
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={data.dailyBreakdown}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="date" fontSize={11} tickFormatter={(v) => v.slice(5)} />
								<YAxis fontSize={11} tickFormatter={(v) => formatShortCurrency(v)} />
								<Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'revenue' ? t('profit.totalRevenue') : name === 'materialCost' ? t('profit.totalCost') : t('profit.netProfit')]} />
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
				<div className={styles.chartSection}>
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
								<Tooltip formatter={(v: number) => [formatCurrency(v), t('profit.netProfit')]} />
								<Bar dataKey="profit" fill={COLORS.success} radius={[0, 4, 4, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}

			{/* Product profit table */}
			{data.productBreakdown.length > 0 && (
				<div className={styles.chartSection}>
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
		</div>
	);
};

export default ProfitDashboard;
