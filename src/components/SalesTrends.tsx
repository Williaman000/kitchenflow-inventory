import {
	LineChart, Line, BarChart, Bar, XAxis, YAxis,
	Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { COLORS } from '../constants/theme';
import { formatCurrency } from '../utils/format';
import type { SalesTrendData } from '../types';
import type { TrendPeriod } from '../hooks/useSalesTrends';

interface Props {
	data: SalesTrendData | null;
	period: TrendPeriod;
	isLoading: boolean;
	error: string | null;
	onPeriodChange: (p: TrendPeriod) => void;
}

const PERIOD_LABELS: Record<TrendPeriod, string> = {
	today: '오늘',
	week: '이번주',
	month: '이번달',
};

export default function SalesTrends({ data, period, isLoading, error, onPeriodChange }: Props) {
	if (isLoading && !data) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.textMuted }}>매출 데이터를 불러오는 중...</p>
			</div>
		);
	}

	if (error && !data) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.danger }}>{error}</p>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h2 style={styles.title}>매출 분석</h2>
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

			{data && (
				<>
					{/* 요약 카드 */}
					<div style={styles.summaryRow}>
						<div style={styles.summaryCard}>
							<div style={styles.summaryLabel}>총 매출</div>
							<div style={styles.summaryValue}>{formatCurrency(data.totalRevenue)}</div>
						</div>
						<div style={styles.summaryCard}>
							<div style={styles.summaryLabel}>총 판매량</div>
							<div style={styles.summaryValue}>{data.totalQuantity.toLocaleString()}개</div>
						</div>
						<div style={styles.summaryCard}>
							<div style={styles.summaryLabel}>총 주문수</div>
							<div style={styles.summaryValue}>{data.totalOrders.toLocaleString()}건</div>
						</div>
					</div>

					{/* 일별 매출 추이 */}
					{data.dailyBreakdown.length > 0 && (
						<div style={styles.chartSection}>
							<h3 style={styles.chartTitle}>일별 매출 추이</h3>
							<div style={{ width: '100%', height: 300 }}>
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={data.dailyBreakdown}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" fontSize={12} />
										<YAxis fontSize={12} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`} />
										<Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), '매출']} />
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
							<h3 style={styles.chartTitle}>상품별 매출 순위 (Top 10)</h3>
							<div style={{ width: '100%', height: 300 }}>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={data.productRanking} layout="vertical">
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis type="number" fontSize={12} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`} />
										<YAxis type="category" dataKey="productName" fontSize={12} width={120} />
										<Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), '매출']} />
										<Bar dataKey="totalRevenue" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					)}

					{/* 요일별 평균 */}
					{data.dayOfWeekPattern.length > 0 && (
						<div style={styles.chartSection}>
							<h3 style={styles.chartTitle}>요일별 평균 매출</h3>
							<div style={{ width: '100%', height: 280 }}>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={data.dayOfWeekPattern}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="day" fontSize={12} />
										<YAxis fontSize={12} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`} />
										<Tooltip formatter={(value) => [formatCurrency(Math.round(Number(value ?? 0))), '평균 매출']} />
										<Bar dataKey="avgRevenue" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}

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
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 24,
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
};
