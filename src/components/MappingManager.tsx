import { useState, useEffect, type FormEvent } from 'react';
import { COLORS } from '../constants/theme';
import type { Material, ProductMaterialMapping } from '../types';
import type { SimpleProduct } from '../services/inventoryApi';

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

export default function MappingManager({
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
}: Props) {
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
			<div style={styles.center}>
				<p style={{ color: COLORS.textMuted }}>매핑 데이터를 불러오는 중...</p>
			</div>
		);
	}

	if (error && mappings.length === 0) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.danger }}>{error}</p>
				<button style={styles.retryBtn} onClick={onLoadMappings}>재시도</button>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<div>
					<h2 style={styles.title}>상품-재료 매핑</h2>
					<p style={styles.subtitle}>상품 1개당 필요한 재료 소비량을 설정합니다. AI 발주 추천에 활용됩니다.</p>
				</div>
				<div style={styles.headerRight}>
					<button style={styles.refreshBtn} onClick={onLoadMappings}>새로고침</button>
					<button style={styles.addBtn} onClick={() => setShowForm(true)}>+ 매핑 추가</button>
				</div>
			</div>

			{/* 매핑 테이블 */}
			<div style={styles.tableWrap}>
				<table style={styles.table}>
					<thead>
						<tr>
							<th style={styles.th}>상품명</th>
							<th style={styles.th}>재료명</th>
							<th style={{ ...styles.th, textAlign: 'center' }}>단위소비량</th>
							<th style={{ ...styles.th, textAlign: 'center', width: 140 }}>액션</th>
						</tr>
					</thead>
					<tbody>
						{mappings.length === 0 ? (
							<tr>
								<td colSpan={4} style={{ ...styles.td, textAlign: 'center', padding: 40, color: COLORS.textMuted }}>
									등록된 매핑이 없습니다
								</td>
							</tr>
						) : (
							mappings.map((m) => (
								<tr key={m.id}>
									<td style={styles.td}>
										<span style={{ fontWeight: 600 }}>{m.productName ?? `상품 #${m.productId}`}</span>
									</td>
									<td style={styles.td}>
										{m.materialName ?? `재료 #${m.materialId}`}
										{m.materialUnit && <span style={{ color: COLORS.textMuted, fontSize: 12 }}> ({m.materialUnit})</span>}
									</td>
									<td style={{ ...styles.td, textAlign: 'center' }}>
										{editingId === m.id ? (
											<div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center' }}>
												<input
													style={{ ...styles.inlineInput, width: 80 }}
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
												<button style={styles.inlineSaveBtn} onClick={() => handleUpdateSubmit(m.id)}>V</button>
												<button style={styles.inlineCancelBtn} onClick={() => { setEditingId(null); setEditingQty(''); }}>X</button>
											</div>
										) : (
											<span style={{ fontWeight: 700 }}>{m.quantityPerUnit}</span>
										)}
									</td>
									<td style={{ ...styles.td, textAlign: 'center' }}>
										<div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
											<button style={styles.actionBtn} onClick={() => startEdit(m)}>
												수정
											</button>
											<button
												style={{ ...styles.actionBtn, color: COLORS.danger }}
												onClick={() => {
													if (confirm('이 매핑을 삭제하시겠습니까?')) {
														onDelete(m.id);
													}
												}}
											>
												삭제
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
				<div style={styles.overlay} onClick={() => setShowForm(false)}>
					<div style={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: COLORS.text }}>
							매핑 추가
						</h3>
						<form onSubmit={handleCreateSubmit}>
							<div style={styles.formField}>
								<label style={styles.formLabel}>상품</label>
								<select
									style={styles.formInput}
									value={formProductId}
									onChange={(e) => setFormProductId(parseInt(e.target.value))}
									required
								>
									<option value={0}>상품 선택</option>
									{products.map((p) => (
										<option key={p.id} value={p.id}>{p.name} ({p.categoryName})</option>
									))}
								</select>
							</div>
							<div style={styles.formField}>
								<label style={styles.formLabel}>재료</label>
								<select
									style={styles.formInput}
									value={formMaterialId}
									onChange={(e) => setFormMaterialId(parseInt(e.target.value))}
									required
								>
									<option value={0}>재료 선택</option>
									{materials.map((m) => (
										<option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
									))}
								</select>
							</div>
							<div style={styles.formField}>
								<label style={styles.formLabel}>단위소비량</label>
								<input
									style={styles.formInput}
									type="number"
									min="0.001"
									step="0.001"
									value={formQuantity}
									onChange={(e) => setFormQuantity(e.target.value)}
									placeholder="상품 1개당 사용량"
									required
								/>
							</div>
							<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
								<button type="button" style={styles.cancelActionBtn} onClick={() => setShowForm(false)}>취소</button>
								<button type="submit" style={styles.submitActionBtn}>등록</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	container: {
		padding: 24,
		maxWidth: 900,
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
		alignItems: 'flex-start',
		marginBottom: 24,
		gap: 16,
	},
	headerRight: {
		display: 'flex',
		alignItems: 'center',
		gap: 10,
		flexShrink: 0,
	},
	title: {
		margin: 0,
		fontSize: 22,
		fontWeight: 700,
		color: COLORS.text,
	},
	subtitle: {
		fontSize: 13,
		color: COLORS.textMuted,
		margin: '4px 0 0',
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
	inlineInput: {
		padding: '4px 8px',
		border: `1px solid ${COLORS.primary}`,
		borderRadius: 4,
		fontSize: 14,
		outline: 'none',
		textAlign: 'center' as const,
	},
	inlineSaveBtn: {
		padding: '4px 8px',
		border: 'none',
		borderRadius: 4,
		backgroundColor: COLORS.success,
		color: COLORS.white,
		fontSize: 12,
		fontWeight: 700,
		cursor: 'pointer',
	},
	inlineCancelBtn: {
		padding: '4px 8px',
		border: 'none',
		borderRadius: 4,
		backgroundColor: COLORS.danger,
		color: COLORS.white,
		fontSize: 12,
		fontWeight: 700,
		cursor: 'pointer',
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
