import { useEffect, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/theme';
import type { DashboardStats } from '../hooks/useDashboard';
import styles from './Dashboard.module.scss';

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
			<div className={styles.center}>
				<p className={styles.loadingText}>{t('dashboard.loading')}</p>
			</div>
		);
	}

	if (error && stats.insights.length === 0) {
		return (
			<div className={styles.center}>
				<p className={styles.errorText}>{error}</p>
				<button className={styles.retryBtn} onClick={onLoad}>{t('common.retry')}</button>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<h2 className={styles.title}>{t('dashboard.title')}</h2>

			{/* 요약 카드 */}
			<div className={styles.cardGrid}>
				<div className={styles.card}>
					<div className={styles.cardLabel}>{t('dashboard.totalMaterials')}</div>
					<div className={styles.cardValue}>{stats.totalMaterials}</div>
					<div className={styles.cardUnit}>{t('dashboard.unitKinds')}</div>
				</div>
				<div className={styles.card} style={{ borderLeft: `4px solid ${stats.lowStockCount > 0 ? COLORS.danger : COLORS.success}` }}>
					<div className={styles.cardLabel}>{t('dashboard.lowStock')}</div>
					<div className={styles.cardValue} style={{ color: stats.lowStockCount > 0 ? COLORS.danger : COLORS.success }}>
						{stats.lowStockCount}
					</div>
					<div className={styles.cardUnit}>{t('dashboard.unitItems')}</div>
				</div>
				<div className={styles.card}>
					<div className={styles.cardLabel}>{t('dashboard.aiShortage')}</div>
					<div className={styles.cardValue}>{stats.pendingOrders}</div>
					<div className={styles.cardUnit}>{t('dashboard.unitItems')}</div>
				</div>
				<div className={styles.card} style={{ borderLeft: `4px solid ${COLORS.accent}` }}>
					<div className={styles.cardLabel}>{t('dashboard.aiInsights')}</div>
					<div className={styles.cardValue} style={{ color: COLORS.accent }}>{stats.insights.length}</div>
					<div className={styles.cardUnit}>{t('dashboard.unitItems')}</div>
				</div>
			</div>

			{/* 빠른 액션 */}
			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>{t('dashboard.quickActions')}</h3>
				<div className={styles.actionRow}>
					<button className={styles.actionBtn} onClick={() => onNavigate('chat')}>
						{t('dashboard.actionChat')}
					</button>
					<button className={styles.actionBtn} onClick={() => onNavigate('forecast')}>
						{t('dashboard.actionForecast')}
					</button>
					<button className={styles.actionBtn} onClick={() => onNavigate('materials')}>
						{t('dashboard.actionMaterials')}
					</button>
					<button className={styles.actionBtn} onClick={() => onNavigate('trends')}>
						{t('dashboard.actionTrends')}
					</button>
				</div>
			</div>

			{/* AI 인사이트 */}
			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>{t('dashboard.aiInsights')}</h3>
				{stats.insights.length === 0 ? (
					<p className={styles.noInsights}>{t('dashboard.noInsights')}</p>
				) : (
					<div className={styles.insightList}>
						{stats.insights.map((insight, idx) => (
							<div key={idx} className={styles.insightItem}>
								<span className={styles.insightBullet}>AI</span>
								<span className={styles.insightText}>{insight}</span>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default Dashboard;
