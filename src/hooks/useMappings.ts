import { useState, useCallback } from 'react';
import type { ProductMaterialMapping } from '../types';
import type { SimpleProduct } from '../services/inventoryApi';
import { fetchProducts } from '../services/inventoryApi';
import { fetchMappings, createMapping, updateMapping, deleteMapping } from '../services/inventoryAiApi';

export function useMappings() {
	const [mappings, setMappings] = useState<ProductMaterialMapping[]>([]);
	const [products, setProducts] = useState<SimpleProduct[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadMappings = useCallback(async () => {
		try {
			setIsLoading(true);
			const data = await fetchMappings();
			setMappings(data);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : '매핑 데이터 로딩 실패');
		} finally {
			setIsLoading(false);
		}
	}, []);

	const loadProducts = useCallback(async () => {
		try {
			const data = await fetchProducts();
			setProducts(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : '상품 목록 로딩 실패');
		}
	}, []);

	const handleCreate = useCallback(async (payload: { productId: number; materialId: number; quantityPerUnit: number }) => {
		try {
			const created = await createMapping(payload);
			setMappings((prev) => [...prev, created]);
		} catch (err) {
			setError(err instanceof Error ? err.message : '매핑 추가 실패');
			throw err;
		}
	}, []);

	const handleUpdate = useCallback(async (mappingId: number, quantityPerUnit: number) => {
		try {
			const updated = await updateMapping(mappingId, quantityPerUnit);
			setMappings((prev) => prev.map((m) => (m.id === mappingId ? updated : m)));
		} catch (err) {
			setError(err instanceof Error ? err.message : '매핑 수정 실패');
			throw err;
		}
	}, []);

	const handleDelete = useCallback(async (mappingId: number) => {
		try {
			await deleteMapping(mappingId);
			setMappings((prev) => prev.filter((m) => m.id !== mappingId));
		} catch (err) {
			setError(err instanceof Error ? err.message : '매핑 삭제 실패');
			throw err;
		}
	}, []);

	return {
		mappings,
		products,
		isLoading,
		error,
		loadMappings,
		loadProducts,
		handleCreate,
		handleUpdate,
		handleDelete,
	};
}
