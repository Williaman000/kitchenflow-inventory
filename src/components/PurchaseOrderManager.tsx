import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/theme';
import type { Material, PurchaseOrder, PurchaseOrderStatus } from '../types';
import type { CreatePurchaseOrderPayload } from '../services/inventoryApi';
import { formatCurrency } from '../utils/format';
import styles from './PurchaseOrderManager.module.scss';

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
	return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
	const bom = '\uFEFF';
	const csv = bom + [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

const PurchaseOrderManager: FC<Props> = ({
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
}) => {
	const { t } = useTranslation();

	const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
		DRAFT: t('orders.statusDraft'),
		ORDERED: t('orders.statusOrdered'),
		RECEIVED: t('orders.statusReceived'),
		CANCELLED: t('orders.statusCancelled'),
	};

	const [showForm, setShowForm] = useState(false);
	const [formNotes, setFormNotes] = useState('');
	const [formItems, setFormItems] = useState<POFormItem[]>([{ materialId: 0, quantity: '', unitPrice: '' }]);
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');

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

	// 날짜 필터 적용
	const filteredPOs = purchaseOrders.filter((po) => {
		const poDate = po.orderedAt || po.createdAt;
		if (!poDate) return true;
		const d = poDate.slice(0, 10);
		if (dateFrom && d < dateFrom) return false;
		if (dateTo && d > dateTo) return false;
		return true;
	});

	const handleExportCsv = () => {
		const headers = [
			t('orders.colNumber'), t('orders.colStatus'), t('orders.colItemCount'),
			t('orders.colTotal'), t('orders.colOrderDate'), t('orders.colReceivedDate'), t('orders.colNotes'),
		];
		const rows = filteredPOs.map((po) => [
			`#${po.id}`,
			PO_STATUS_LABELS[po.status],
			String(po.itemCount ?? '-'),
			String(po.totalAmount),
			formatDate(po.orderedAt),
			formatDate(po.receivedAt),
			po.notes || '',
		]);
		const dateStr = new Date().toISOString().slice(0, 10);
		downloadCsv(`purchase_orders_${dateStr}.csv`, headers, rows);
	};

	if (isLoading && purchaseOrders.length === 0) {
		return (
			<div className={styles.center}>
				<p className={styles.loadingText}>{t('orders.loading')}</p>
			</div>
		);
	}

	if (error && purchaseOrders.length === 0) {
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
				<h2 className={styles.title}>{t('orders.title')}</h2>
				<button className={styles.refreshBtn} onClick={onLoad}>{t('orders.refresh')}</button>
			</div>

			{/* 상태 필터 + 생성 버튼 */}
			<div className={styles.filterRow}>
				<div className={styles.filterGroup}>
					<button
						onClick={() => onStatusFilterChange(null)}
						className={poStatusFilter === null ? styles.filterActive : styles.filterBtn}
					>
						{t('orders.all')}
					</button>
					{(['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'] as PurchaseOrderStatus[]).map((s) => (
						<button
							key={s}
							onClick={() => onStatusFilterChange(s)}
							className={poStatusFilter === s ? styles.filterActive : styles.filterBtn}
						>
							{PO_STATUS_LABELS[s]}
						</button>
					))}
				</div>
				<div className={styles.buttonGroup}>
					<button className={styles.exportBtn} onClick={handleExportCsv} disabled={filteredPOs.length === 0}>
						{t('orders.exportCsv')}
					</button>
					<button className={styles.addBtn} onClick={() => setShowForm(true)}>
						{t('orders.addBtn')}
					</button>
				</div>
			</div>

			{/* 날짜 필터 */}
			<div className={styles.dateFilterRow}>
				<label className={styles.dateLabel}>{t('orders.dateRange')}</label>
				<input type="date" className={styles.dateInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
				<span className={styles.dateSeparator}>~</span>
				<input type="date" className={styles.dateInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
				{(dateFrom || dateTo) && (
					<button className={styles.dateClearBtn} onClick={() => { setDateFrom(''); setDateTo(''); }}>
						{t('orders.clearDate')}
					</button>
				)}
				<span className={styles.dateCount}>
					{filteredPOs.length} / {purchaseOrders.length} {t('common.items')}
				</span>
			</div>

			{/* 발주 테이블 */}
			<div className={styles.tableWrap}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th className={styles.th}>{t('orders.colNumber')}</th>
							<th className={styles.th}>{t('orders.colStatus')}</th>
							<th className={styles.th} style={{ textAlign: 'center' }}>{t('orders.colItemCount')}</th>
							<th className={styles.th} style={{ textAlign: 'right' }}>{t('orders.colTotal')}</th>
							<th className={styles.th}>{t('orders.colOrderDate')}</th>
							<th className={styles.th}>{t('orders.colReceivedDate')}</th>
							<th className={styles.th}>{t('orders.colNotes')}</th>
							<th className={styles.th} style={{ textAlign: 'center', width: 160 }}>{t('orders.colActions')}</th>
						</tr>
					</thead>
					<tbody>
						{filteredPOs.length === 0 ? (
							<tr>
								<td colSpan={8} className={styles.emptyCell}>
									{t('orders.empty')}
								</td>
							</tr>
						) : (
							filteredPOs.map((po) => (
								<tr key={po.id}>
									<td className={styles.td}>#{po.id}</td>
									<td className={styles.td}>
										<span
											className={styles.statusBadge}
											style={{
												backgroundColor: `${PO_STATUS_COLORS[po.status]}15`,
												color: PO_STATUS_COLORS[po.status],
											}}
										>
											{PO_STATUS_LABELS[po.status]}
										</span>
									</td>
									<td className={styles.td} style={{ textAlign: 'center' }}>{po.itemCount ?? '-'}</td>
									<td className={styles.td} style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(po.totalAmount)}</td>
									<td className={styles.td}>{formatDate(po.orderedAt)}</td>
									<td className={styles.td}>{formatDate(po.receivedAt)}</td>
									<td className={`${styles.td} ${styles.notesCell}`}>
										{po.notes || '-'}
									</td>
									<td className={styles.td} style={{ textAlign: 'center' }}>
										{po.status === 'DRAFT' && (
											<button
												className={styles.statusBtn}
												style={{ backgroundColor: COLORS.primary, color: COLORS.white }}
												onClick={() => onUpdatePOStatus(po.id, 'ORDERED')}
											>
												{t('orders.actionOrder')}
											</button>
										)}
										{po.status === 'ORDERED' && (
											<button
												className={styles.statusBtn}
												style={{ backgroundColor: COLORS.success, color: COLORS.white }}
												onClick={() => onUpdatePOStatus(po.id, 'RECEIVED')}
											>
												{t('orders.actionReceive')}
											</button>
										)}
										{(po.status === 'DRAFT' || po.status === 'ORDERED') && (
											<button
												className={styles.statusBtn}
												style={{ backgroundColor: '#FFEBEE', color: COLORS.danger, marginLeft: 4 }}
												onClick={() => {
													if (confirm(t('orders.cancelConfirm'))) {
														onUpdatePOStatus(po.id, 'CANCELLED');
													}
												}}
											>
												{t('orders.actionCancel')}
											</button>
										)}
										{(po.status === 'RECEIVED' || po.status === 'CANCELLED') && (
											<span className={styles.mutedText}>-</span>
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
				<div className={styles.overlay} onClick={() => setShowForm(false)}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h3 className={styles.modalTitle}>
							{t('orders.modalCreate')}
						</h3>
						<form onSubmit={handleSubmit}>
							<div className={styles.formField}>
								<label className={styles.formLabel}>{t('orders.fieldNotes')}</label>
								<input
									className={styles.formInput}
									value={formNotes}
									onChange={(e) => setFormNotes(e.target.value)}
									placeholder={t('orders.fieldNotesPlaceholder')}
								/>
							</div>

							<div className={styles.itemsSection}>
								<div className={styles.itemsHeader}>
									<label className={styles.formLabel}>{t('orders.fieldItems')}</label>
									<button type="button" className={styles.addItemBtn} onClick={addItem}>{t('orders.addItem')}</button>
								</div>
								{formItems.map((item, idx) => (
									<div key={idx} className={styles.itemRow}>
										<select
											className={styles.formInput}
											style={{ flex: 2 }}
											value={item.materialId}
											onChange={(e) => updateItem(idx, 'materialId', parseInt(e.target.value))}
										>
											<option value={0}>{t('orders.selectMaterial')}</option>
											{materials.map((m) => (
												<option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
											))}
										</select>
										<input
											className={styles.formInput}
											style={{ flex: 1 }}
											type="number"
											min="0.1"
											step="0.1"
											value={item.quantity}
											onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
											placeholder={t('orders.fieldQty')}
										/>
										<input
											className={styles.formInput}
											style={{ flex: 1 }}
											type="number"
											min="0"
											value={item.unitPrice}
											onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
											placeholder={t('orders.fieldUnitPrice')}
										/>
										{formItems.length > 1 && (
											<button
												type="button"
												className={styles.removeItemBtn}
												onClick={() => removeItem(idx)}
											>
												X
											</button>
										)}
									</div>
								))}
							</div>

							<div className={styles.formActions}>
								<button type="button" className={styles.cancelActionBtn} onClick={() => setShowForm(false)}>{t('orders.cancel')}</button>
								<button type="submit" className={styles.submitActionBtn}>{t('orders.create')}</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default PurchaseOrderManager;
