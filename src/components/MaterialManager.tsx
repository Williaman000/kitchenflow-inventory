import { useState, useEffect, type FormEvent } from 'react';
import { COLORS } from '../constants/theme';
import type { Material } from '../types';
import type { CreateMaterialPayload, AdjustInventoryPayload } from '../services/inventoryApi';

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
}

export default function MaterialManager({
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
}: Props) {
	const [showForm, setShowForm] = useState(false);
	const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
	const [formName, setFormName] = useState('');
	const [formUnit, setFormUnit] = useState('');
	const [formCategory, setFormCategory] = useState('');
	const [formCurrentStock, setFormCurrentStock] = useState('');
	const [formMinimumStock, setFormMinimumStock] = useState('');

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
				<p style={{ color: COLORS.textMuted }}>재료 데이터를 불러오는 중...</p>
			</div>
		);
	}

	if (error && materials.length === 0) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.danger }}>{error}</p>
				<button style={styles.retryBtn} onClick={onLoad}>재시도</button>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h2 style={styles.title}>재료 관리</h2>
				<div style={styles.headerRight}>
					{lowStockCount > 0 && (
						<span style={styles.lowStockBadge}>재고 부족 {lowStockCount}건</span>
					)}
					<button style={styles.refreshBtn} onClick={onLoad}>새로고침</button>
				</div>
			</div>

			{/* 카테고리 필터 + 추가 버튼 */}
			<div style={styles.filterRow}>
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
					<button
						onClick={() => onCategoryFilterChange(null)}
						style={materialCategoryFilter === null ? styles.filterActive : styles.filterBtn}
					>
						전체
					</button>
					{materialCategories.map((cat) => (
						<button
							key={cat}
							onClick={() => onCategoryFilterChange(cat)}
							style={materialCategoryFilter === cat ? styles.filterActive : styles.filterBtn}
						>
							{cat}
						</button>
					))}
				</div>
				<button style={styles.addBtn} onClick={openCreateForm}>
					+ 재료 추가
				</button>
			</div>

			{/* 재료 테이블 */}
			<div style={styles.tableWrap}>
				<table style={styles.table}>
					<thead>
						<tr>
							<th style={styles.th}>재료명</th>
							<th style={styles.th}>카테고리</th>
							<th style={{ ...styles.th, textAlign: 'center' }}>현재 재고</th>
							<th style={{ ...styles.th, textAlign: 'center' }}>최소 재고</th>
							<th style={{ ...styles.th, textAlign: 'center', width: 100 }}>상태</th>
							<th style={{ ...styles.th, textAlign: 'center', width: 200 }}>액션</th>
						</tr>
					</thead>
					<tbody>
						{materials.length === 0 ? (
							<tr>
								<td colSpan={6} style={{ ...styles.td, textAlign: 'center', padding: 40, color: COLORS.textMuted }}>
									등록된 재료가 없습니다
								</td>
							</tr>
						) : (
							materials.map((mat) => {
								const isLow = mat.currentStock <= mat.minimumStock;
								return (
									<tr key={mat.id} style={isLow ? { backgroundColor: '#FFF5F5' } : undefined}>
										<td style={styles.td}>
											<span style={{ fontWeight: 600 }}>{mat.name}</span>
											{isLow && <span style={styles.lowStockLabel}> 부족</span>}
										</td>
										<td style={styles.td}>{mat.category}</td>
										<td style={{ ...styles.td, textAlign: 'center', fontWeight: 700, color: isLow ? COLORS.danger : COLORS.text }}>
											{mat.currentStock} {mat.unit}
										</td>
										<td style={{ ...styles.td, textAlign: 'center', color: COLORS.textMuted }}>
											{mat.minimumStock} {mat.unit}
										</td>
										<td style={{ ...styles.td, textAlign: 'center' }}>
											<span style={{
												...styles.statusBadge,
												backgroundColor: isLow ? '#FFEBEE' : '#E8F5E9',
												color: isLow ? COLORS.danger : COLORS.success,
											}}>
												{isLow ? '부족' : '정상'}
											</span>
										</td>
										<td style={{ ...styles.td, textAlign: 'center' }}>
											<div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
												<button style={styles.actionBtn} onClick={() => setAdjustModal(mat)}>
													사용/폐기
												</button>
												<button style={styles.actionBtn} onClick={() => openEditForm(mat)}>
													수정
												</button>
												<button
													style={{ ...styles.actionBtn, color: COLORS.danger }}
													onClick={() => {
														if (confirm(`"${mat.name}" 재료를 삭제하시겠습니까?`)) {
															onDeleteMaterial(mat.id);
														}
													}}
												>
													삭제
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
							{editingMaterial ? '재료 수정' : '재료 추가'}
						</h3>
						<form onSubmit={handleFormSubmit}>
							<div style={styles.formField}>
								<label style={styles.formLabel}>재료명</label>
								<input
									style={styles.formInput}
									value={formName}
									onChange={(e) => setFormName(e.target.value)}
									placeholder="예: 닭고기"
									required
									autoFocus
								/>
							</div>
							<div style={styles.formField}>
								<label style={styles.formLabel}>단위</label>
								<input
									style={styles.formInput}
									value={formUnit}
									onChange={(e) => setFormUnit(e.target.value)}
									placeholder="예: kg, 마리, 개"
									required
								/>
							</div>
							<div style={styles.formField}>
								<label style={styles.formLabel}>카테고리</label>
								<input
									style={styles.formInput}
									value={formCategory}
									onChange={(e) => setFormCategory(e.target.value)}
									placeholder="예: 육류, 양념, 포장재"
								/>
							</div>
							<div style={{ display: 'flex', gap: 12 }}>
								<div style={{ ...styles.formField, flex: 1 }}>
									<label style={styles.formLabel}>현재 재고</label>
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
									<label style={styles.formLabel}>최소 재고</label>
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
								<button type="button" style={styles.cancelActionBtn} onClick={() => setShowForm(false)}>취소</button>
								<button type="submit" style={styles.submitActionBtn}>
									{editingMaterial ? '수정' : '등록'}
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
							{adjustModal.name} — 재고 차감
						</h3>
						<p style={{ margin: '0 0 12px 0', fontSize: 13, color: COLORS.textMuted }}>
							현재 재고: <strong>{adjustModal.currentStock} {adjustModal.unit}</strong>
						</p>
						<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
							<button
								onClick={() => setAdjustType('USE_OUT')}
								style={adjustType === 'USE_OUT' ? styles.filterActive : styles.filterBtn}
							>
								사용
							</button>
							<button
								onClick={() => setAdjustType('WASTE')}
								style={adjustType === 'WASTE' ? styles.filterActive : styles.filterBtn}
							>
								폐기
							</button>
						</div>
						<input
							style={{ ...styles.formInput, width: '100%', marginBottom: 12 }}
							type="number"
							min="0.1"
							step="0.1"
							value={adjustQty}
							onChange={(e) => setAdjustQty(e.target.value)}
							placeholder={`수량 (${adjustModal.unit})`}
							autoFocus
						/>
						<input
							style={{ ...styles.formInput, width: '100%', marginBottom: 16 }}
							value={adjustNotes}
							onChange={(e) => setAdjustNotes(e.target.value)}
							placeholder="사유 (선택)"
						/>
						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
							<button style={styles.cancelActionBtn} onClick={() => setAdjustModal(null)}>취소</button>
							<button
								style={{ ...styles.submitActionBtn, opacity: adjustQty ? 1 : 0.5 }}
								onClick={handleAdjust}
								disabled={!adjustQty}
							>
								확인
							</button>
						</div>
					</div>
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
