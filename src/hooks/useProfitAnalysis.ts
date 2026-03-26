import { useState, useCallback, useEffect, useRef } from 'react';
import type { ProfitAnalysisData } from '../types';
import { fetchProfitAnalysis } from '../services/inventoryAiApi';
import i18n from '../i18n';

export type ProfitPeriod = 'today' | 'week' | 'month';

export function useProfitAnalysis(enabled = false) {
	const [data, setData] = useState<ProfitAnalysisData | null>(null);
	const [period, setPeriod] = useState<ProfitPeriod>('week');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const loaded = useRef(false);

	const loadProfit = useCallback(async (p: ProfitPeriod) => {
		try {
			setIsLoading(true);
			setError(null);
			const result = await fetchProfitAnalysis(p);
			setData(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : i18n.t('errors.profitLoad'));
		} finally {
			setIsLoading(false);
		}
	}, []);

	const changePeriod = useCallback((p: ProfitPeriod) => {
		setPeriod(p);
		loadProfit(p);
	}, [loadProfit]);

	const refresh = useCallback(() => {
		loadProfit(period);
	}, [loadProfit, period]);

	useEffect(() => {
		if (enabled && !loaded.current) {
			loaded.current = true;
			loadProfit(period);
		}
	}, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

	return { data, period, isLoading, error, changePeriod, refresh };
}
