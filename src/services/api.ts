import type { AuthUser } from '../types';
export type { AuthUser };

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

let _apiToken = '';

export function setApiToken(token: string): void {
	_apiToken = token;
}

export function getApiToken(): string {
	return _apiToken;
}

export function isTokenConfigured(): boolean {
	return _apiToken.length > 0;
}

// API response wrapper
interface ApiResponse<T> {
	success: boolean;
	data: T;
	error: string | null;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const token = getApiToken();
	const headers: HeadersInit = {
		'Content-Type': 'application/json',
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		...(init?.headers ?? {}),
	};

	const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
	const contentType = response.headers.get('content-type') ?? '';

	// DELETE 204 No Content
	if (response.status === 204) {
		return undefined as T;
	}

	if (!contentType.includes('application/json')) {
		throw new Error(`Unexpected response (${response.status}): ${contentType || 'no content-type'}`);
	}
	const payload = (await response.json()) as ApiResponse<T>;
	if (!response.ok || !payload.success) {
		throw new Error(payload.error || `Request failed: ${response.status}`);
	}
	return payload.data;
}

// ── Auth ──

interface TokenDto {
	access_token: string;
	token_type: string;
	user: AuthUser;
}

export async function loginAdmin(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
	const body = new URLSearchParams({ username: email, password });
	const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: body.toString(),
	});
	const contentType = response.headers.get('content-type') ?? '';
	if (!contentType.includes('application/json')) {
		throw new Error('서버에 연결할 수 없습니다.');
	}
	const payload = (await response.json()) as { success: boolean; data: TokenDto; error: string | null };
	if (!response.ok || !payload.success) {
		throw new Error(payload.error || '로그인에 실패했습니다.');
	}
	if (payload.data.user.role !== 'ADMIN') {
		throw new Error('관리자만 접근할 수 있습니다.');
	}
	return { token: payload.data.access_token, user: payload.data.user };
}

export async function fetchMe(token: string): Promise<AuthUser> {
	const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	const payload = (await response.json()) as { success: boolean; data: AuthUser; error: string | null };
	if (!response.ok || !payload.success) {
		throw new Error('인증이 만료되었습니다.');
	}
	if (payload.data.role !== 'ADMIN') {
		throw new Error('관리자만 접근할 수 있습니다.');
	}
	return payload.data;
}
