import { useEffect, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/theme';
import type { DashboardStats } from '../hooks/useDashboard';

interface Props {
	stats: DashboardStats;
	isLoading: boolean;
	error: string | null;
	onLoad: () => void;
	onNavigate: (tab: string) => void;
}

const Dashboard: FC<Props> = ({ stats, isLoading, error, onLoad, onNavigate }) => {
	const { t } = useTranslation();

	useEffect(() => {
		onLoad();
	}, [onLoad]);

	if (isLoading && stats.insights.length === 0) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.textMuted }}>{t('dashboard.loading')}</p>
			</div>
		);
	}

	if (error && stats.insights.length === 0) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.danger }}>{error}</p>
				<button style={styles.retryBtn} onClick={onLoad}>{t('common.retry')}</button>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<h2 style={styles.title}>{t('dashboard.title')}</h2>

			{/* 요약 카드 */}
			<div style={styles.cardGrid}>
				<div style={styles.card}>
					<div style={styles.cardLabel}>{t('dashboard.totalMaterials')}</div>
					<div style={styles.cardValue}>{stats.totalMaterials}</div>
					<div style={styles.cardUnit}>{t('dashboard.unitKinds')}</div>
				</div>
				<div style={{ ...styles.card, borderLeft: `4px solid ${stats.lowStockCount > 0 ? COLORS.danger : COLORS.success}` }}>
					<div style={styles.cardLabel}>{t('dashboard.lowStock')}</div>
					<div style={{ ...styles.cardValue, color: stats.lowStockCount > 0 ? COLORS.danger : COLORS.success }}>
						{stats.lowStockCount}
					</div>
					<div style={styles.cardUnit}>{t('dashboard.unitItems')}</div>
				</div>
				<div style={styles.card}>
					<div style={styles.cardLabel}>{t('dashboard.aiShortage')}</div>
					<div style={styles.cardValue}>{stats.pendingOrders}</div>
					<div style={styles.cardUnit}>{t('dashboard.unitItems')}</div>
				</div>
				<div style={{ ...styles.card, borderLeft: `4px solid ${COLORS.accent}` }}>
					<div style={styles.cardLabel}>{t('dashboard.aiInsights')}</div>
					<div style={{ ...styles.cardValue, color: COLORS.accent }}>{stats.insights.length}</div>
					<div style={styles.cardUnit}>{t('dashboard.unitItems')}</div>
				</div>
			</div>

			{/* 빠른 액션 */}
			<div style={styles.section}>
				<h3 style={styles.sectionTitle}>{t('dashboard.quickActions')}</h3>
				<div style={styles.actionRow}>
					<button style={styles.actionBtn} onClick={() => onNavigate('chat')}>
						{t('dashboard.actionChat')}
					</button>
					<button style={styles.actionBtn} onClick={() => onNavigate('forecast')}>
						{t('dashboard.actionForecast')}
					</button>
					<button style={styles.actionBtn} onClick={() => onNavigate('materials')}>
						{t('dashboard.actionMaterials')}
					</button>
					<button style={styles.actionBtn} onClick={() => onNavigate('trends')}>
						{t('dashboard.actionTrends')}
					</button>
				</div>
			</div>

			{/* AI 인사이트 */}
			<div style={styles.section}>
				<h3 style={styles.sectionTitle}>{t('dashboard.aiInsights')}</h3>
				{stats.insights.length === 0 ? (
					<p style={{ color: COLORS.textMuted, fontSize: 14 }}>{t('dashboard.noInsights')}</p>
				) : (
					<div style={styles.insightList}>
						{stats.insights.map((insight, idx) => (
							<div key={idx} style={styles.insightItem}>
								<span style={styles.insightBullet}>AI</span>
								<span style={styles.insightText}>{insight}</span>
							</div>
						))}
					</div>
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
	title: {
		margin: '0 0 24px 0',
		fontSize: 22,
		fontWeight: 700,
		color: COLORS.text,
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
	cardGrid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
		gap: 16,
		marginBottom: 32,
	},
	card: {
		backgroundColor: COLORS.white,
		borderRadius: 12,
		padding: '20px 24px',
		borderLeft: `4px solid ${COLORS.primary}`,
		boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
	},
	cardLabel: {
		fontSize: 13,
		color: COLORS.textMuted,
		fontWeight: 600,
		marginBottom: 8,
	},
	cardValue: {
		fontSize: 32,
		fontWeight: 800,
		color: COLORS.text,
		lineHeight: 1,
	},
	cardUnit: {
		fontSize: 13,
		color: COLORS.textMuted,
		marginTop: 4,
	},
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: 700,
		color: COLORS.text,
		marginBottom: 16,
	},
	actionRow: {
		display: 'flex',
		gap: 12,
		flexWrap: 'wrap',
	},
	actionBtn: {
		padding: '10px 20px',
		border: `1px solid ${COLORS.primary}`,
		borderRadius: 8,
		backgroundColor: COLORS.white,
		color: COLORS.primary,
		fontSize: 14,
		fontWeight: 600,
		cursor: 'pointer',
	},
	insightList: {
		display: 'flex',
		flexDirection: 'column',
		gap: 10,
	},
	insightItem: {
		display: 'flex',
		alignItems: 'flex-start',
		gap: 10,
		backgroundColor: COLORS.white,
		borderRadius: 10,
		padding: '14px 18px',
		border: `1px solid ${COLORS.border}`,
	},
	insightBullet: {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 32,
		height: 24,
		borderRadius: 6,
		backgroundColor: COLORS.accent,
		color: COLORS.white,
		fontSize: 10,
		fontWeight: 800,
		flexShrink: 0,
	},
	insightText: {
		fontSize: 14,
		color: COLORS.textDark,
		lineHeight: 1.5,
	},
};

export default Dashboard;
