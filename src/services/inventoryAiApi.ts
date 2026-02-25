import type { SalesTrendData, ForecastData, InsightData, ProductMaterialMapping } from '../types';
import { request } from './api';

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

export async function sendChat(message: string): Promise<{ answer: string; data: Record<string, unknown> | null; dataType: string | null }> {
	const dto = await request<ChatResponseDto>('/api/v1/inventory-ai/chat', {
		method: 'POST',
		body: JSON.stringify({ message }),
	});
	return {
		answer: dto.answer,
		data: dto.data,
		dataType: dto.data_type,
	};
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
		dailyBreakdown: dto.daily_breakdown.map((d) => ({
			date: d.date,
			totalQuantity: d.total_quantity,
			totalRevenue: d.total_revenue,
			orderCount: d.order_count,
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
		})),
		totalMaterials: dto.total_materials,
		needsOrdering: dto.needs_ordering,
	};
}

// ── Explain Forecast ──

export async function explainForecast(materialId: number): Promise<{ explanation: string }> {
	return await request<{ explanation: string }>(`/api/v1/inventory-ai/forecast/${materialId}/explain`);
}

// ── AI Insights ──

export async function fetchInsights(): Promise<InsightData> {
	const dto = await request<InsightDto>('/api/v1/inventory-ai/insights');
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
