import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatMessage } from '../types';
import { sendChat, sendChatWithFile, type ChatHistoryItem } from '../services/inventoryAiApi';

const FILE_LABELS: Record<string, string> = {
	'image/jpeg': '📷',
	'image/png': '📷',
	'image/webp': '📷',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
	'application/pdf': '📄',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
};

export const useChat = () => {
	const { i18n, t } = useTranslation();
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);

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
	}, []);

	return { messages, isLoading, sendMessage, sendFile, clearMessages };
};
