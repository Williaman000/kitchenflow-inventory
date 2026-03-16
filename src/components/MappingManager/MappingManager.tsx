import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { trProduct, trMaterial } from '../../utils/dbTranslate';
import type { Material, ProductMaterialMapping } from '../../types';
import type { SimpleProduct } from '../../services/inventoryApi';
import { suggestMappings, type MappingSuggestion } from '../../services/inventoryAiApi';
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

	// Inline editing
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editingQty, setEditingQty] = useState('');

	// AI suggestion
	const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [aiLoading, setAiLoading] = useState(false);
	const [aiSaving, setAiSaving] = useState(false);

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

	const handleAiSuggest = async () => {
		setAiLoading(true);
		try {
			const lang = import.meta.env.VITE_FIXED_LANG || i18n.language || 'ko';
			const result = await suggestMappings(lang);
			setSuggestions(result);
			setShowSuggestions(true);
		} catch {
			alert(t('mappings.aiError'));
		} finally {
			setAiLoading(false);
		}
	};

	const handleSuggestionQtyChange = (idx: number, value: string) => {
		setSuggestions((prev) => prev.map((s, i) => i === idx ? { ...s, quantity_per_unit: parseFloat(value) || 0 } : s));
	};

	const handleRemoveSuggestion = (idx: number) => {
		setSuggestions((prev) => prev.filter((_, i) => i !== idx));
	};

	const handleApplySuggestions = async () => {
		setAiSaving(true);
		try {
			for (const s of suggestions) {
				await onCreate({ productId: s.product_id, materialId: s.material_id, quantityPerUnit: s.quantity_per_unit });
			}
			setShowSuggestions(false);
			setSuggestions([]);
		} catch {
			alert(t('mappings.aiBulkError'));
		} finally {
			setAiSaving(false);
		}
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
					<button className={styles.aiBtn} onClick={handleAiSuggest} disabled={aiLoading}>
						{aiLoading ? t('mappings.aiLoading') : t('mappings.aiSuggest')}
					</button>
					<button className={styles.refreshBtn} onClick={onLoadMappings}>{t('mappings.refresh')}</button>
					<button className={styles.addBtn} onClick={() => setShowForm(true)}>{t('mappings.addBtn')}</button>
				</div>
			</div>

			{/* Mapping table */}
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

			{/* AI suggestion modal */}
			{showSuggestions && (
				<div className={styles.overlay} onClick={() => setShowSuggestions(false)}>
					<div className={styles.aiModal} onClick={(e) => e.stopPropagation()}>
						<div className={styles.aiModalHeader}>
							<h3 className={styles.modalTitle}>{t('mappings.aiTitle')}</h3>
							<span className={styles.aiCount}>{t('mappings.aiCount', { count: suggestions.length })}</span>
						</div>
						<p className={styles.aiHint}>{t('mappings.aiHint')}</p>
						<div className={styles.aiTableWrap}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th className={styles.th}>{t('mappings.colProduct')}</th>
										<th className={styles.th}>{t('mappings.colMaterial')}</th>
										<th className={styles.th} style={{ textAlign: 'center', width: 120 }}>{t('mappings.colQtyPerUnit')}</th>
										<th className={styles.th} style={{ textAlign: 'center', width: 60 }}></th>
									</tr>
								</thead>
								<tbody>
									{suggestions.map((s, idx) => (
										<tr key={`${s.product_id}-${s.material_id}`}>
											<td className={styles.td}><span style={{ fontWeight: 600 }}>{trProduct(s.product_name)}</span></td>
											<td className={styles.td}>{trMaterial(s.material_name)} <span className={styles.materialUnit}>({s.material_unit})</span></td>
											<td className={styles.td} style={{ textAlign: 'center' }}>
												<input
													className={styles.inlineInput}
													type="number"
													min="0.001"
													step="0.001"
													style={{ width: 80 }}
													value={s.quantity_per_unit}
													onChange={(e) => handleSuggestionQtyChange(idx, e.target.value)}
												/>
											</td>
											<td className={styles.td} style={{ textAlign: 'center' }}>
												<button className={styles.actionBtnDanger} onClick={() => handleRemoveSuggestion(idx)}>X</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className={styles.formActions}>
							<button type="button" className={styles.cancelActionBtn} onClick={() => setShowSuggestions(false)}>{t('mappings.cancel')}</button>
							<button
								type="button"
								className={styles.submitActionBtn}
								onClick={handleApplySuggestions}
								disabled={aiSaving || suggestions.length === 0}
							>
								{aiSaving ? t('mappings.aiSaving') : t('mappings.aiApply', { count: suggestions.length })}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Add mapping modal */}
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
