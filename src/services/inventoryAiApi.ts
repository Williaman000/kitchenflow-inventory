import type { SalesTrendData, ForecastData, InsightData, ProductMaterialMapping, SalesUploadRecord, SalesUploadResult, CostAnalysisData, PeriodComparisonData, WasteStatsData, ProfitAnalysisData } from '../types';
import { API_BASE_URL, getApiToken, request } from './api';

// ── Backend DTOs (snake_case) ──

interface ChatResponseDto {
	answer: string;
	data: Record<string, unknown> | null;
	data_type: string | null;
}

interface DailySalesPointDto {
	date: string;
	total_quantity: number;
	total_revenue: number;
	order_count: number;
	chicken_count: number;
}

interface ProductSalesItemDto {
	product_id: number;
	product_name: string;
	total_quantity: number;
	total_revenue: number;
}

interface DayOfWeekPointDto {
	day: string;
	avg_quantity: number;
	avg_revenue: number;
}

interface SalesTrendDto {
	period: string;
	start_date: string;
	end_date: string;
	total_revenue: number;
	total_quantity: number;
	total_orders: number;
	total_chicken_count: number;
	daily_breakdown: DailySalesPointDto[];
	product_ranking: ProductSalesItemDto[];
	day_of_week_pattern: DayOfWeekPointDto[];
}

interface RecommendedOrderDto {
	material_id: number;
	material_name: string;
	unit: string;
	current_stock: number;
	minimum_stock: number;
	expected_consumption: number;
	safety_stock: number;
	recommended_order: number;
	confidence: string;
	breakdown: Record<string, unknown>;
	lead_time_days: number;
	order_deadline_hour: number;
	delivery_day_of_week: number | null;
	is_order_urgent: boolean;
	order_deadline_display: string;
}

interface ForecastDto {
	forecast_days: number;
	generated_at: string;
	recommendations: RecommendedOrderDto[];
	total_materials: number;
	needs_ordering: number;
}

interface InsightDto {
	generated_at: string;
	insights: string[];
	low_stock_count: number;
	top_seller: string | null;
}

interface MappingDto {
	id: number;
	product_id: number;
	material_id: number;
	quantity_per_unit: number;
	product_name: string | null;
	material_name: string | null;
	material_unit: string | null;
}

// ── AI Chat ──

export interface ChatHistoryItem {
	role: 'user' | 'assistant';
	content: string;
}

export async function sendChat(message: string, language: string = 'ko', history: ChatHistoryItem[] = []): Promise<{ answer: string; data: Record<string, unknown> | null; dataType: string | null }> {
	const dto = await request<ChatResponseDto>('/api/v1/inventory-ai/chat', {
		method: 'POST',
		body: JSON.stringify({ message, language, history: history.slice(-5) }),
	});
	return {
		answer: dto.answer,
		data: dto.data,
		dataType: dto.data_type,
	};
}

export async function sendChatWithFile(
	file: File,
	message: string,
	language: string = 'ko',
): Promise<{ answer: string; data: Record<string, unknown> | null; dataType: string | null }> {
	const token = getApiToken();
	const formData = new FormData();
	formData.append('file', file);
	formData.append('message', message);
	formData.append('language', language);

	const response = await fetch(`${API_BASE_URL}/api/v1/inventory-ai/chat-with-file`, {
		method: 'POST',
		headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
		body: formData,
	});
	if (!response.ok) {
		throw new Error(`Upload failed: ${response.status}`);
	}
	const json = await response.json();
	const dto = json.data as ChatResponseDto;
	return { answer: dto.answer, data: dto.data, dataType: dto.data_type };
}

// ── Sales Trends ──

export async function fetchSalesTrends(period: string): Promise<SalesTrendData> {
	const dto = await request<SalesTrendDto>(`/api/v1/inventory-ai/sales-trends?period=${period}`);
	return {
		period: dto.period,
		startDate: dto.start_date,
		endDate: dto.end_date,
		totalRevenue: dto.total_revenue,
		totalQuantity: dto.total_quantity,
		totalOrders: dto.total_orders,
		totalChickenCount: dto.total_chicken_count ?? 0,
		dailyBreakdown: dto.daily_breakdown.map((d) => ({
			date: d.date,
			totalQuantity: d.total_quantity,
			totalRevenue: d.total_revenue,
			orderCount: d.order_count,
			chickenCount: d.chicken_count ?? 0,
		})),
		productRanking: dto.product_ranking.map((r) => ({
			productId: r.product_id,
			productName: r.product_name,
			totalQuantity: r.total_quantity,
			totalRevenue: r.total_revenue,
		})),
		dayOfWeekPattern: dto.day_of_week_pattern.map((d) => ({
			day: d.day,
			avgQuantity: d.avg_quantity,
			avgRevenue: d.avg_revenue,
		})),
	};
}

// ── Demand Forecast ──

