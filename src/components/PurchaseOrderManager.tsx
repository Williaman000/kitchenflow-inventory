import { useState, useEffect, type FormEvent } from 'react';
import { COLORS } from '../constants/theme';
import type { Material, PurchaseOrder, PurchaseOrderStatus } from '../types';
import type { CreatePurchaseOrderPayload } from '../services/inventoryApi';
import { formatCurrency } from '../utils/format';

interface Props {
	purchaseOrders: PurchaseOrder[];
	materials: Material[];
	poStatusFilter: PurchaseOrderStatus | null;
	onStatusFilterChange: (status: PurchaseOrderStatus | null) => void;
	isLoading: boolean;
	error: string | null;
	onLoad: () => void;
	onLoadMaterials: () => void;
	onCreatePO: (payload: CreatePurchaseOrderPayload) => Promise<void>;
	onUpdatePOStatus: (id: number, status: PurchaseOrderStatus) => Promise<void>;
}

const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
	DRAFT: '작성중',
	ORDERED: '발주완료',
	RECEIVED: '입고완료',
	CANCELLED: '취소',
};

const PO_STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
	DRAFT: COLORS.textMuted,
	ORDERED: COLORS.primary,
	RECEIVED: COLORS.success,
	CANCELLED: COLORS.danger,
};

interface POFormItem {
	materialId: number;
	quantity: string;
	unitPrice: string;
}

