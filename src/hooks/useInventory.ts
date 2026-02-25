import { useState, useCallback } from 'react';
import type { Material, PurchaseOrder, PurchaseOrderStatus } from '../types';
import {
	fetchMaterials,
	createMaterial,
	updateMaterial,
	deleteMaterial,
	fetchPurchaseOrders,
	createPurchaseOrder,
	updatePurchaseOrderStatus,
	adjustInventory,
	type CreateMaterialPayload,
	type CreatePurchaseOrderPayload,
	type AdjustInventoryPayload,
} from '../services/inventoryApi';

export function useInventory() {
	// 재료 상태
	const [materials, setMaterials] = useState<Material[]>([]);
	const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string | null>(null);

	// 발주 상태
	const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
	const [poStatusFilter, setPoStatusFilter] = useState<PurchaseOrderStatus | null>(null);

	// 공통 상태
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// ── 재료 관리 ──

	const loadMaterials = useCallback(async () => {
		try {
			setIsLoading(true);
			const data = await fetchMaterials();
			setMaterials(data);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : '재료 목록 로딩 실패');
		} finally {
			setIsLoading(false);
		}
	}, []);

	const handleCreateMaterial = useCallback(async (payload: CreateMaterialPayload) => {
		try {
			const created = await createMaterial(payload);
			setMaterials((prev) => [...prev, created]);
		} catch (err) {
			setError(err instanceof Error ? err.message : '재료 등록 실패');
			throw err;
		}
	}, []);

	const handleUpdateMaterial = useCallback(async (id: number, payload: Partial<CreateMaterialPayload>) => {
		try {
			const updated = await updateMaterial(id, payload);
			setMaterials((prev) => prev.map((m) => (m.id === id ? updated : m)));
		} catch (err) {
			setError(err instanceof Error ? err.message : '재료 수정 실패');
			throw err;
		}
	}, []);

	const handleDeleteMaterial = useCallback(async (id: number) => {
		try {
			await deleteMaterial(id);
			setMaterials((prev) => prev.filter((m) => m.id !== id));
		} catch (err) {
			setError(err instanceof Error ? err.message : '재료 삭제 실패');
			throw err;
		}
	}, []);

	const handleAdjustInventory = useCallback(async (payload: AdjustInventoryPayload) => {
		try {
			await adjustInventory(payload);
			const data = await fetchMaterials();
			setMaterials(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : '재고 조정 실패');
			throw err;
		}
	}, []);

	// ── 발주 관리 ──

	const loadPurchaseOrders = useCallback(async () => {
		try {
			setIsLoading(true);
			const data = await fetchPurchaseOrders(poStatusFilter ?? undefined);
			setPurchaseOrders(data);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : '발주 목록 로딩 실패');
		} finally {
			setIsLoading(false);
		}
	}, [poStatusFilter]);

	const handleCreatePO = useCallback(async (payload: CreatePurchaseOrderPayload) => {
		try {
			const created = await createPurchaseOrder(payload);
			setPurchaseOrders((prev) => [created, ...prev]);
		} catch (err) {
			setError(err instanceof Error ? err.message : '발주 생성 실패');
			throw err;
		}
	}, []);

	const handleUpdatePOStatus = useCallback(async (id: number, status: PurchaseOrderStatus) => {
		try {
			const updated = await updatePurchaseOrderStatus(id, status);
			setPurchaseOrders((prev) => prev.map((po) => (po.id === id ? updated : po)));
			if (status === 'RECEIVED') {
				const data = await fetchMaterials();
				setMaterials(data);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : '발주 상태 변경 실패');
			throw err;
		}
	}, []);

	// ── 파생 데이터 ──

	const filteredMaterials = materialCategoryFilter
		? materials.filter((m) => m.category === materialCategoryFilter)
		: materials;

	const materialCategories = [...new Set(materials.map((m) => m.category))].sort();
	const lowStockCount = materials.filter((m) => m.isActive && m.currentStock <= m.minimumStock).length;

	return {
		materials: filteredMaterials,
		allMaterials: materials,
		materialCategories,
		materialCategoryFilter,
		setMaterialCategoryFilter,
		lowStockCount,
		purchaseOrders,
		poStatusFilter,
		setPoStatusFilter,
		isLoading,
		error,
		loadMaterials,
		loadPurchaseOrders,
		handleCreateMaterial,
		handleUpdateMaterial,
		handleDeleteMaterial,
		handleAdjustInventory,
		handleCreatePO,
		handleUpdatePOStatus,
	};
}
