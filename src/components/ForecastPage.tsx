import { useState } from 'react';
import { useTranslation, getI18n } from 'react-i18next';
import { trMaterial, trUnit } from '../utils/dbTranslate';
import { COLORS } from '../constants/theme';
import type { ForecastData, RecommendedOrder } from '../types';
import { explainForecast } from '../services/inventoryAiApi';
import type { CreatePurchaseOrderPayload } from '../services/inventoryApi';

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
		<div style={modalStyles.overlay} onClick={onClose}>
			<div style={modalStyles.content} onClick={(e) => e.stopPropagation()}>
				<div style={modalStyles.header}>
					<h3 style={modalStyles.title}>
						{trMaterial(rec.materialName)} — {t('forecast.colDetail')}
					</h3>
					<button style={modalStyles.closeBtn} onClick={onClose}>✕</button>
				</div>
				<div style={modalStyles.summary}>
					<div style={modalStyles.summaryItem}>
						<span style={modalStyles.summaryLabel}>{t('forecast.colCurrentStock')}</span>
						<span style={modalStyles.summaryValue}>{rec.currentStock} {trUnit(rec.unit)}</span>
					</div>
					<div style={modalStyles.summaryItem}>
						<span style={modalStyles.summaryLabel}>{t('forecast.colExpected')}</span>
						<span style={{ ...modalStyles.summaryValue, color: COLORS.warning }}>{rec.expectedConsumption.toFixed(1)} {trUnit(rec.unit)}</span>
					</div>
					<div style={modalStyles.summaryItem}>
						<span style={modalStyles.summaryLabel}>{t('forecast.colSafety')}</span>
						<span style={modalStyles.summaryValue}>{rec.safetyStock.toFixed(1)} {trUnit(rec.unit)}</span>
					</div>
					<div style={modalStyles.summaryItem}>
						<span style={modalStyles.summaryLabel}>{t('forecast.colRecommended')}</span>
						<span style={{
							...modalStyles.summaryValue,
							color: rec.recommendedOrder > 0 ? COLORS.danger : COLORS.success,
							fontWeight: 800,
						}}>
							{rec.recommendedOrder > 0 ? `+${Math.ceil(rec.recommendedOrder)}` : '-'} {rec.recommendedOrder > 0 ? trUnit(rec.unit) : ''}
						</span>
					</div>
					<div style={modalStyles.summaryItem}>
						<span style={modalStyles.summaryLabel}>{t('forecast.colConfidence')}</span>
						<ConfidenceBadge confidence={rec.confidence} />
					</div>
				</div>
				<div style={modalStyles.explanationSection}>
					<h4 style={modalStyles.sectionTitle}>AI {t('forecast.colDetail')}</h4>
					{loading ? (
						<p style={{ color: COLORS.textMuted, textAlign: 'center', padding: 20 }}>...</p>
					) : (
						<div style={modalStyles.explanationBox}>{explanation}</div>
					)}
				</div>
			</div>
		</div>
	);
}

const modalStyles: Record<string, React.CSSProperties> = {
	overlay: {
		position: 'fixed',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0.4)',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1000,
	},
	content: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
		width: '90%',
		maxWidth: 520,
		maxHeight: '80vh',
		overflow: 'auto',
		boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
	},
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: '20px 24px 16px',
		borderBottom: `1px solid ${COLORS.border}`,
	},
	title: {
		margin: 0,
		fontSize: 18,
		fontWeight: 700,
		color: COLORS.text,
	},
	closeBtn: {
		border: 'none',
		background: 'none',
		fontSize: 18,
		color: COLORS.textMuted,
		cursor: 'pointer',
		padding: '4px 8px',
		borderRadius: 6,
	},
	summary: {
		display: 'grid',
		gridTemplateColumns: '1fr 1fr',
		gap: 12,
		padding: '20px 24px',
		backgroundColor: COLORS.backgroundLight,
	},
	summaryItem: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: 4,
	},
	summaryLabel: {
		fontSize: 12,
		fontWeight: 600,
		color: COLORS.textMuted,
	},
	summaryValue: {
		fontSize: 16,
		fontWeight: 600,
		color: COLORS.text,
	},
	explanationSection: {
		padding: '20px 24px 24px',
	},
	sectionTitle: {
		margin: '0 0 12px',
		fontSize: 14,
		fontWeight: 700,
		color: COLORS.text,
	},
	explanationBox: {
		padding: '16px',
		backgroundColor: '#E8F5E9',
		borderRadius: 10,
		fontSize: 14,
		lineHeight: 1.7,
		color: COLORS.textDark,
		whiteSpace: 'pre-wrap' as const,
	},
	detailBtn: {
		display: 'inline-block',
		padding: '4px 10px',
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 6,
		backgroundColor: COLORS.white,
		fontSize: 12,
		fontWeight: 600,
		cursor: 'pointer',
		color: COLORS.accent,
		whiteSpace: 'nowrap' as const,
	},
};

