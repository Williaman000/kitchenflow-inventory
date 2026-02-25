import type { Material, PurchaseOrder, PurchaseOrderItem, InventoryLog, PurchaseOrderStatus, InventoryChangeType } from '../types';
import { request } from './api';

// ── Backend DTOs (snake_case) ──

interface MaterialDto {
	id: number;
	name: string;
	unit: string;
	category: string;
	current_stock: number;
	minimum_stock: number;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

interface PurchaseOrderItemDto {
	id: number;
	purchase_order_id: number;
	material_id: number;
	quantity: number;
	unit_price: number;
	subtotal: number;
	material_name: string | null;
	material_unit: string | null;
}

interface PurchaseOrderDto {
	id: number;
	status: PurchaseOrderStatus;
	ordered_at: string | null;
	received_at: string | null;
	notes: string | null;
	total_amount: number;
	item_count?: number;
	items?: PurchaseOrderItemDto[];
	created_at: string;
	updated_at: string;
}

interface InventoryLogDto {
	id: number;
	material_id: number;
	change_type: InventoryChangeType;
	quantity_change: number;
	quantity_after: number;
	notes: string | null;
	created_at: string;
	material_name: string | null;
}

// ── DTO → Model 변환 ──

function toMaterial(dto: MaterialDto): Material {
	return {
		id: dto.id,
		name: dto.name,
		unit: dto.unit,
		category: dto.category,
		currentStock: dto.current_stock,
		minimumStock: dto.minimum_stock,
		isActive: dto.is_active,
		createdAt: dto.created_at,
		updatedAt: dto.updated_at,
	};
}

function toPurchaseOrderItem(dto: PurchaseOrderItemDto): PurchaseOrderItem {
	return {
		id: dto.id,
		purchaseOrderId: dto.purchase_order_id,
		materialId: dto.material_id,
		quantity: dto.quantity,
		unitPrice: dto.unit_price,
		subtotal: dto.subtotal,
		materialName: dto.material_name ?? undefined,
		materialUnit: dto.material_unit ?? undefined,
	};
}

function toPurchaseOrder(dto: PurchaseOrderDto): PurchaseOrder {
	return {
		id: dto.id,
		status: dto.status,
		orderedAt: dto.ordered_at,
		receivedAt: dto.received_at,
		notes: dto.notes,
		totalAmount: dto.total_amount,
		itemCount: dto.item_count,
		items: dto.items?.map(toPurchaseOrderItem),
		createdAt: dto.created_at,
		updatedAt: dto.updated_at,
	};
}

function toInventoryLog(dto: InventoryLogDto): InventoryLog {
	return {
		id: dto.id,
		materialId: dto.material_id,
		changeType: dto.change_type,
		quantityChange: dto.quantity_change,
		quantityAfter: dto.quantity_after,
		notes: dto.notes,
		createdAt: dto.created_at,
		materialName: dto.material_name ?? undefined,
	};
}

// ── Materials API ──

export interface CreateMaterialPayload {
	name: string;
	unit: string;
	category?: string;
	currentStock?: number;
	minimumStock?: number;
}

export async function fetchMaterials(category?: string): Promise<Material[]> {
	const params = category ? `?category=${encodeURIComponent(category)}` : '';
	const dtos = await request<MaterialDto[]>(`/api/v1/admin/inventory/materials${params}`);
	return dtos.map(toMaterial);
}

export async function createMaterial(payload: CreateMaterialPayload): Promise<Material> {
	const dto = await request<MaterialDto>('/api/v1/admin/inventory/materials', {
		method: 'POST',
		body: JSON.stringify({
			name: payload.name,
			unit: payload.unit,
			category: payload.category ?? '기타',
			current_stock: payload.currentStock ?? 0,
			minimum_stock: payload.minimumStock ?? 0,
		}),
	});
	return toMaterial(dto);
}

export async function updateMaterial(
	id: number,
	payload: Partial<CreateMaterialPayload & { isActive: boolean }>,
): Promise<Material> {
	const body: Record<string, unknown> = {};
	if (payload.name !== undefined) body.name = payload.name;
	if (payload.unit !== undefined) body.unit = payload.unit;
	if (payload.category !== undefined) body.category = payload.category;
	if (payload.currentStock !== undefined) body.current_stock = payload.currentStock;
	if (payload.minimumStock !== undefined) body.minimum_stock = payload.minimumStock;
	if (payload.isActive !== undefined) body.is_active = payload.isActive;
	const dto = await request<MaterialDto>(`/api/v1/admin/inventory/materials/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body),
	});
	return toMaterial(dto);
}

export async function deleteMaterial(id: number): Promise<void> {
	await request<void>(`/api/v1/admin/inventory/materials/${id}`, { method: 'DELETE' });
}

// ── Purchase Orders API ──

export interface CreatePurchaseOrderPayload {
	notes?: string;
	items: { materialId: number; quantity: number; unitPrice: number }[];
}

export async function fetchPurchaseOrders(status?: PurchaseOrderStatus): Promise<PurchaseOrder[]> {
	const params = status ? `?status=${status}` : '';
	const dtos = await request<PurchaseOrderDto[]>(`/api/v1/admin/inventory/purchase-orders${params}`);
	return dtos.map(toPurchaseOrder);
}

export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
	const dto = await request<PurchaseOrderDto>('/api/v1/admin/inventory/purchase-orders', {
		method: 'POST',
		body: JSON.stringify({
			notes: payload.notes ?? null,
			items: payload.items.map((item) => ({
				material_id: item.materialId,
				quantity: item.quantity,
				unit_price: item.unitPrice,
			})),
		}),
	});
	return toPurchaseOrder(dto);
}

export async function updatePurchaseOrderStatus(
	id: number,
	status: PurchaseOrderStatus,
): Promise<PurchaseOrder> {
	const dto = await request<PurchaseOrderDto>(`/api/v1/admin/inventory/purchase-orders/${id}`, {
		method: 'PATCH',
		body: JSON.stringify({ status }),
	});
	return toPurchaseOrder(dto);
}

// ── Inventory Adjustment ──

export interface AdjustInventoryPayload {
	materialId: number;
	changeType: InventoryChangeType;
	quantityChange: number;
	notes?: string;
}

export async function adjustInventory(payload: AdjustInventoryPayload): Promise<InventoryLog> {
	const dto = await request<InventoryLogDto>('/api/v1/admin/inventory/adjust', {
		method: 'POST',
		body: JSON.stringify({
			material_id: payload.materialId,
			change_type: payload.changeType,
			quantity_change: payload.quantityChange,
			notes: payload.notes ?? null,
		}),
	});
	return toInventoryLog(dto);
}

// ── Products (for mapping UI) ──

interface ProductDto {
	id: number;
	name: string;
	category_name: string | null;
}

export interface SimpleProduct {
	id: number;
	name: string;
	categoryName: string;
}

export async function fetchProducts(): Promise<SimpleProduct[]> {
	const dtos = await request<ProductDto[]>('/api/v1/products');
	return dtos.map((d) => ({
		id: d.id,
		name: d.name,
		categoryName: d.category_name ?? '기타',
	}));
}
