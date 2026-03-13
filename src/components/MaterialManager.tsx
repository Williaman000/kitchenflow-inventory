import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { trMaterial, trMaterialCategory, trUnit } from '../utils/dbTranslate';
import { COLORS } from '../constants/theme';
import type { Material, BulkImportResult } from '../types';
import type { CreateMaterialPayload, AdjustInventoryPayload, BulkMaterialItem } from '../services/inventoryApi';
import BulkImportModal from './BulkImportModal';

interface Props {
	materials: Material[];
	allMaterials: Material[];
	materialCategories: string[];
	materialCategoryFilter: string | null;
	onCategoryFilterChange: (cat: string | null) => void;
	lowStockCount: number;
	isLoading: boolean;
	error: string | null;
	onLoad: () => void;
	onCreateMaterial: (payload: CreateMaterialPayload) => Promise<void>;
	onUpdateMaterial: (id: number, payload: Partial<CreateMaterialPayload>) => Promise<void>;
	onDeleteMaterial: (id: number) => Promise<void>;
	onAdjustInventory: (payload: AdjustInventoryPayload) => Promise<void>;
	onBulkImport: (items: BulkMaterialItem[]) => Promise<BulkImportResult>;
}

const MaterialManager: FC<Props> = ({
	materials,
	materialCategories,
	materialCategoryFilter,
	onCategoryFilterChange,
	lowStockCount,
	isLoading,
	error,
	onLoad,
	onCreateMaterial,
	onUpdateMaterial,
	onDeleteMaterial,
	onAdjustInventory,
	onBulkImport,
}) => {
	const { t } = useTranslation();
	const [showForm, setShowForm] = useState(false);
	const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
	const [formName, setFormName] = useState('');
	const [formUnit, setFormUnit] = useState('');
	const [formCategory, setFormCategory] = useState('');
	const [formCurrentStock, setFormCurrentStock] = useState('');
	const [formMinimumStock, setFormMinimumStock] = useState('');

	// 일괄 등록 모달
	const [showBulkImport, setShowBulkImport] = useState(false);

	// 재고 조정 모달
	const [adjustModal, setAdjustModal] = useState<Material | null>(null);
	const [adjustQty, setAdjustQty] = useState('');
	const [adjustType, setAdjustType] = useState<'USE_OUT' | 'WASTE'>('USE_OUT');
	const [adjustNotes, setAdjustNotes] = useState('');

	useEffect(() => {
		onLoad();
	}, [onLoad]);

	const openCreateForm = () => {
		setEditingMaterial(null);
		setFormName('');
		setFormUnit('');
		setFormCategory('');
		setFormCurrentStock('');
		setFormMinimumStock('');
		setShowForm(true);
	};

	const openEditForm = (mat: Material) => {
		setEditingMaterial(mat);
		setFormName(mat.name);
		setFormUnit(mat.unit);
		setFormCategory(mat.category);
		setFormCurrentStock(String(mat.currentStock));
		setFormMinimumStock(String(mat.minimumStock));
		setShowForm(true);
	};

	const handleFormSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!formName.trim() || !formUnit.trim()) return;
		const payload: CreateMaterialPayload = {
			name: formName.trim(),
			unit: formUnit.trim(),
			category: formCategory.trim() || '기타',
			currentStock: parseFloat(formCurrentStock) || 0,
			minimumStock: parseFloat(formMinimumStock) || 0,
		};
		try {
			if (editingMaterial) {
				await onUpdateMaterial(editingMaterial.id, payload);
			} else {
				await onCreateMaterial(payload);
			}
			setShowForm(false);
		} catch {
			// error is set by hook
		}
	};

	const handleAdjust = async () => {
		if (!adjustModal || !adjustQty) return;
		await onAdjustInventory({
			materialId: adjustModal.id,
			changeType: adjustType,
			quantityChange: parseFloat(adjustQty),
			notes: adjustNotes.trim() || undefined,
		});
		setAdjustModal(null);
		setAdjustQty('');
		setAdjustNotes('');
	};

	if (isLoading && materials.length === 0) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.textMuted }}>{t('materials.loading')}</p>
			</div>
		);
	}

	if (error && materials.length === 0) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.danger }}>{error}</p>
				<button style={styles.retryBtn} onClick={onLoad}>{t('common.retry')}</button>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h2 style={styles.title}>{t('materials.title')}</h2>
				<div style={styles.headerRight}>
					{lowStockCount > 0 && (
						<span style={styles.lowStockBadge}>{t('materials.lowStockBadge', { count: lowStockCount })}</span>
					)}
					<button style={styles.refreshBtn} onClick={onLoad}>{t('materials.refresh')}</button>
				</div>
			</div>

			{/* 카테고리 필터 + 추가 버튼 */}
			<div style={styles.filterRow}>
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
					<button
						onClick={() => onCategoryFilterChange(null)}
						style={materialCategoryFilter === null ? styles.filterActive : styles.filterBtn}
					>
						{t('materials.all')}
					</button>
					{materialCategories.map((cat) => (
						<button
							key={cat}
							onClick={() => onCategoryFilterChange(cat)}
							style={materialCategoryFilter === cat ? styles.filterActive : styles.filterBtn}
						>
							{trMaterialCategory(cat)}
						</button>
					))}
				</div>
				<div style={{ display: 'flex', gap: 8 }}>
					<button style={styles.uploadBtn} onClick={() => setShowBulkImport(true)}>
						{t('materials.uploadBtn')}
					</button>
					<button style={styles.addBtn} onClick={openCreateForm}>
						{t('materials.addBtn')}
					</button>
				</div>
			</div>

			{/* 재료 테이블 */}
			<div style={styles.tableWrap}>
				<table style={styles.table}>
					<thead>
						<tr>
							<th style={styles.th}>{t('materials.colName')}</th>
							<th style={styles.th}>{t('materials.colCategory')}</th>
							<th style={{ ...styles.th, textAlign: 'center' }}>{t('materials.colCurrentStock')}</th>
							<th style={{ ...styles.th, textAlign: 'center' }}>{t('materials.colMinStock')}</th>
							<th style={{ ...styles.th, textAlign: 'center', width: 100 }}>{t('materials.colStatus')}</th>
							<th style={{ ...styles.th, textAlign: 'center', width: 200 }}>{t('materials.colActions')}</th>
						</tr>
					</thead>
					<tbody>
						{materials.length === 0 ? (
							<tr>
								<td colSpan={6} style={{ ...styles.td, textAlign: 'center', padding: 40, color: COLORS.textMuted }}>
									{t('materials.empty')}
								</td>
							</tr>
						) : (
							materials.map((mat) => {
								const isLow = mat.currentStock <= mat.minimumStock;
								return (
									<tr key={mat.id} style={isLow ? { backgroundColor: '#FFF5F5' } : undefined}>
										<td style={styles.td}>
											<span style={{ fontWeight: 600 }}>{trMaterial(mat.name)}</span>
											{isLow && <span style={styles.lowStockLabel}> {t('materials.statusLow')}</span>}
										</td>
										<td style={styles.td}>{trMaterialCategory(mat.category)}</td>
										<td style={{ ...styles.td, textAlign: 'center', fontWeight: 700, color: isLow ? COLORS.danger : COLORS.text }}>
											{mat.currentStock} {trUnit(mat.unit)}
										</td>
										<td style={{ ...styles.td, textAlign: 'center', color: COLORS.textMuted }}>
											{mat.minimumStock} {trUnit(mat.unit)}
										</td>
										<td style={{ ...styles.td, textAlign: 'center' }}>
											<span style={{
												...styles.statusBadge,
												backgroundColor: isLow ? '#FFEBEE' : '#E8F5E9',
												color: isLow ? COLORS.danger : COLORS.success,
											}}>
												{isLow ? t('materials.statusLow') : t('materials.statusNormal')}
											</span>
										</td>
										<td style={{ ...styles.td, textAlign: 'center' }}>
											<div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
												<button style={styles.actionBtn} onClick={() => setAdjustModal(mat)}>
													{t('materials.actionAdjust')}
												</button>
												<button style={styles.actionBtn} onClick={() => openEditForm(mat)}>
													{t('materials.actionEdit')}
												</button>
												<button
													style={{ ...styles.actionBtn, color: COLORS.danger }}
													onClick={() => {
														if (confirm(t('materials.deleteConfirm', { name: mat.name }))) {
															onDeleteMaterial(mat.id);
														}
													}}
												>
													{t('materials.actionDelete')}
												</button>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* 재료 추가/수정 모달 */}
			{showForm && (
				<div style={styles.overlay} onClick={() => setShowForm(false)}>
					<div style={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: COLORS.text }}>
							{editingMaterial ? t('materials.modalEdit') : t('materials.modalCreate')}
						</h3>
						<form onSubmit={handleFormSubmit}>
							<div style={styles.formField}>
								<label style={styles.formLabel}>{t('materials.fieldName')}</label>
								<input
									style={styles.formInput}
									value={formName}
									onChange={(e) => setFormName(e.target.value)}
									placeholder={t('materials.fieldNamePlaceholder')}
									required
									autoFocus
								/>
							</div>
							<div style={styles.formField}>
								<label style={styles.formLabel}>{t('materials.fieldUnit')}</label>
								<input
									style={styles.formInput}
									value={formUnit}
									onChange={(e) => setFormUnit(e.target.value)}
									placeholder={t('materials.fieldUnitPlaceholder')}
									required
								/>
							</div>
							<div style={styles.formField}>
								<label style={styles.formLabel}>{t('materials.fieldCategory')}</label>
								<input
									style={styles.formInput}
									value={formCategory}
									onChange={(e) => setFormCategory(e.target.value)}
									placeholder={t('materials.fieldCategoryPlaceholder')}
								/>
							</div>
							<div style={{ display: 'flex', gap: 12 }}>
								<div style={{ ...styles.formField, flex: 1 }}>
									<label style={styles.formLabel}>{t('materials.fieldCurrentStock')}</label>
									<input
										style={styles.formInput}
										type="number"
										step="0.1"
										value={formCurrentStock}
										onChange={(e) => setFormCurrentStock(e.target.value)}
										placeholder="0"
									/>
								</div>
								<div style={{ ...styles.formField, flex: 1 }}>
									<label style={styles.formLabel}>{t('materials.fieldMinStock')}</label>
									<input
										style={styles.formInput}
										type="number"
										step="0.1"
										value={formMinimumStock}
										onChange={(e) => setFormMinimumStock(e.target.value)}
										placeholder="0"
									/>
								</div>
							</div>
							<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
								<button type="button" style={styles.cancelActionBtn} onClick={() => setShowForm(false)}>{t('materials.cancel')}</button>
								<button type="submit" style={styles.submitActionBtn}>
									{editingMaterial ? t('materials.edit') : t('materials.register')}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* 사용/폐기 모달 */}
			{adjustModal && (
				<div style={styles.overlay} onClick={() => setAdjustModal(null)}>
					<div style={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: COLORS.text }}>
							{t('materials.adjustTitle', { name: adjustModal.name })}
						</h3>
						<p style={{ margin: '0 0 12px 0', fontSize: 13, color: COLORS.textMuted }}>
							{t('materials.adjustCurrentStock')} <strong>{adjustModal.currentStock} {adjustModal.unit}</strong>
						</p>
						<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
							<button
								onClick={() => setAdjustType('USE_OUT')}
								style={adjustType === 'USE_OUT' ? styles.filterActive : styles.filterBtn}
							>
								{t('materials.adjustUse')}
							</button>
							<button
								onClick={() => setAdjustType('WASTE')}
								style={adjustType === 'WASTE' ? styles.filterActive : styles.filterBtn}
							>
								{t('materials.adjustWaste')}
							</button>
						</div>
						<input
							style={{ ...styles.formInput, width: '100%', marginBottom: 12 }}
							type="number"
							min="0.1"
							step="0.1"
							value={adjustQty}
							onChange={(e) => setAdjustQty(e.target.value)}
							placeholder={t('materials.adjustQtyPlaceholder', { unit: adjustModal.unit })}
							autoFocus
						/>
						<input
							style={{ ...styles.formInput, width: '100%', marginBottom: 16 }}
							value={adjustNotes}
							onChange={(e) => setAdjustNotes(e.target.value)}
							placeholder={t('materials.adjustNotesPlaceholder')}
						/>
						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
							<button style={styles.cancelActionBtn} onClick={() => setAdjustModal(null)}>{t('materials.cancel')}</button>
							<button
								style={{ ...styles.submitActionBtn, opacity: adjustQty ? 1 : 0.5 }}
								onClick={handleAdjust}
								disabled={!adjustQty}
							>
								{t('materials.confirm')}
							</button>
						</div>
					</div>
				</div>
			)}
			{/* 일괄 등록 모달 */}
			{showBulkImport && (
				<BulkImportModal
					onClose={() => setShowBulkImport(false)}
					onImport={onBulkImport}
					onComplete={onLoad}
				/>
			)}
		</div>
	);
};

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
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
	},
	headerRight: {
		display: 'flex',
		alignItems: 'center',
		gap: 10,
	},
	title: {
		margin: 0,
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
	refreshBtn: {
		padding: '8px 16px',
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 6,
		backgroundColor: COLORS.white,
		fontSize: 13,
		fontWeight: 600,
		cursor: 'pointer',
		color: COLORS.textLight,
	},
	lowStockBadge: {
		backgroundColor: '#FFEBEE',
		color: COLORS.danger,
		padding: '4px 12px',
		borderRadius: 20,
		fontSize: 12,
		fontWeight: 700,
	},
	lowStockLabel: {
		fontSize: 11,
		color: COLORS.danger,
		fontWeight: 700,
	},
	filterRow: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 12,
		marginBottom: 20,
	},
	filterBtn: {
		padding: '8px 16px',
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 20,
		backgroundColor: COLORS.white,
		fontSize: 13,
		fontWeight: 500,
		color: COLORS.textMuted,
		cursor: 'pointer',
	},
	filterActive: {
		padding: '8px 16px',
		border: `1px solid ${COLORS.primary}`,
		borderRadius: 20,
		backgroundColor: COLORS.primary,
		fontSize: 13,
		fontWeight: 700,
		color: COLORS.white,
		cursor: 'pointer',
	},
	uploadBtn: {
		padding: '8px 18px',
		border: `1px solid ${COLORS.accent}`,
		borderRadius: 8,
		backgroundColor: COLORS.white,
		color: COLORS.accent,
		fontSize: 13,
		fontWeight: 700,
		cursor: 'pointer',
		whiteSpace: 'nowrap',
	},
	addBtn: {
		padding: '8px 18px',
		border: 'none',
		borderRadius: 8,
		backgroundColor: COLORS.primary,
		color: COLORS.white,
		fontSize: 13,
		fontWeight: 700,
		cursor: 'pointer',
		whiteSpace: 'nowrap',
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
	statusBadge: {
		padding: '4px 10px',
		borderRadius: 12,
		fontSize: 12,
		fontWeight: 700,
	},
	actionBtn: {
		padding: '4px 10px',
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 6,
		backgroundColor: COLORS.white,
		fontSize: 12,
		fontWeight: 600,
		cursor: 'pointer',
		color: COLORS.textLight,
	},
	overlay: {
		position: 'fixed',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0.5)',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1000,
	},
	modal: {
		backgroundColor: COLORS.white,
		borderRadius: 12,
		padding: 24,
		width: '90%',
		maxWidth: 460,
	},
	formField: {
		marginBottom: 14,
	},
	formLabel: {
		display: 'block',
		fontSize: 13,
		fontWeight: 600,
		color: COLORS.textLight,
		marginBottom: 6,
	},
	formInput: {
		padding: '10px 12px',
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 8,
		fontSize: 14,
		outline: 'none',
		boxSizing: 'border-box' as const,
		width: '100%',
	},
	cancelActionBtn: {
		padding: '8px 16px',
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 6,
		backgroundColor: COLORS.white,
		fontSize: 13,
		fontWeight: 600,
		cursor: 'pointer',
		color: COLORS.textLight,
	},
	submitActionBtn: {
		padding: '8px 20px',
		border: 'none',
		borderRadius: 6,
		backgroundColor: COLORS.primary,
		color: COLORS.white,
		fontSize: 13,
		fontWeight: 700,
		cursor: 'pointer',
	},
};

export default MaterialManager;
