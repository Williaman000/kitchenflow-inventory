import { useState, useRef, useEffect, type FC, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { COLORS } from '../constants/theme';
import type { ChatMessage } from '../types';
import styles from './AIChatInterface.module.scss';

interface Props {
	messages: ChatMessage[];
	isLoading: boolean;
	onSendMessage: (text: string) => void;
	onClear: () => void;
}

function DataRenderer({ data, dataType }: { data: Record<string, unknown>; dataType: string | null }) {
	if (dataType === 'table' && data.headers && data.rows) {
		const headers = data.headers as string[];
		const rows = data.rows as unknown[][];
		return (
			<div className={styles.tableWrap}>
				<table className={styles.table}>
					<thead>
						<tr>
							{headers.map((h, i) => (
								<th key={i} className={styles.th}>{h}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row, ri) => (
							<tr key={ri}>
								{row.map((cell, ci) => (
									<td key={ci} className={styles.td}>{String(cell)}</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	if (dataType === 'chart' && data.labels && data.values) {
		const labels = data.labels as string[];
		const values = data.values as number[];
		const chartData = labels.map((label, i) => ({ name: label, value: values[i] ?? 0 }));
		return (
			<div className={styles.chartWrap}>
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={chartData}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="name" fontSize={12} />
						<YAxis fontSize={12} />
						<Tooltip />
						<Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
					</BarChart>
				</ResponsiveContainer>
			</div>
		);
	}

	// Fallback: JSON
	return (
		<pre className={styles.jsonPre}>
			{JSON.stringify(data, null, 2)}
		</pre>
	);
}

const AIChatInterface: FC<Props> = ({ messages, isLoading, onSendMessage, onClear }) => {
	const { t } = useTranslation();
	const SUGGESTIONS = [
		t('chat.suggestion1'),
		t('chat.suggestion2'),
		t('chat.suggestion3'),
		t('chat.suggestion4'),
		t('chat.suggestion5'),
	];

	const [input, setInput] = useState('');
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const text = input.trim();
		if (!text || isLoading) return;
		onSendMessage(text);
		setInput('');
	};

	const handleSuggestionClick = (suggestion: string) => {
		if (isLoading) return;
		onSendMessage(suggestion);
	};

	return (
		<div className={styles.container}>
			{/* 헤더 */}
			<div className={styles.header}>
				<h2 className={styles.title}>{t('chat.title')}</h2>
				{messages.length > 0 && (
					<button className={styles.clearBtn} onClick={onClear}>{t('chat.clear')}</button>
				)}
			</div>

			{/* 메시지 영역 */}
			<div className={styles.messagesArea}>
				{messages.length === 0 ? (
					<div className={styles.emptyState}>
						<div className={styles.emptyIcon}>AI</div>
						<p className={styles.emptyTitle}>{t('chat.emptyTitle')}</p>
						<p className={styles.emptySubtitle}>{t('chat.emptySubtitle')}</p>
						<div className={styles.suggestions}>
							{SUGGESTIONS.map((s, i) => (
								<button
									key={i}
									className={styles.suggestionChip}
									onClick={() => handleSuggestionClick(s)}
								>
									{s}
								</button>
							))}
						</div>
					</div>
				) : (
					<>
						{messages.map((msg) => (
							<div
								key={msg.id}
								className={msg.role === 'user' ? styles.userMsgRow : styles.assistantMsgRow}
							>
								<div className={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}>
									<div className={styles.msgContent}>{msg.content}</div>
									{msg.data && msg.dataType && (
										<DataRenderer data={msg.data} dataType={msg.dataType} />
									)}
								</div>
							</div>
						))}
						{isLoading && (
							<div className={styles.assistantMsgRow}>
								<div className={styles.assistantBubble}>
									<div className={styles.loadingDots}>
										<span className={styles.dot} />
										<span className={styles.dot} style={{ animationDelay: '0.2s' }} />
										<span className={styles.dot} style={{ animationDelay: '0.4s' }} />
									</div>
								</div>
							</div>
						)}
						<div ref={messagesEndRef} />
					</>
				)}
			</div>

			{/* 입력 바 */}
			<form className={styles.inputBar} onSubmit={handleSubmit}>
				<input
					className={styles.input}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder={t('chat.inputPlaceholder')}
					disabled={isLoading}
				/>
				<button
					type="submit"
					className={styles.sendBtn}
					style={{ opacity: input.trim() && !isLoading ? 1 : 0.5 }}
					disabled={!input.trim() || isLoading}
				>
					{t('chat.send')}
				</button>
			</form>
		</div>
	);
};

export default AIChatInterface;
