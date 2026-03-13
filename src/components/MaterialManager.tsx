import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { trMaterial, trMaterialCategory, trUnit } from '../utils/dbTranslate';
import { COLORS } from '../constants/theme';
import type { Material, BulkImportResult } from '../types';
import type { CreateMaterialPayload, AdjustInventoryPayload, BulkMaterialItem } from '../services/inventoryApi';
import BulkImportModal from './BulkImportModal';
import styles from './MaterialManager.module.scss';

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
			<div className={styles.center}>
				<p className={styles.loadingText}>{t('materials.loading')}</p>
			</div>
		);
	}

	if (error && materials.length === 0) {
		return (
			<div className={styles.center}>
				<p className={styles.errorText}>{error}</p>
				<button className={styles.retryBtn} onClick={onLoad}>{t('common.retry')}</button>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h2 className={styles.title}>{t('materials.title')}</h2>
				<div className={styles.headerRight}>
					{lowStockCount > 0 && (
						<span className={styles.lowStockBadge}>{t('materials.lowStockBadge', { count: lowStockCount })}</span>
					)}
					<button className={styles.refreshBtn} onClick={onLoad}>{t('materials.refresh')}</button>
				</div>
			</div>

			{/* 카테고리 필터 + 추가 버튼 */}
			<div className={styles.filterRow}>
				<div className={styles.filterGroup}>
					<button
						onClick={() => onCategoryFilterChange(null)}
						className={materialCategoryFilter === null ? styles.filterActive : styles.filterBtn}
					>
						{t('materials.all')}
					</button>
					{materialCategories.map((cat) => (
						<button
							key={cat}
							onClick={() => onCategoryFilterChange(cat)}
							className={materialCategoryFilter === cat ? styles.filterActive : styles.filterBtn}
						>
							{trMaterialCategory(cat)}
						</button>
					))}
				</div>
				<div className={styles.buttonGroup}>
					<button className={styles.uploadBtn} onClick={() => setShowBulkImport(true)}>
						{t('materials.uploadBtn')}
					</button>
					<button className={styles.addBtn} onClick={openCreateForm}>
						{t('materials.addBtn')}
					</button>
				</div>
			</div>

			{/* 재료 테이블 */}
			<div className={styles.tableWrap}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th className={styles.th}>{t('materials.colName')}</th>
							<th className={styles.th}>{t('materials.colCategory')}</th>
							<th className={styles.th} style={{ textAlign: 'center' }}>{t('materials.colCurrentStock')}</th>
							<th className={styles.th} style={{ textAlign: 'center' }}>{t('materials.colMinStock')}</th>
							<th className={styles.th} style={{ textAlign: 'center', width: 100 }}>{t('materials.colStatus')}</th>
							<th className={styles.th} style={{ textAlign: 'center', width: 200 }}>{t('materials.colActions')}</th>
						</tr>
					</thead>
					<tbody>
						{materials.length === 0 ? (
							<tr>
								<td colSpan={6} className={styles.emptyCell}>
									{t('materials.empty')}
								</td>
							</tr>
						) : (
							materials.map((mat) => {
								const isLow = mat.currentStock <= mat.minimumStock;
								return (
									<tr key={mat.id} style={isLow ? { backgroundColor: '#FFF5F5' } : undefined}>
										<td className={styles.td}>
											<span style={{ fontWeight: 600 }}>{trMaterial(mat.name)}</span>
											{isLow && <span className={styles.lowStockLabel}> {t('materials.statusLow')}</span>}
										</td>
										<td className={styles.td}>{trMaterialCategory(mat.category)}</td>
										<td className={styles.td} style={{ textAlign: 'center', fontWeight: 700, color: isLow ? COLORS.danger : COLORS.text }}>
											{mat.currentStock} {trUnit(mat.unit)}
										</td>
										<td className={styles.td} style={{ textAlign: 'center', color: COLORS.textMuted }}>
											{mat.minimumStock} {trUnit(mat.unit)}
										</td>
										<td className={styles.td} style={{ textAlign: 'center' }}>
											<span
												className={styles.statusBadge}
												style={{
													backgroundColor: isLow ? '#FFEBEE' : '#E8F5E9',
													color: isLow ? COLORS.danger : COLORS.success,
												}}
											>
												{isLow ? t('materials.statusLow') : t('materials.statusNormal')}
											</span>
										</td>
										<td className={styles.td} style={{ textAlign: 'center' }}>
											<div className={styles.actionsRow}>
												<button className={styles.actionBtn} onClick={() => setAdjustModal(mat)}>
													{t('materials.actionAdjust')}
												</button>
												<button className={styles.actionBtn} onClick={() => openEditForm(mat)}>
													{t('materials.actionEdit')}
												</button>
												<button
													className={styles.actionBtnDanger}
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
				<div className={styles.overlay} onClick={() => setShowForm(false)}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h3 className={styles.modalTitle}>
							{editingMaterial ? t('materials.modalEdit') : t('materials.modalCreate')}
						</h3>
						<form onSubmit={handleFormSubmit}>
							<div className={styles.formField}>
								<label className={styles.formLabel}>{t('materials.fieldName')}</label>
								<input
									className={styles.formInput}
									value={formName}
									onChange={(e) => setFormName(e.target.value)}
									placeholder={t('materials.fieldNamePlaceholder')}
									required
									autoFocus
								/>
							</div>
							<div className={styles.formField}>
								<label className={styles.formLabel}>{t('materials.fieldUnit')}</label>
								<input
									className={styles.formInput}
									value={formUnit}
									onChange={(e) => setFormUnit(e.target.value)}
									placeholder={t('materials.fieldUnitPlaceholder')}
									required
								/>
							</div>
							<div className={styles.formField}>
								<label className={styles.formLabel}>{t('materials.fieldCategory')}</label>
								<input
									className={styles.formInput}
									value={formCategory}
									onChange={(e) => setFormCategory(e.target.value)}
									placeholder={t('materials.fieldCategoryPlaceholder')}
								/>
							</div>
							<div className={styles.formRow}>
								<div className={styles.formField} style={{ flex: 1 }}>
									<label className={styles.formLabel}>{t('materials.fieldCurrentStock')}</label>
									<input
										className={styles.formInput}
										type="number"
										step="0.1"
										value={formCurrentStock}
										onChange={(e) => setFormCurrentStock(e.target.value)}
										placeholder="0"
									/>
								</div>
								<div className={styles.formField} style={{ flex: 1 }}>
									<label className={styles.formLabel}>{t('materials.fieldMinStock')}</label>
									<input
										className={styles.formInput}
										type="number"
										step="0.1"
										value={formMinimumStock}
										onChange={(e) => setFormMinimumStock(e.target.value)}
										placeholder="0"
									/>
								</div>
							</div>
							<div className={styles.formActions}>
								<button type="button" className={styles.cancelActionBtn} onClick={() => setShowForm(false)}>{t('materials.cancel')}</button>
								<button type="submit" className={styles.submitActionBtn}>
									{editingMaterial ? t('materials.edit') : t('materials.register')}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* 사용/폐기 모달 */}
			{adjustModal && (
				<div className={styles.overlay} onClick={() => setAdjustModal(null)}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h3 className={styles.adjustTitle}>
							{t('materials.adjustTitle', { name: adjustModal.name })}
						</h3>
						<p className={styles.adjustInfo}>
							{t('materials.adjustCurrentStock')} <strong>{adjustModal.currentStock} {adjustModal.unit}</strong>
						</p>
						<div className={styles.adjustTypeRow}>
							<button
								onClick={() => setAdjustType('USE_OUT')}
								className={adjustType === 'USE_OUT' ? styles.filterActive : styles.filterBtn}
							>
								{t('materials.adjustUse')}
							</button>
							<button
								onClick={() => setAdjustType('WASTE')}
								className={adjustType === 'WASTE' ? styles.filterActive : styles.filterBtn}
							>
								{t('materials.adjustWaste')}
							</button>
						</div>
						<input
							className={styles.formInput}
							style={{ marginBottom: 12 }}
							type="number"
							min="0.1"
							step="0.1"
							value={adjustQty}
							onChange={(e) => setAdjustQty(e.target.value)}
							placeholder={t('materials.adjustQtyPlaceholder', { unit: adjustModal.unit })}
							autoFocus
						/>
						<input
							className={styles.formInput}
							style={{ marginBottom: 16 }}
							value={adjustNotes}
							onChange={(e) => setAdjustNotes(e.target.value)}
							placeholder={t('materials.adjustNotesPlaceholder')}
						/>
						<div className={styles.adjustActions}>
							<button className={styles.cancelActionBtn} onClick={() => setAdjustModal(null)}>{t('materials.cancel')}</button>
							<button
								className={styles.submitActionBtn}
								style={{ opacity: adjustQty ? 1 : 0.5 }}
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

export default MaterialManager;