function formatDate(iso: string | null): string {
	if (!iso) return '-';
	return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PurchaseOrderManager({
	purchaseOrders,
	materials,
	poStatusFilter,
	onStatusFilterChange,
	isLoading,
	error,
	onLoad,
	onLoadMaterials,
	onCreatePO,
	onUpdatePOStatus,
}: Props) {
	const [showForm, setShowForm] = useState(false);
	const [formNotes, setFormNotes] = useState('');
	const [formItems, setFormItems] = useState<POFormItem[]>([{ materialId: 0, quantity: '', unitPrice: '' }]);

	useEffect(() => {
		onLoad();
		onLoadMaterials();
	}, [onLoad, onLoadMaterials]);

	const addItem = () => {
		setFormItems((prev) => [...prev, { materialId: 0, quantity: '', unitPrice: '' }]);
	};

	const removeItem = (idx: number) => {
		setFormItems((prev) => prev.filter((_, i) => i !== idx));
	};

	const updateItem = (idx: number, field: keyof POFormItem, value: string | number) => {
		setFormItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		const validItems = formItems.filter((item) => item.materialId > 0 && parseFloat(item.quantity) > 0);
		if (validItems.length === 0) return;

		const payload: CreatePurchaseOrderPayload = {
			notes: formNotes.trim() || undefined,
			items: validItems.map((item) => ({
				materialId: item.materialId,
				quantity: parseFloat(item.quantity),
				unitPrice: parseFloat(item.unitPrice) || 0,
			})),
		};

		try {
			await onCreatePO(payload);
			setShowForm(false);
			setFormNotes('');
			setFormItems([{ materialId: 0, quantity: '', unitPrice: '' }]);
		} catch {
			// error handled by hook
		}
	};

	if (isLoading && purchaseOrders.length === 0) {
		return (
			<div style={styles.center}>
				<p style={{ color: COLORS.textMuted }}>발주 데이터를 불러오는 중...</p>
			</div>
		);
	}

	if (error && purchaseOrders.length === 0) {
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
				<h2 style={styles.title}>발주 관리</h2>
				<button style={styles.refreshBtn} onClick={onLoad}>새로고침</button>
			</div>

			{/* 상태 필터 + 생성 버튼 */}
			<div style={styles.filterRow}>
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
					<button
						onClick={() => onStatusFilterChange(null)}
						style={poStatusFilter === null ? styles.filterActive : styles.filterBtn}
					>
						전체
					</button>
					{(['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'] as PurchaseOrderStatus[]).map((s) => (
						<button
							key={s}
							onClick={() => onStatusFilterChange(s)}
							style={poStatusFilter === s ? styles.filterActive : styles.filterBtn}
						>
							{PO_STATUS_LABELS[s]}
						</button>
					))}
				</div>
				<button style={styles.addBtn} onClick={() => setShowForm(true)}>
					+ 새 발주
				</button>
			</div>

			{/* 발주 테이블 */}
			<div style={styles.tableWrap}>
				<table style={styles.table}>
					<thead>
						<tr>
							<th style={styles.th}>번호</th>
							<th style={styles.th}>상태</th>
							<th style={{ ...styles.th, textAlign: 'center' }}>항목수</th>
							<th style={{ ...styles.th, textAlign: 'right' }}>총액</th>
							<th style={styles.th}>발주일</th>
							<th style={styles.th}>입고일</th>
							<th style={styles.th}>메모</th>
							<th style={{ ...styles.th, textAlign: 'center', width: 160 }}>액션</th>
						</tr>
					</thead>
					<tbody>
						{purchaseOrders.length === 0 ? (
							<tr>
								<td colSpan={8} style={{ ...styles.td, textAlign: 'center', padding: 40, color: COLORS.textMuted }}>
									발주 내역이 없습니다
								</td>
							</tr>
						) : (
							purchaseOrders.map((po) => (
								<tr key={po.id}>
									<td style={styles.td}>#{po.id}</td>
									<td style={styles.td}>
										<span style={{
											...styles.statusBadge,
											backgroundColor: `${PO_STATUS_COLORS[po.status]}15`,
											color: PO_STATUS_COLORS[po.status],
										}}>
											{PO_STATUS_LABELS[po.status]}
										</span>
									</td>
									<td style={{ ...styles.td, textAlign: 'center' }}>{po.itemCount ?? '-'}</td>
									<td style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(po.totalAmount)}</td>
									<td style={styles.td}>{formatDate(po.orderedAt)}</td>
									<td style={styles.td}>{formatDate(po.receivedAt)}</td>
									<td style={{ ...styles.td, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{po.notes || '-'}
									</td>
									<td style={{ ...styles.td, textAlign: 'center' }}>
										{po.status === 'DRAFT' && (
											<button
												style={{ ...styles.statusBtn, backgroundColor: COLORS.primary, color: COLORS.white }}
												onClick={() => onUpdatePOStatus(po.id, 'ORDERED')}
											>
												발주하기
											</button>
										)}
										{po.status === 'ORDERED' && (
											<button
												style={{ ...styles.statusBtn, backgroundColor: COLORS.success, color: COLORS.white }}
												onClick={() => onUpdatePOStatus(po.id, 'RECEIVED')}
											>
												입고완료
											</button>
										)}
										{(po.status === 'DRAFT' || po.status === 'ORDERED') && (
											<button
												style={{ ...styles.statusBtn, backgroundColor: '#FFEBEE', color: COLORS.danger, marginLeft: 4 }}
												onClick={() => {
													if (confirm('이 발주를 취소하시겠습니까?')) {
														onUpdatePOStatus(po.id, 'CANCELLED');
													}
												}}
											>
												취소
											</button>
										)}
										{(po.status === 'RECEIVED' || po.status === 'CANCELLED') && (
											<span style={{ color: COLORS.textMuted, fontSize: 12 }}>-</span>
										)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* 발주 생성 모달 */}
			{showForm && (
				<div style={styles.overlay} onClick={() => setShowForm(false)}>
					<div style={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: COLORS.text }}>
							새 발주 생성
						</h3>
						<form onSubmit={handleSubmit}>
							<div style={styles.formField}>
								<label style={styles.formLabel}>메모</label>
								<input
									style={styles.formInput}
									value={formNotes}
									onChange={(e) => setFormNotes(e.target.value)}
									placeholder="발주 메모 (선택)"
								/>
							</div>

							<div style={{ marginBottom: 16 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
									<label style={styles.formLabel}>발주 항목</label>
									<button type="button" style={styles.addItemBtn} onClick={addItem}>+ 항목 추가</button>
								</div>
								{formItems.map((item, idx) => (
									<div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
										<select
											style={{ ...styles.formInput, flex: 2 }}
											value={item.materialId}
											onChange={(e) => updateItem(idx, 'materialId', parseInt(e.target.value))}
										>
											<option value={0}>재료 선택</option>
											{materials.map((m) => (
												<option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
											))}
										</select>
										<input
											style={{ ...styles.formInput, flex: 1 }}
											type="number"
											min="0.1"
											step="0.1"
											value={item.quantity}
											onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
											placeholder="수량"
										/>
										<input
											style={{ ...styles.formInput, flex: 1 }}
											type="number"
											min="0"
											value={item.unitPrice}
											onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
											placeholder="단가"
										/>
										{formItems.length > 1 && (
											<button
												type="button"
												style={styles.removeItemBtn}
												onClick={() => removeItem(idx)}
											>
												X
											</button>
										)}
									</div>
								))}
							</div>

							<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
								<button type="button" style={styles.cancelActionBtn} onClick={() => setShowForm(false)}>취소</button>
								<button type="submit" style={styles.submitActionBtn}>발주 생성</button>
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
	statusBtn: {
		padding: '6px 12px',
		border: 'none',
		borderRadius: 6,
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
		maxWidth: 600,
		maxHeight: '80vh',
		overflowY: 'auto',
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
	addItemBtn: {
		padding: '4px 12px',
		border: `1px solid ${COLORS.primary}`,
		borderRadius: 6,
		backgroundColor: COLORS.white,
		fontSize: 12,
		fontWeight: 600,
		cursor: 'pointer',
		color: COLORS.primary,
	},
	removeItemBtn: {
		padding: '8px 12px',
		border: `1px solid ${COLORS.danger}`,
		borderRadius: 6,
		backgroundColor: COLORS.white,
		fontSize: 12,
		fontWeight: 700,
		cursor: 'pointer',
		color: COLORS.danger,
		flexShrink: 0,
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
