import { useState, type FC } from 'react';
import { useTranslation, getI18n } from 'react-i18next';
import { trMaterial, trUnit } from '../utils/dbTranslate';
import { COLORS } from '../constants/theme';
import type { ForecastData, RecommendedOrder } from '../types';
import { explainForecast } from '../services/inventoryAiApi';
import type { CreatePurchaseOrderPayload } from '../services/inventoryApi';
import styles from './ForecastPage.module.scss';

interface Props {
	forecast: ForecastData | null;
	forecastDays: number;
	isLoading: boolean;
	error: string | null;
	onLoadForecast: (days?: number) => void;
	onCreatePO: (payload: CreatePurchaseOrderPayload) => Promise<void>;
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
	const { t } = useTranslation();
	const colorMap: Record<string, { bg: string; fg: string }> = {
		high: { bg: '#E8F5E9', fg: COLORS.success },
		medium: { bg: '#FFF8E1', fg: COLORS.warning },
		low: { bg: '#F5F5F5', fg: COLORS.grey },
	};
	const c = colorMap[confidence] ?? colorMap.low;
	const labelMap: Record<string, string> = { high: t('forecast.confidenceHigh'), medium: t('forecast.confidenceMedium'), low: t('forecast.confidenceLow') };
	return (
		<span style={{
			padding: '3px 10px',
			borderRadius: 12,
			fontSize: 11,
			fontWeight: 700,
			backgroundColor: c.bg,
			color: c.fg,
		}}>
			{labelMap[confidence] ?? confidence}
		</span>
	);
}

function ExplanationModal({ rec, onClose }: { rec: RecommendedOrder; onClose: () => void }) {
	const { t } = useTranslation();
	const [explanation, setExplanation] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useState(() => {
		explainForecast(rec.materialId, getI18n().language)
			.then((result) => setExplanation(result.explanation))
			.catch(() => setExplanation(t('forecast.explainError')))
			.finally(() => setLoading(false));
	});

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3 className={styles.modalTitle}>
						{trMaterial(rec.materialName)} — {t('forecast.colDetail')}
					</h3>
					<button className={styles.modalCloseBtn} onClick={onClose}>✕</button>
				</div>
				<div className={styles.summary}>
					<div className={styles.summaryItem}>
						<span className={styles.summaryLabel}>{t('forecast.colCurrentStock')}</span>
						<span className={styles.summaryValue}>{rec.currentStock} {trUnit(rec.unit)}</span>
					</div>
					<div className={styles.summaryItem}>
						<span className={styles.summaryLabel}>{t('forecast.colExpected')}</span>
						<span className={styles.summaryValue} style={{ color: COLORS.warning }}>{rec.expectedConsumption.toFixed(1)} {trUnit(rec.unit)}</span>
					</div>
					<div className={styles.summaryItem}>
						<span className={styles.summaryLabel}>{t('forecast.colSafety')}</span>
						<span className={styles.summaryValue}>{rec.safetyStock.toFixed(1)} {trUnit(rec.unit)}</span>
					</div>
					<div className={styles.summaryItem}>
						<span className={styles.summaryLabel}>{t('forecast.colRecommended')}</span>
						<span
							className={styles.summaryValue}
							style={{
								color: rec.recommendedOrder > 0 ? COLORS.danger : COLORS.success,
								fontWeight: 800,
							}}
						>
							{rec.recommendedOrder > 0 ? `+${Math.ceil(rec.recommendedOrder)}` : '-'} {rec.recommendedOrder > 0 ? trUnit(rec.unit) : ''}
						</span>
					</div>
					<div className={styles.summaryItem}>
						<span className={styles.summaryLabel}>{t('forecast.colConfidence')}</span>
						<ConfidenceBadge confidence={rec.confidence} />
					</div>
				</div>
				<div className={styles.explanationSection}>
					<h4 className={styles.explanationSectionTitle}>AI {t('forecast.colDetail')}</h4>
					{loading ? (
						<p className={styles.explanationLoading}>...</p>
					) : (
						<div className={styles.explanationBox}>{explanation}</div>
					)}
				</div>
			</div>
		</div>
	);
}

