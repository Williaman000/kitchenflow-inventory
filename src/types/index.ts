// 재고/발주 관리 타입
export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
export type InventoryChangeType = 'PURCHASE_IN' | 'USE_OUT' | 'ADJUSTMENT' | 'WASTE';

export interface Material {
	id: number;
	name: string;
	unit: string;
	category: string;
	currentStock: number;
	minimumStock: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface PurchaseOrderItem {
	id: number;
	purchaseOrderId: number;
	materialId: number;
	quantity: number;
	unitPrice: number;
	subtotal: number;
	materialName?: string;
	materialUnit?: string;
}

export interface PurchaseOrder {
	id: number;
	status: PurchaseOrderStatus;
	orderedAt: string | null;
	receivedAt: string | null;
	notes: string | null;
	totalAmount: number;
	itemCount?: number;
	items?: PurchaseOrderItem[];
	createdAt: string;
	updatedAt: string;
}

export interface InventoryLog {
	id: number;
	materialId: number;
	changeType: InventoryChangeType;
	quantityChange: number;
	quantityAfter: number;
	notes: string | null;
	createdAt: string;
	materialName?: string;
}

// AI Chat
export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	data?: Record<string, unknown>;
	dataType?: string | null;
	timestamp: Date;
}

// 매출 분석
export interface DailySalesPoint {
	date: string;
	totalQuantity: number;
	totalRevenue: number;
	orderCount: number;
}

export interface ProductSalesItem {
	productId: number;
	productName: string;
	totalQuantity: number;
	totalRevenue: number;
}

export interface DayOfWeekPoint {
	day: string;
	avgQuantity: number;
	avgRevenue: number;
}

export interface SalesTrendData {
	period: string;
	startDate: string;
	endDate: string;
	totalRevenue: number;
	totalQuantity: number;
	totalOrders: number;
	dailyBreakdown: DailySalesPoint[];
	productRanking: ProductSalesItem[];
	dayOfWeekPattern: DayOfWeekPoint[];
}

// 수요 예측
export interface RecommendedOrder {
	materialId: number;
	materialName: string;
	unit: string;
	currentStock: number;
	minimumStock: number;
	expectedConsumption: number;
	safetyStock: number;
	recommendedOrder: number;
	confidence: string;
	breakdown: Record<string, unknown>;
}

export interface ForecastData {
	forecastDays: number;
	generatedAt: string;
	recommendations: RecommendedOrder[];
	totalMaterials: number;
	needsOrdering: number;
}

// AI 인사이트
export interface InsightData {
	generatedAt: string;
	insights: string[];
	lowStockCount: number;
	topSeller: string | null;
}

// 상품-재료 매핑
export interface ProductMaterialMapping {
	id: number;
	productId: number;
	materialId: number;
	quantityPerUnit: number;
	productName?: string;
	materialName?: string;
	materialUnit?: string;
}

// 인증
export interface AuthUser {
	id: number;
	email: string;
	name: string;
	phone: string | null;
	role: 'ADMIN' | 'CUSTOMER';
}
