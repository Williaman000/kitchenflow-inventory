import { useState, useCallback, useEffect } from 'react';
import type { SalesTrendData } from '../types';
import { fetchSalesTrends } from '../services/inventoryAiApi';

export type TrendPeriod = 'today' | 'week' | 'month';

export function useSalesTrends() {
	const [data, setData] = useState<SalesTrendData | null>(null);
	const [period, setPeriod] = useState<TrendPeriod>('week');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadTrends = useCallback(async (p: TrendPeriod) => {
		try {
			setIsLoading(true);
			setError(null);
			const result = await fetchSalesTrends(p);
			setData(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : '매출 데이터 로딩 실패');
		} finally {
			setIsLoading(false);
		}
	}, []);

	const changePeriod = useCallback((p: TrendPeriod) => {
		setPeriod(p);
		loadTrends(p);
	}, [loadTrends]);

	useEffect(() => {
		loadTrends(period);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return { data, period, isLoading, error, changePeriod };
}