export default function ForecastPage({ forecast, forecastDays, isLoading, error, onLoadForecast, onCreatePO }: Props) {
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
			<div style={styles.center}>
				<p style={{ color: COLORS.textMuted }}>{t('forecast.loading')}</p>
			</div>
		);
	}

	if (error && !forecast) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.danger }}>{error}</p>
				<button style={styles.retryBtn} onClick={() => onLoadForecast()}>{t('common.retry')}</button>
			</div>
		);
	}

	const needsOrder = forecast?.recommendations.filter((r) => r.recommendedOrder > 0).length ?? 0;

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<div>
					<h2 style={styles.title}>{t('forecast.title')}</h2>
					{forecast && (
						<p style={styles.subtitle}>
							{t('forecast.needsOrdering')} <strong style={{ color: needsOrder > 0 ? COLORS.danger : COLORS.success }}>{needsOrder}{t('forecast.unitItems')}</strong>
							{' / '}{t('forecast.total')} {forecast.totalMaterials}{t('forecast.unitItems')}
						</p>
					)}
				</div>
				<div style={styles.headerRight}>
					<div style={styles.daysSelector}>
						{[1, 2, 3, 5, 7].map((d) => (
							<button
								key={d}
								style={forecastDays === d ? styles.dayActive : styles.dayBtn}
								onClick={() => onLoadForecast(d)}
							>
								{d}{t('forecast.unitDays')}
							</button>
						))}
					</div>
					{needsOrder > 0 && (
						<button
							style={styles.createBtn}
							onClick={handleCreateAllPO}
							disabled={creating}
						>
							{creating ? t('forecast.creatingPO') : t('forecast.createPO')}
						</button>
					)}
				</div>
			</div>

			{forecast && (
				<div style={styles.tableWrap}>
					<table style={styles.table}>
						<thead>
							<tr>
								<th style={styles.th}>{t('forecast.colName')}</th>
								<th style={{ ...styles.th, textAlign: 'center' }}>{t('forecast.colCurrentStock')}</th>
								<th style={{ ...styles.th, textAlign: 'center' }}>{t('forecast.colExpected')}</th>
								<th style={{ ...styles.th, textAlign: 'center' }}>{t('forecast.colSafety')}</th>
								<th style={{ ...styles.th, textAlign: 'center' }}>{t('forecast.colRecommended')}</th>
								<th style={{ ...styles.th, textAlign: 'center' }}>{t('forecast.colConfidence')}</th>
								<th style={{ ...styles.th, textAlign: 'center', width: 60 }}>{t('forecast.colDetail')}</th>
							</tr>
						</thead>
						<tbody>
							{forecast.recommendations.map((rec) => {
								const needsOrderFlag = rec.recommendedOrder > 0;
								return (
									<>
										<tr key={rec.materialId} style={needsOrderFlag ? { backgroundColor: '#FFF5F5' } : undefined}>
											<td style={styles.td}>
												<span style={{ fontWeight: 600 }}>{trMaterial(rec.materialName)}</span>
												<span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 4 }}>({trUnit(rec.unit)})</span>
											</td>
											<td style={{ ...styles.td, textAlign: 'center', fontWeight: 600 }}>
												{rec.currentStock}
											</td>
											<td style={{ ...styles.td, textAlign: 'center', color: COLORS.warning, fontWeight: 600 }}>
												{rec.expectedConsumption.toFixed(1)}
											</td>
											<td style={{ ...styles.td, textAlign: 'center', color: COLORS.textMuted }}>
												{rec.safetyStock.toFixed(1)}
											</td>
											<td style={{
												...styles.td,
												textAlign: 'center',
												fontWeight: 800,
												fontSize: 16,
												color: needsOrderFlag ? COLORS.danger : COLORS.success,
											}}>
												{needsOrderFlag ? `+${Math.ceil(rec.recommendedOrder)}` : '-'}
											</td>
											<td style={{ ...styles.td, textAlign: 'center' }}>
												<ConfidenceBadge confidence={rec.confidence} />
											</td>
											<td style={{ ...styles.td, textAlign: 'center' }}>
												<button style={modalStyles.detailBtn} onClick={() => setDetailRec(rec)}>
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

const styles: Record<string, React.CSSProperties> = {
	container: {
		padding: 24,
		maxWidth: 1100,
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
		alignItems: 'flex-start',
		marginBottom: 24,
		flexWrap: 'wrap',
		gap: 16,
	},
	title: {
		margin: 0,
		fontSize: 22,
		fontWeight: 700,
		color: COLORS.text,
	},
	subtitle: {
		fontSize: 14,
		color: COLORS.textMuted,
		margin: '4px 0 0',
	},
	headerRight: {
		display: 'flex',
		alignItems: 'center',
		gap: 12,
	},
	daysSelector: {
		display: 'flex',
		gap: 4,
	},
	dayBtn: {
		padding: '6px 14px',
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 6,
		backgroundColor: COLORS.white,
		fontSize: 13,
		fontWeight: 500,
		color: COLORS.textMuted,
		cursor: 'pointer',
	},
	dayActive: {
		padding: '6px 14px',
		border: `1px solid ${COLORS.primary}`,
		borderRadius: 6,
		backgroundColor: COLORS.primary,
		fontSize: 13,
		fontWeight: 700,
		color: COLORS.white,
		cursor: 'pointer',
	},
	createBtn: {
		padding: '10px 20px',
		border: 'none',
		borderRadius: 8,
		backgroundColor: COLORS.accent,
		color: COLORS.white,
		fontSize: 14,
		fontWeight: 700,
		cursor: 'pointer',
	},
	tableWrap: {
		backgroundColor: COLORS.white,
		borderRadius: 12,
		border: `1px solid ${COLORS.border}`,
		overflow: 'auto',
	},
	table: {
		width: '100%',
		borderCollapse: 'collapse',
	},
	th: {
		padding: '12px 16px',
		fontSize: 13,
		fontWeight: 700,
		color: COLORS.textMuted,
		borderBottom: `2px solid ${COLORS.borderDark}`,
		textAlign: 'left',
		backgroundColor: COLORS.backgroundLight,
		whiteSpace: 'nowrap',
	},
	td: {
		padding: '12px 16px',
		fontSize: 14,
		color: COLORS.text,
		borderBottom: `1px solid ${COLORS.border}`,
	},
};
