// Inventory/purchase order management types
export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
export type InventoryChangeType = 'PURCHASE_IN' | 'USE_OUT' | 'ADJUSTMENT' | 'WASTE';

export interface Material {
	id: number;
	name: string;
	unit: string;
	category: string;
	currentStock: number;
	minimumStock: number;
	leadTimeDays: number;
	orderDeadlineHour: number;
	deliveryDayOfWeek: number | null;
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

// Sales analysis
export interface DailySalesPoint {
	date: string;
	totalQuantity: number;
	totalRevenue: number;
	orderCount: number;
	chickenCount: number;
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
	totalChickenCount: number;
	dailyBreakdown: DailySalesPoint[];
	productRanking: ProductSalesItem[];
	dayOfWeekPattern: DayOfWeekPoint[];
}

// Demand forecast
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
	leadTimeDays: number;
	orderDeadlineHour: number;
	deliveryDayOfWeek: number | null;
	isOrderUrgent: boolean;
	orderDeadlineDisplay: string;
}

export interface ForecastData {
	forecastDays: number;
	generatedAt: string;
	recommendations: RecommendedOrder[];
	totalMaterials: number;
	needsOrdering: number;
}

// AI insights
export interface InsightData {
	generatedAt: string;
	insights: string[];
	lowStockCount: number;
	topSeller: string | null;
}

// Product-material mapping
export interface ProductMaterialMapping {
	id: number;
	productId: number;
	materialId: number;
	quantityPerUnit: number;
	productName?: string;
	materialName?: string;
	materialUnit?: string;
}

// Bulk import
export interface BulkImportError {
	row: number;
	message: string;
}

export interface BulkImportResult {
	imported: number;
	skipped: number;
	errors: BulkImportError[];
}

// Sales upload
export interface SalesUploadRecord {
	id: number;
	fileName: string;
	totalRows: number;
	importedRows: number;
	createdAt: string;
}

export interface SalesUploadResult {
	uploadId: number;
	imported: number;
	skipped: number;
	matchedProducts: number;
	errors: { row: number; message: string }[];
}

// Authentication
export interface AuthUser {
	id: number;
	email: string;
	name: string;
	phone: string | null;
	role: 'ADMIN' | 'CUSTOMER';
}
