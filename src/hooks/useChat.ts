import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatMessage } from '../types';
import { sendChat, sendChatWithFile, type ChatHistoryItem } from '../services/inventoryAiApi';

const STORAGE_KEY = 'kf-chat-messages';
const MAX_STORED = 50;

// Data change detection keywords
const DATA_CHANGE_KEYWORDS = ['업데이트 완료', '등록 완료', '매핑 완료', 'アップデート完了', '登録完了'];

const FILE_LABELS: Record<string, string> = {
	'image/jpeg': '📷',
	'image/png': '📷',
	'image/webp': '📷',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
	'application/pdf': '📄',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
};

function loadMessages(): ChatMessage[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as ChatMessage[];
		return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
	} catch {
		return [];
	}
}

function saveMessages(messages: ChatMessage[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
	} catch {
		// localStorage full — ignore
	}
}

function hasDataChange(answer: string): boolean {
	return DATA_CHANGE_KEYWORDS.some((kw) => answer.includes(kw));
}

export const useChat = (onDataChanged?: () => void) => {
	const { i18n, t } = useTranslation();
	const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
	const [isLoading, setIsLoading] = useState(false);
	const onDataChangedRef = useRef(onDataChanged);
	onDataChangedRef.current = onDataChanged;

	// Persist messages to localStorage
	useEffect(() => {
		saveMessages(messages);
	}, [messages]);

	const sendMessage = useCallback(async (text: string) => {
		const userMsg: ChatMessage = {
			id: `user-${Date.now()}`,
			role: 'user',
			content: text,
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, userMsg]);
		setIsLoading(true);

		try {
			const history: ChatHistoryItem[] = messages
				.filter((m) => m.role === 'user' || m.role === 'assistant')
				.slice(-5)
				.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
			const result = await sendChat(text, i18n.language, history);
			const assistantMsg: ChatMessage = {
				id: `assistant-${Date.now()}`,
				role: 'assistant',
				content: result.answer,
				data: result.data ?? undefined,
				dataType: result.dataType,
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, assistantMsg]);

			// Notify data change for real-time UI refresh
			if (hasDataChange(result.answer)) {
				onDataChangedRef.current?.();
			}
		} catch (err) {
			const errorMsg: ChatMessage = {
				id: `error-${Date.now()}`,
				role: 'assistant',
				content: err instanceof Error ? err.message : t('chat.error'),
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, errorMsg]);
		} finally {
			setIsLoading(false);
		}
	}, [i18n.language, t, messages]);

	const sendFile = useCallback(async (file: File, message: string) => {
		const label = FILE_LABELS[file.type] ?? '📎';
		const userMsg: ChatMessage = {
			id: `user-${Date.now()}`,
			role: 'user',
			content: `${label} ${file.name}${message ? `\n${message}` : ''}`,
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, userMsg]);
		setIsLoading(true);

		try {
			const result = await sendChatWithFile(file, message, i18n.language);
			const assistantMsg: ChatMessage = {
				id: `assistant-${Date.now()}`,
				role: 'assistant',
				content: result.answer,
				data: result.data ?? undefined,
				dataType: result.dataType,
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, assistantMsg]);

			if (hasDataChange(result.answer)) {
				onDataChangedRef.current?.();
			}
		} catch (err) {
			const errorMsg: ChatMessage = {
				id: `error-${Date.now()}`,
				role: 'assistant',
				content: err instanceof Error ? err.message : t('chat.error'),
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, errorMsg]);
		} finally {
			setIsLoading(false);
		}
	}, [i18n.language, t]);

	const clearMessages = useCallback(() => {
		setMessages([]);
		localStorage.removeItem(STORAGE_KEY);
	}, []);

	return { messages, isLoading, sendMessage, sendFile, clearMessages };
};
