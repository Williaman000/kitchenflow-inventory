import { useState, useCallback, useEffect } from 'react';
import type { ForecastData } from '../types';
import { fetchForecast } from '../services/inventoryAiApi';

export function useForecast() {
	const [forecast, setForecast] = useState<ForecastData | null>(null);
	const [forecastDays, setForecastDays] = useState(3);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadForecast = useCallback(async (days?: number) => {
		const d = days ?? forecastDays;
		try {
			setIsLoading(true);
			setError(null);
			const result = await fetchForecast(d);
			setForecast(result);
			if (days !== undefined) setForecastDays(days);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'AI 발주 추천 로딩 실패');
		} finally {
			setIsLoading(false);
		}
	}, [forecastDays]);

	useEffect(() => {
		loadForecast();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return { forecast, forecastDays, isLoading, error, loadForecast };
}
