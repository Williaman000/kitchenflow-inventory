import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { trProduct, trMaterial } from '../utils/dbTranslate';
import { COLORS } from '../constants/theme';
import type { Material, ProductMaterialMapping } from '../types';
import type { SimpleProduct } from '../services/inventoryApi';
import styles from './MappingManager.module.scss';

interface Props {
	mappings: ProductMaterialMapping[];
	products: SimpleProduct[];
	materials: Material[];
	isLoading: boolean;
	error: string | null;
	onLoadMappings: () => void;
	onLoadProducts: () => void;
	onLoadMaterials: () => void;
	onCreate: (payload: { productId: number; materialId: number; quantityPerUnit: number }) => Promise<void>;
	onUpdate: (mappingId: number, quantityPerUnit: number) => Promise<void>;
	onDelete: (mappingId: number) => Promise<void>;
}

const MappingManager: FC<Props> = ({
	mappings,
	products,
	materials,
	isLoading,
	error,
	onLoadMappings,
	onLoadProducts,
	onLoadMaterials,
	onCreate,
	onUpdate,
	onDelete,
}) => {
	const { t } = useTranslation();

	const [showForm, setShowForm] = useState(false);
	const [formProductId, setFormProductId] = useState(0);
	const [formMaterialId, setFormMaterialId] = useState(0);
	const [formQuantity, setFormQuantity] = useState('');

	// 인라인 편집
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editingQty, setEditingQty] = useState('');

	useEffect(() => {
		onLoadMappings();
		onLoadProducts();
		onLoadMaterials();
	}, [onLoadMappings, onLoadProducts, onLoadMaterials]);

	const handleCreateSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (formProductId === 0 || formMaterialId === 0 || !formQuantity) return;
		try {
			await onCreate({
				productId: formProductId,
				materialId: formMaterialId,
				quantityPerUnit: parseFloat(formQuantity),
			});
			setShowForm(false);
			setFormProductId(0);
			setFormMaterialId(0);
			setFormQuantity('');
		} catch {
			// error handled by hook
		}
	};

	const handleUpdateSubmit = async (mappingId: number) => {
		if (!editingQty) return;
		try {
			await onUpdate(mappingId, parseFloat(editingQty));
			setEditingId(null);
			setEditingQty('');
		} catch {
			// error handled by hook
		}
	};

	const startEdit = (mapping: ProductMaterialMapping) => {
		setEditingId(mapping.id);
		setEditingQty(String(mapping.quantityPerUnit));
	};

	if (isLoading && mappings.length === 0) {
		return (
			<div className={styles.center}>
				<p className={styles.loadingText}>{t('mappings.loading')}</p>
			</div>
		);
	}

	if (error && mappings.length === 0) {
		return (
			<div className={styles.center}>
				<p className={styles.errorText}>{error}</p>
				<button className={styles.retryBtn} onClick={onLoadMappings}>{t('common.retry')}</button>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div>
					<h2 className={styles.title}>{t('mappings.title')}</h2>
					<p className={styles.subtitle}>{t('mappings.subtitle')}</p>
				</div>
				<div className={styles.headerRight}>
					<button className={styles.refreshBtn} onClick={onLoadMappings}>{t('mappings.refresh')}</button>
					<button className={styles.addBtn} onClick={() => setShowForm(true)}>{t('mappings.addBtn')}</button>
				</div>
			</div>

			{/* 매핑 테이블 */}
			<div className={styles.tableWrap}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th className={styles.th}>{t('mappings.colProduct')}</th>
							<th className={styles.th}>{t('mappings.colMaterial')}</th>
							<th className={styles.th} style={{ textAlign: 'center' }}>{t('mappings.colQtyPerUnit')}</th>
							<th className={styles.th} style={{ textAlign: 'center', width: 140 }}>{t('mappings.colActions')}</th>
						</tr>
					</thead>
					<tbody>
						{mappings.length === 0 ? (
							<tr>
								<td colSpan={4} className={styles.emptyCell}>
									{t('mappings.empty')}
								</td>
							</tr>
						) : (
							mappings.map((m) => (
								<tr key={m.id}>
									<td className={styles.td}>
										<span style={{ fontWeight: 600 }}>{trProduct(m.productName ?? `상품 #${m.productId}`)}</span>
									</td>
									<td className={styles.td}>
										{trMaterial(m.materialName ?? `재료 #${m.materialId}`)}
										{m.materialUnit && <span className={styles.materialUnit}> ({m.materialUnit})</span>}
									</td>
									<td className={styles.td} style={{ textAlign: 'center' }}>
										{editingId === m.id ? (
											<div className={styles.inlineEditRow}>
												<input
													className={styles.inlineInput}
													style={{ width: 80 }}
													type="number"
													min="0.001"
													step="0.001"
													value={editingQty}
													onChange={(e) => setEditingQty(e.target.value)}
													autoFocus
													onKeyDown={(e) => {
														if (e.key === 'Enter') handleUpdateSubmit(m.id);
														if (e.key === 'Escape') { setEditingId(null); setEditingQty(''); }
													}}
												/>
												<button className={styles.inlineSaveBtn} onClick={() => handleUpdateSubmit(m.id)}>V</button>
												<button className={styles.inlineCancelBtn} onClick={() => { setEditingId(null); setEditingQty(''); }}>X</button>
											</div>
										) : (
											<span style={{ fontWeight: 700 }}>{m.quantityPerUnit}</span>
										)}
									</td>
									<td className={styles.td} style={{ textAlign: 'center' }}>
										<div className={styles.actionsRow}>
											<button className={styles.actionBtn} onClick={() => startEdit(m)}>
												{t('mappings.actionEdit')}
											</button>
											<button
												className={styles.actionBtnDanger}
												onClick={() => {
													if (confirm(t('mappings.deleteConfirm'))) {
														onDelete(m.id);
													}
												}}
											>
												{t('mappings.actionDelete')}
											</button>
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* 매핑 추가 모달 */}
			{showForm && (
				<div className={styles.overlay} onClick={() => setShowForm(false)}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h3 className={styles.modalTitle}>
							{t('mappings.modalCreate')}
						</h3>
						<form onSubmit={handleCreateSubmit}>
							<div className={styles.formField}>
								<label className={styles.formLabel}>{t('mappings.fieldProduct')}</label>
								<select
									className={styles.formInput}
									value={formProductId}
									onChange={(e) => setFormProductId(parseInt(e.target.value))}
									required
								>
									<option value={0}>{t('mappings.selectProduct')}</option>
									{products.map((p) => (
										<option key={p.id} value={p.id}>{p.name} ({p.categoryName})</option>
									))}
								</select>
							</div>
							<div className={styles.formField}>
								<label className={styles.formLabel}>{t('mappings.fieldMaterial')}</label>
								<select
									className={styles.formInput}
									value={formMaterialId}
									onChange={(e) => setFormMaterialId(parseInt(e.target.value))}
									required
								>
									<option value={0}>{t('mappings.selectMaterial')}</option>
									{materials.map((m) => (
										<option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
									))}
								</select>
							</div>
							<div className={styles.formField}>
								<label className={styles.formLabel}>{t('mappings.fieldQtyPerUnit')}</label>
								<input
									className={styles.formInput}
									type="number"
									min="0.001"
									step="0.001"
									value={formQuantity}
									onChange={(e) => setFormQuantity(e.target.value)}
									placeholder={t('mappings.fieldQtyPlaceholder')}
									required
								/>
							</div>
							<div className={styles.formActions}>
								<button type="button" className={styles.cancelActionBtn} onClick={() => setShowForm(false)}>{t('mappings.cancel')}</button>
								<button type="submit" className={styles.submitActionBtn}>{t('mappings.register')}</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default MappingManager;