export async function fetchForecast(forecastDays?: number): Promise<ForecastData> {
	const params = forecastDays ? `?forecast_days=${forecastDays}` : '';
	const dto = await request<ForecastDto>(`/api/v1/inventory-ai/forecast${params}`);
	return {
		forecastDays: dto.forecast_days,
		generatedAt: dto.generated_at,
		recommendations: dto.recommendations.map((r) => ({
			materialId: r.material_id,
			materialName: r.material_name,
			unit: r.unit,
			currentStock: r.current_stock,
			minimumStock: r.minimum_stock,
			expectedConsumption: r.expected_consumption,
			safetyStock: r.safety_stock,
			recommendedOrder: r.recommended_order,
			confidence: r.confidence,
			breakdown: r.breakdown,
			leadTimeDays: r.lead_time_days,
			orderDeadlineHour: r.order_deadline_hour,
			deliveryDayOfWeek: r.delivery_day_of_week,
			isOrderUrgent: r.is_order_urgent,
			orderDeadlineDisplay: r.order_deadline_display,
		})),
		totalMaterials: dto.total_materials,
		needsOrdering: dto.needs_ordering,
	};
}

// ── Explain Forecast ──

export async function explainForecast(materialId: number, language: string = 'ko'): Promise<{ explanation: string }> {
	return await request<{ explanation: string }>(`/api/v1/inventory-ai/forecast/${materialId}/explain?language=${language}`);
}

// ── AI Insights ──

export async function fetchInsights(language: string = 'ko'): Promise<InsightData> {
	const dto = await request<InsightDto>(`/api/v1/inventory-ai/insights?language=${language}`);
	return {
		generatedAt: dto.generated_at,
		insights: dto.insights,
		lowStockCount: dto.low_stock_count,
		topSeller: dto.top_seller,
	};
}

// ── Product-Material Mappings ──

function toMapping(dto: MappingDto): ProductMaterialMapping {
	return {
		id: dto.id,
		productId: dto.product_id,
		materialId: dto.material_id,
		quantityPerUnit: dto.quantity_per_unit,
		productName: dto.product_name ?? undefined,
		materialName: dto.material_name ?? undefined,
		materialUnit: dto.material_unit ?? undefined,
	};
}

export async function fetchMappings(): Promise<ProductMaterialMapping[]> {
	const dtos = await request<MappingDto[]>('/api/v1/inventory-ai/mappings');
	return dtos.map(toMapping);
}

export async function createMapping(payload: { productId: number; materialId: number; quantityPerUnit: number }): Promise<ProductMaterialMapping> {
	const dto = await request<MappingDto>('/api/v1/inventory-ai/mappings', {
		method: 'POST',
		body: JSON.stringify({
			product_id: payload.productId,
			material_id: payload.materialId,
			quantity_per_unit: payload.quantityPerUnit,
		}),
	});
	return toMapping(dto);
}

export async function updateMapping(mappingId: number, quantityPerUnit: number): Promise<ProductMaterialMapping> {
	const dto = await request<MappingDto>(`/api/v1/inventory-ai/mappings/${mappingId}`, {
		method: 'PATCH',
		body: JSON.stringify({ quantity_per_unit: quantityPerUnit }),
	});
	return toMapping(dto);
}

export async function deleteMapping(mappingId: number): Promise<void> {
	await request<void>(`/api/v1/inventory-ai/mappings/${mappingId}`, { method: 'DELETE' });
}

export interface MappingSuggestion {
	product_id: number;
	material_id: number;
	quantity_per_unit: number;
	product_name: string;
	material_name: string;
	material_unit: string;
}

export async function suggestMappings(language: string = 'ko'): Promise<MappingSuggestion[]> {
	return await request<MappingSuggestion[]>(`/api/v1/inventory-ai/mappings/suggest?language=${language}`, {
		method: 'POST',
	});
}

// ── Sales Upload ──

interface SalesUploadResultDto {
	upload_id: number;
	imported: number;
	skipped: number;
	matched_products: number;
	errors: { row: number; message: string }[];
}

interface SalesUploadReadDto {
	id: number;
	file_name: string;
	total_rows: number;
	imported_rows: number;
	created_at: string;
}

export interface SalesUploadItemPayload {
	sale_date: string;
	product_name: string;
	quantity: number;
	revenue: number;
	unit_price: number;
	category: string | null;
	order_number: string | null;
}

export async function uploadSalesData(fileName: string, items: SalesUploadItemPayload[]): Promise<SalesUploadResult> {
	const dto = await request<SalesUploadResultDto>('/api/v1/inventory-ai/sales-upload', {
		method: 'POST',
		body: JSON.stringify({ file_name: fileName, items }),
	});
	return {
		uploadId: dto.upload_id,
		imported: dto.imported,
		skipped: dto.skipped,
		matchedProducts: dto.matched_products,
		errors: dto.errors,
	};
}

