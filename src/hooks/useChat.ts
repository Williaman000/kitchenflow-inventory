import { useState, useCallback } from 'react';
import type { ChatMessage } from '../types';
import { sendChat } from '../services/inventoryAiApi';

export function useChat() {
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
			const result = await sendChat(text);
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
				content: err instanceof Error ? err.message : 'AI 응답을 가져오는데 실패했습니다.',
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, errorMsg]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const clearMessages = useCallback(() => {
		setMessages([]);
	}, []);

	return { messages, isLoading, sendMessage, clearMessages };
}