const ForecastPage: FC<Props> = ({ forecast, forecastDays, isLoading, error, onLoadForecast, onCreatePO }) => {
	const { t } = useTranslation();
	const [creating, setCreating] = useState(false);
	const [detailRec, setDetailRec] = useState<RecommendedOrder | null>(null);

	const handleCreateAllPO = async () => {
		if (!forecast) return;
		const itemsToOrder = forecast.recommendations.filter((r) => r.recommendedOrder > 0);
		if (itemsToOrder.length === 0) return;

		const payload: CreatePurchaseOrderPayload = {
			notes: t('forecast.poNotes', { days: forecastDays }),
			items: itemsToOrder.map((r) => ({
				materialId: r.materialId,
				quantity: Math.ceil(r.recommendedOrder),
				unitPrice: 0,
			})),
		};

		setCreating(true);
		try {
			await onCreatePO(payload);
			alert(t('forecast.poCreated'));
		} catch (err) {
			alert(err instanceof Error ? err.message : '발주 생성 실패');
		} finally {
			setCreating(false);
		}
	};

	if (isLoading && !forecast) {
		return (
			<div className={styles.center}>
				<p className={styles.loadingText}>{t('forecast.loading')}</p>
			</div>
		);
	}

	if (error && !forecast) {
		return (
			<div className={styles.center}>
				<p className={styles.errorText}>{error}</p>
				<button className={styles.retryBtn} onClick={() => onLoadForecast()}>{t('common.retry')}</button>
			</div>
		);
	}

	const needsOrder = forecast?.recommendations.filter((r) => r.recommendedOrder > 0).length ?? 0;

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div>
					<h2 className={styles.title}>{t('forecast.title')}</h2>
					{forecast && (
						<p className={styles.subtitle}>
							{t('forecast.needsOrdering')} <strong style={{ color: needsOrder > 0 ? COLORS.danger : COLORS.success }}>{needsOrder}{t('forecast.unitItems')}</strong>
							{' / '}{t('forecast.total')} {forecast.totalMaterials}{t('forecast.unitItems')}
						</p>
					)}
				</div>
				<div className={styles.headerRight}>
					<div className={styles.daysSelector}>
						{[1, 2, 3, 5, 7].map((d) => (
							<button
								key={d}
								className={forecastDays === d ? styles.dayActive : styles.dayBtn}
								onClick={() => onLoadForecast(d)}
							>
								{d}{t('forecast.unitDays')}
							</button>
						))}
					</div>
					{needsOrder > 0 && (
						<button
							className={styles.createBtn}
							onClick={handleCreateAllPO}
							disabled={creating}
						>
							{creating ? t('forecast.creatingPO') : t('forecast.createPO')}
						</button>
					)}
				</div>
			</div>

			{forecast && (
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th className={styles.th}>{t('forecast.colName')}</th>
								<th className={styles.th} style={{ textAlign: 'center' }}>{t('forecast.colCurrentStock')}</th>
								<th className={styles.th} style={{ textAlign: 'center' }}>{t('forecast.colExpected')}</th>
								<th className={styles.th} style={{ textAlign: 'center' }}>{t('forecast.colSafety')}</th>
								<th className={styles.th} style={{ textAlign: 'center' }}>{t('forecast.colRecommended')}</th>
								<th className={styles.th} style={{ textAlign: 'center' }}>{t('forecast.colConfidence')}</th>
								<th className={styles.th} style={{ textAlign: 'center', width: 60 }}>{t('forecast.colDetail')}</th>
							</tr>
						</thead>
						<tbody>
							{forecast.recommendations.map((rec) => {
								const isNeedsOrder = rec.recommendedOrder > 0;
								return (
									<>
										<tr key={rec.materialId} className={isNeedsOrder ? styles.needsOrderRow : undefined}>
											<td className={styles.td}>
												<span style={{ fontWeight: 600 }}>{trMaterial(rec.materialName)}</span>
												<span className={styles.materialUnit}>({trUnit(rec.unit)})</span>
											</td>
											<td className={styles.td} style={{ textAlign: 'center', fontWeight: 600 }}>
												{rec.currentStock}
											</td>
											<td className={styles.td} style={{ textAlign: 'center', color: COLORS.warning, fontWeight: 600 }}>
												{rec.expectedConsumption.toFixed(1)}
											</td>
											<td className={styles.td} style={{ textAlign: 'center', color: COLORS.textMuted }}>
												{rec.safetyStock.toFixed(1)}
											</td>
											<td className={styles.td} style={{
												textAlign: 'center',
												fontWeight: 800,
												fontSize: 16,
												color: isNeedsOrder ? COLORS.danger : COLORS.success,
											}}>
												{isNeedsOrder ? `+${Math.ceil(rec.recommendedOrder)}` : '-'}
											</td>
											<td className={styles.td} style={{ textAlign: 'center' }}>
												<ConfidenceBadge confidence={rec.confidence} />
											</td>
											<td className={styles.td} style={{ textAlign: 'center' }}>
												<button className={styles.detailBtn} onClick={() => setDetailRec(rec)}>
													{t('forecast.btnWhy')}
												</button>
											</td>
										</tr>
									</>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
			{detailRec && (
				<ExplanationModal rec={detailRec} onClose={() => setDetailRec(null)} />
			)}
		</div>
	);
}

export default ForecastPage;
