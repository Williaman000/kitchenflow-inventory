import i18n from '../i18n';

function getLocale(): string {
	return i18n.language === 'ja' ? 'ja-JP' : 'ko-KR';
}

function getCurrencySymbol(): string {
	return i18n.language === 'ja' ? '円' : '원';
}

export function formatCurrency(amount: number): string {
	return `${amount.toLocaleString(getLocale())}${getCurrencySymbol()}`;
}

export function formatShortCurrency(amount: number): string {
	if (i18n.language === 'ja') {
		return `${(amount / 10000).toFixed(0)}万`;
	}
	return `${(amount / 10000).toFixed(0)}만`;
}

export function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString(getLocale());
}

export function formatDateTime(dateStr: string): string {
	return new Date(dateStr).toLocaleString(getLocale());
}

export function formatDateShort(dateStr: string | null): string {
	if (!dateStr) return '-';
	return new Date(dateStr).toLocaleDateString(getLocale(), {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}
