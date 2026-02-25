export function formatCurrency(amount: number): string {
	return `${amount.toLocaleString('ko-KR')}원`;
}

export function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString('ko-KR');
}

export function formatDateTime(dateStr: string): string {
	return new Date(dateStr).toLocaleString('ko-KR');
}
