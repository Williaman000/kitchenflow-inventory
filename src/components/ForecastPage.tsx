import { useState } from 'react';
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
	const colorMap: Record<string, { bg: string; fg: string }> = {
		high: { bg: '#E8F5E9', fg: COLORS.success },
		medium: { bg: '#FFF8E1', fg: COLORS.warning },
		low: { bg: '#F5F5F5', fg: COLORS.grey },
	};
	const c = colorMap[confidence] ?? colorMap.low;
	const labelMap: Record<string, string> = { high: '높음', medium: '보통', low: '낮음' };
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

function ExplanationRow({ rec }: { rec: RecommendedOrder }) {
	const [explanation, setExplanation] = useState<string | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleClick = async () => {
		if (isOpen) {
			setIsOpen(false);
			return;
		}
		if (explanation) {
			setIsOpen(true);
			return;
		}
		setLoading(true);
		try {
			const result = await explainForecast(rec.materialId);
			setExplanation(result.explanation);
			setIsOpen(true);
		} catch {
			setExplanation('설명을 가져오는데 실패했습니다.');
			setIsOpen(true);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<button style={rowStyles.whyBtn} onClick={handleClick} disabled={loading}>
				{loading ? '...' : isOpen ? '접기' : '왜?'}
			</button>
			{isOpen && explanation && (
				<tr>
					<td colSpan={7} style={rowStyles.explanationCell}>
						<div style={rowStyles.explanationBox}>
							{explanation}
						</div>
					</td>
				</tr>
			)}
		</>
	);
}

const rowStyles: Record<string, React.CSSProperties> = {
	whyBtn: {
		padding: '4px 10px',
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 6,
		backgroundColor: COLORS.white,
		fontSize: 12,
		fontWeight: 600,
		cursor: 'pointer',
		color: COLORS.accent,
	},
	explanationCell: {
		padding: '0 16px 12px 16px',
		border: 'none',
	},
	explanationBox: {
		padding: '12px 16px',
		backgroundColor: '#E8F5E9',
		borderRadius: 8,
		fontSize: 13,
		lineHeight: 1.6,
		color: COLORS.textDark,
		whiteSpace: 'pre-wrap' as const,
	},
};

export default function ForecastPage({ forecast, forecastDays, isLoading, error, onLoadForecast, onCreatePO }: Props) {
	const [creating, setCreating] = useState(false);

	const handleCreateAllPO = async () => {
		if (!forecast) return;
		const itemsToOrder = forecast.recommendations.filter((r) => r.recommendedOrder > 0);
		if (itemsToOrder.length === 0) return;

		const payload: CreatePurchaseOrderPayload = {
			notes: `AI 발주 추천 (${forecastDays}일 예측)`,
			items: itemsToOrder.map((r) => ({
				materialId: r.materialId,
				quantity: Math.ceil(r.recommendedOrder),
				unitPrice: 0,
			})),
		};

		setCreating(true);
		try {
			await onCreatePO(payload);
			alert('발주가 생성되었습니다!');
		} catch (err) {
			alert(err instanceof Error ? err.message : '발주 생성 실패');
		} finally {
			setCreating(false);
		}
	};

	if (isLoading && !forecast) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.textMuted }}>AI 발주 추천을 분석 중...</p>
			</div>
		);
	}

	if (error && !forecast) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.danger }}>{error}</p>
				<button style={styles.retryBtn} onClick={() => onLoadForecast()}>재시도</button>
			</div>
		);
	}

	const needsOrder = forecast?.recommendations.filter((r) => r.recommendedOrder > 0).length ?? 0;

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<div>
					<h2 style={styles.title}>AI 발주 추천</h2>
					{forecast && (
						<p style={styles.subtitle}>
							발주 필요: <strong style={{ color: needsOrder > 0 ? COLORS.danger : COLORS.success }}>{needsOrder}건</strong>
							{' / '}전체 {forecast.totalMaterials}건
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
								{d}일
							</button>
						))}
					</div>
					{needsOrder > 0 && (
						<button
							style={styles.createBtn}
							onClick={handleCreateAllPO}
							disabled={creating}
						>
							{creating ? '생성 중...' : '추천대로 발주 생성'}
						</button>
					)}
				</div>
			</div>

			{forecast && (
				<div style={styles.tableWrap}>
					<table style={styles.table}>
						<thead>
							<tr>
								<th style={styles.th}>재료명</th>
								<th style={{ ...styles.th, textAlign: 'center' }}>현재재고</th>
								<th style={{ ...styles.th, textAlign: 'center' }}>예상소비</th>
								<th style={{ ...styles.th, textAlign: 'center' }}>안전재고</th>
								<th style={{ ...styles.th, textAlign: 'center' }}>추천발주량</th>
								<th style={{ ...styles.th, textAlign: 'center' }}>신뢰도</th>
								<th style={{ ...styles.th, textAlign: 'center', width: 60 }}>상세</th>
							</tr>
						</thead>
						<tbody>
							{forecast.recommendations.map((rec) => {
								const needsOrderFlag = rec.recommendedOrder > 0;
								return (
									<>
										<tr key={rec.materialId} style={needsOrderFlag ? { backgroundColor: '#FFF5F5' } : undefined}>
											<td style={styles.td}>
												<span style={{ fontWeight: 600 }}>{rec.materialName}</span>
												<span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 4 }}>({rec.unit})</span>
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
												<ExplanationRow rec={rec} />
											</td>
										</tr>
									</>
								);
							})}
						</tbody>
					</table>
				</div>
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
