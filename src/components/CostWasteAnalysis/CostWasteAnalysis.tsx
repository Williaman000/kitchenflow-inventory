import { useState, useEffect, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { COLORS } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';
import { trProduct } from '../../utils/dbTranslate';
import { fetchCostAnalysis, fetchPeriodComparison, fetchWasteStats } from '../../services/inventoryAiApi';
import type { CostAnalysisData, PeriodComparisonData, WasteStatsData } from '../../types';
import styles from './CostWasteAnalysis.module.scss';

const CostWasteAnalysis: FC = () => {
	const { t } = useTranslation();
	const [costData, setCostData] = useState<CostAnalysisData | null>(null);
	const [wasteData, setWasteData] = useState<WasteStatsData | null>(null);
	const [compData, setCompData] = useState<PeriodComparisonData | null>(null);
	const [compPeriod, setCompPeriod] = useState<'week' | 'month'>('week');
	const [wasteDays, setWasteDays] = useState(30);
	const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [showWasteModal, setShowWasteModal] = useState(false);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			const [cost, waste, comp] = await Promise.all([
				fetchCostAnalysis(),
				fetchWasteStats(wasteDays),
				fetchPeriodComparison(compPeriod),
			]);
			setCostData(cost);
			setWasteData(waste);
			setCompData(comp);
		} catch {
			// error handled silently
		} finally {
			setIsLoading(false);
		}
	}, [wasteDays, compPeriod]);

	useEffect(() => { loadData(); }, [loadData]);

	const changeRate = (rate: number) => {
		const color = rate >= 0 ? '#4CAF50' : '#F44336';
		const icon = rate >= 0 ? '▲' : '▼';
		return <span style={{ color, fontWeight: 700 }}>{icon} {Math.abs(rate)}%</span>;
	};

	if (isLoading) return <div className={styles.container}><p className={styles.loading}>{t('costAnalysis.loading')}</p></div>;

	return (
		<div className={styles.container}>
			{/* Period Comparison */}
			{compData && (
				<section id="section-comparison" className={styles.section}>
					<div className={styles.sectionHeader}>
						<h2 className={styles.sectionTitle}>{t('comparison.title')}</h2>
						<div className={styles.periodBtns}>
							<button className={`${styles.periodBtn} ${compPeriod === 'week' ? styles.active : ''}`} onClick={() => setCompPeriod('week')}>{t('comparison.week')}</button>
							<button className={`${styles.periodBtn} ${compPeriod === 'month' ? styles.active : ''}`} onClick={() => setCompPeriod('month')}>{t('comparison.month')}</button>
						</div>
					</div>
					<div className={styles.compGrid}>
						<div className={styles.compCard}>
							<div className={styles.compLabel}>{t('comparison.current')}</div>
							<div className={styles.compPeriod}>{compData.current.startDate} ~ {compData.current.endDate}</div>
							<div className={styles.compValue}>{formatCurrency(compData.current.totalRevenue)}</div>
							<div className={styles.compSub}>{compData.current.totalChickenCount}{t('trends.unitChicken')} / {compData.current.totalOrders}{t('trends.unitOrders')}</div>
						</div>
						<div className={styles.compVs}>VS</div>
						<div className={styles.compCard}>
							<div className={styles.compLabel}>{t('comparison.previous')}</div>
							<div className={styles.compPeriod}>{compData.previous.startDate} ~ {compData.previous.endDate}</div>
							<div className={styles.compValue}>{formatCurrency(compData.previous.totalRevenue)}</div>
							<div className={styles.compSub}>{compData.previous.totalChickenCount}{t('trends.unitChicken')} / {compData.previous.totalOrders}{t('trends.unitOrders')}</div>
						</div>
					</div>
					<div className={styles.changeRow}>
						<div className={styles.changeItem}>{t('comparison.revenueChange')}: {changeRate(compData.revenueChangeRate)}</div>
						<div className={styles.changeItem}>{t('comparison.chickenChange')}: {changeRate(compData.chickenChangeRate)}</div>
					</div>
				</section>
			)}

			{/* Cost Analysis */}
			{costData && (
				<section id="section-cost" className={styles.section}>
					<div className={styles.sectionHeader}>
						<h2 className={styles.sectionTitle}>{t('costAnalysis.title')}</h2>
						<button className={styles.navBtn} onClick={() => setShowWasteModal(true)}>{t('wasteStats.title')}</button>
					</div>
					<div className={styles.summaryRow}>
						<div className={styles.summaryCard}>
							<div className={styles.summaryLabel}>{t('costAnalysis.avgMarginRate')}</div>
							<div className={styles.summaryValue}>{costData.avgMarginRate}%</div>
						</div>
					</div>
					{costData.products.length > 0 ? (
						<>
							<div className={styles.chartWrap}>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={costData.products.map(p => ({ name: trProduct(p.productName), marginRate: p.marginRate }))} layout="vertical">
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis type="number" domain={[0, 100]} fontSize={11} tickFormatter={(v) => `${v}%`} />
										<YAxis type="category" dataKey="name" fontSize={11} width={120} />
										<Tooltip formatter={(v) => [`${v}%`, t('costAnalysis.marginRate')]} />
										<Bar dataKey="marginRate" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
							<div className={styles.tableWrap}>
								<table className={styles.table}>
									<thead>
										<tr>
											<th className={styles.th}>{t('costAnalysis.productName')}</th>
											<th className={styles.th}>{t('costAnalysis.price')}</th>
											<th className={styles.th}>{t('costAnalysis.materialCost')}</th>
											<th className={styles.th}>{t('costAnalysis.margin')}</th>
											<th className={styles.th}>{t('costAnalysis.marginRate')}</th>
										</tr>
									</thead>
									<tbody>
										{costData.products.map((p) => (
											<>
												<tr key={p.productId} className={styles.clickableRow} onClick={() => setExpandedProduct(expandedProduct === p.productId ? null : p.productId)}>
													<td className={styles.td}>{expandedProduct === p.productId ? '▼' : '▶'} {trProduct(p.productName)}</td>
													<td className={styles.td}>{formatCurrency(p.price)}</td>
													<td className={styles.td}>{p.materialCost > 0 ? formatCurrency(p.materialCost) : <span className={styles.noCost}>{t('costAnalysis.noCost')}</span>}</td>
													<td className={styles.td}>{formatCurrency(p.margin)}</td>
													<td className={styles.td}><strong>{p.marginRate}%</strong></td>
												</tr>
												{expandedProduct === p.productId && p.materials.length > 0 && (
													<tr key={`detail-${p.productId}`}>
														<td colSpan={5} className={styles.detailCell}>
															<table className={styles.detailTable}>
																<thead>
																	<tr>
																		<th>{t('wasteStats.materialName')}</th>
																		<th>{t('materials.fieldUnit')}</th>
																		<th>{t('trends.totalQuantity')}</th>
																		<th>{t('materials.fieldUnitPrice')}</th>
																		<th>{t('costAnalysis.materialCost')}</th>
																	</tr>
																</thead>
																<tbody>
																	{p.materials.map((m, i) => (
																		<tr key={i}>
																			<td>{m.name}</td>
																			<td>{m.unit}</td>
																			<td>{m.qty}</td>
																			<td>{formatCurrency(m.unitPrice)}</td>
																			<td>{formatCurrency(m.cost)}</td>
																		</tr>
																	))}
																</tbody>
															</table>
														</td>
													</tr>
												)}
											</>
										))}
									</tbody>
								</table>
							</div>
						</>
					) : (
						<p className={styles.noData}>{t('costAnalysis.noData')}</p>
					)}
				</section>
			)}

			{/* Waste Statistics Modal */}
			{showWasteModal && wasteData && (
				<div className={styles.modalOverlay} onClick={() => setShowWasteModal(false)}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h3>{t('wasteStats.title')}</h3>
							<div className={styles.modalHeaderRight}>
								<div className={styles.periodBtns}>
									{[7, 14, 30, 90].map((d) => (
										<button key={d} className={`${styles.periodBtn} ${wasteDays === d ? styles.active : ''}`} onClick={() => setWasteDays(d)}>{d}{t('wasteStats.days')}</button>
									))}
								</div>
								<button className={styles.modalClose} onClick={() => setShowWasteModal(false)}>✕</button>
							</div>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.summaryRow}>
								<div className={styles.summaryCard}>
									<div className={styles.summaryLabel}>{t('wasteStats.totalCount')}</div>
									<div className={styles.summaryValue}>{wasteData.totalWasteCount}{t('wasteStats.unitCount')}</div>
								</div>
								<div className={styles.summaryCard}>
									<div className={styles.summaryLabel}>{t('wasteStats.totalCost')}</div>
									<div className={styles.summaryValue}>{formatCurrency(wasteData.totalWasteCost)}</div>
								</div>
							</div>
							{wasteData.byMaterial.length > 0 ? (
								<div className={styles.tableWrap}>
									<table className={styles.table}>
										<thead>
											<tr>
												<th className={styles.th}>{t('wasteStats.materialName')}</th>
												<th className={styles.th}>{t('wasteStats.totalWaste')}</th>
												<th className={styles.th}>{t('wasteStats.wasteCost')}</th>
												<th className={styles.th}>{t('wasteStats.count')}</th>
											</tr>
										</thead>
										<tbody>
											{wasteData.byMaterial.map((m) => (
												<tr key={m.materialId}>
													<td className={styles.td}>{m.materialName} ({m.unit})</td>
													<td className={styles.td}>{m.totalWaste}</td>
													<td className={styles.td}>{formatCurrency(m.wasteCost)}</td>
													<td className={styles.td}>{m.count}{t('wasteStats.unitCount')}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<p className={styles.noData}>{t('wasteStats.noData')}</p>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default CostWasteAnalysis;