export async function fetchSalesUploads(): Promise<SalesUploadRecord[]> {
	const dtos = await request<SalesUploadReadDto[]>('/api/v1/inventory-ai/sales-uploads');
	return dtos.map((u) => ({
		id: u.id,
		fileName: u.file_name,
		totalRows: u.total_rows,
		importedRows: u.imported_rows,
		createdAt: u.created_at,
	}));
}

export async function deleteSalesUpload(uploadId: number): Promise<void> {
	await request<void>(`/api/v1/inventory-ai/sales-uploads/${uploadId}`, { method: 'DELETE' });
}

// ── Profit Analysis ──

interface ProfitAnalysisDto {
	period: string;
	start_date: string;
	end_date: string;
	total_revenue: number;
	total_material_cost: number;
	total_profit: number;
	overall_margin_rate: number;
	daily_breakdown: { date: string; revenue: number; material_cost: number; profit: number; margin_rate: number }[];
	product_breakdown: { product_id: number; product_name: string; revenue: number; quantity: number; material_cost: number; profit: number; margin_rate: number }[];
	unmapped_revenue: number;
	cost_coverage_rate: number;
}

export async function fetchProfitAnalysis(period: string): Promise<ProfitAnalysisData> {
	const dto = await request<ProfitAnalysisDto>(`/api/v1/inventory-ai/profit-analysis?period=${period}`);
	return {
		period: dto.period,
		startDate: dto.start_date,
		endDate: dto.end_date,
		totalRevenue: dto.total_revenue,
		totalMaterialCost: dto.total_material_cost,
		totalProfit: dto.total_profit,
		overallMarginRate: dto.overall_margin_rate,
		dailyBreakdown: dto.daily_breakdown.map((d) => ({
			date: d.date,
			revenue: d.revenue,
			materialCost: d.material_cost,
			profit: d.profit,
			marginRate: d.margin_rate,
		})),
		productBreakdown: dto.product_breakdown.map((p) => ({
			productId: p.product_id,
			productName: p.product_name,
			revenue: p.revenue,
			quantity: p.quantity,
			materialCost: p.material_cost,
			profit: p.profit,
			marginRate: p.margin_rate,
		})),
		unmappedRevenue: dto.unmapped_revenue,
		costCoverageRate: dto.cost_coverage_rate,
	};
}

// ── Cost Analysis ──

export async function fetchCostAnalysis(): Promise<CostAnalysisData> {
	const dto = await request<{ products: Array<{ product_id: number; product_name: string; price: number; material_cost: number; margin: number; margin_rate: number; materials: Array<{ name: string; unit: string; qty: number; unit_price: number; cost: number }> }>; avg_margin_rate: number }>('/api/v1/inventory-ai/cost-analysis');
	return {
		products: dto.products.map((p) => ({
			productId: p.product_id,
			productName: p.product_name,
			price: p.price,
			materialCost: p.material_cost,
			margin: p.margin,
			marginRate: p.margin_rate,
			materials: p.materials.map((m) => ({
				name: m.name, unit: m.unit, qty: m.qty, unitPrice: m.unit_price, cost: m.cost,
			})),
		})),
		avgMarginRate: dto.avg_margin_rate,
	};
}

// ── Period Comparison ──

export async function fetchPeriodComparison(period: 'week' | 'month'): Promise<PeriodComparisonData> {
	const dto = await request<{ current: Record<string, unknown>; previous: Record<string, unknown>; revenue_change_rate: number; quantity_change_rate: number; chicken_change_rate: number }>(`/api/v1/inventory-ai/compare?period=${period}`);
	const mapSummary = (s: Record<string, unknown>) => ({
		startDate: s.start_date as string,
		endDate: s.end_date as string,
		totalRevenue: s.total_revenue as number,
		totalQuantity: s.total_quantity as number,
		totalChickenCount: s.total_chicken_count as number,
		totalOrders: s.total_orders as number,
		avgDailyRevenue: s.avg_daily_revenue as number,
	});
	return {
		current: mapSummary(dto.current),
		previous: mapSummary(dto.previous),
		revenueChangeRate: dto.revenue_change_rate,
		quantityChangeRate: dto.quantity_change_rate,
		chickenChangeRate: dto.chicken_change_rate,
	};
}

// ── Waste Statistics ──

export async function fetchWasteStats(days: number = 30): Promise<WasteStatsData> {
	const dto = await request<{ period_start: string; period_end: string; total_waste_count: number; total_waste_cost: number; by_material: Array<{ material_id: number; material_name: string; unit: string; total_waste: number; waste_cost: number; count: number }> }>(`/api/v1/inventory-ai/waste-stats?days=${days}`);
	return {
		periodStart: dto.period_start,
		periodEnd: dto.period_end,
		totalWasteCount: dto.total_waste_count,
		totalWasteCost: dto.total_waste_cost,
		byMaterial: dto.by_material.map((m) => ({
			materialId: m.material_id,
			materialName: m.material_name,
			unit: m.unit,
			totalWaste: m.total_waste,
			wasteCost: m.waste_cost,
			count: m.count,
		})),
	};
}
