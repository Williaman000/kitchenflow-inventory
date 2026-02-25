import { useState, useCallback } from 'react';
import { fetchInsights } from '../services/inventoryAiApi';
import { fetchMaterials } from '../services/inventoryApi';

export interface DashboardStats {
	totalMaterials: number;
	lowStockCount: number;
	todayRevenue: number;
	pendingOrders: number;
	insights: string[];
}

export function useDashboard() {
	const [stats, setStats] = useState<DashboardStats>({
		totalMaterials: 0,
		lowStockCount: 0,
		todayRevenue: 0,
		pendingOrders: 0,
		insights: [],
	});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadDashboard = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const [insightData, materials] = await Promise.all([
				fetchInsights(),
				fetchMaterials(),
			]);

			const lowCount = materials.filter((m) => m.isActive && m.currentStock <= m.minimumStock).length;

			setStats({
				totalMaterials: materials.length,
				lowStockCount: lowCount,
				todayRevenue: 0,
				pendingOrders: insightData.lowStockCount,
				insights: insightData.insights,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : '대시보드 데이터 로딩 실패');
		} finally {
			setIsLoading(false);
		}
	}, []);

	return { stats, isLoading, error, loadDashboard };
}
