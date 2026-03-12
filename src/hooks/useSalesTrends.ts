import { useState, useCallback, useEffect, useRef } from 'react';
import type { SalesTrendData, SalesUploadRecord } from '../types';
import { fetchSalesTrends, fetchSalesUploads, deleteSalesUpload } from '../services/inventoryAiApi';
import i18n from '../i18n';

export type TrendPeriod = 'today' | 'week' | 'month';

export function useSalesTrends(enabled = false) {
	const [data, setData] = useState<SalesTrendData | null>(null);
	const [period, setPeriod] = useState<TrendPeriod>('week');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const loaded = useRef(false);

	// 업로드 이력
	const [uploads, setUploads] = useState<SalesUploadRecord[]>([]);
	const [uploadsLoading, setUploadsLoading] = useState(false);

	const loadTrends = useCallback(async (p: TrendPeriod) => {
		try {
			setIsLoading(true);
			setError(null);
			const result = await fetchSalesTrends(p);
			setData(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : i18n.t('errors.trendsLoad'));
		} finally {
			setIsLoading(false);
		}
	}, []);

	const loadUploads = useCallback(async () => {
		try {
			setUploadsLoading(true);
			const result = await fetchSalesUploads();
			setUploads(result);
		} catch {
			// silent fail
		} finally {
			setUploadsLoading(false);
		}
	}, []);

	const handleDeleteUpload = useCallback(async (uploadId: number) => {
		try {
			await deleteSalesUpload(uploadId);
			setUploads((prev) => prev.filter((u) => u.id !== uploadId));
			loadTrends(period);
		} catch {
			// silent fail
		}
	}, [loadTrends, period]);

	const changePeriod = useCallback((p: TrendPeriod) => {
		setPeriod(p);
		loadTrends(p);
	}, [loadTrends]);

	const refresh = useCallback(() => {
		loadTrends(period);
		loadUploads();
	}, [loadTrends, loadUploads, period]);

	useEffect(() => {
		if (enabled && !loaded.current) {
			loaded.current = true;
			loadTrends(period);
			loadUploads();
		}
	}, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

	return { data, period, isLoading, error, changePeriod, refresh, uploads, uploadsLoading, handleDeleteUpload };
}
