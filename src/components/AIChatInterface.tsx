import { useState, useRef, useEffect, type FormEvent } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { COLORS } from '../constants/theme';
import type { ChatMessage } from '../types';

interface Props {
	messages: ChatMessage[];
	isLoading: boolean;
	onSendMessage: (text: string) => void;
	onClear: () => void;
}

const SUGGESTIONS = [
	'지난 주 양념치킨 얼마나 팔렸어?',
	'재고 부족한 재료 뭐야?',
	'내일 닭 몇 마리 필요해?',
	'이번 주 매출 추이 보여줘',
	'가장 많이 팔린 메뉴 Top 5',
];

function DataRenderer({ data, dataType }: { data: Record<string, unknown>; dataType: string | null }) {
	if (dataType === 'table' && data.headers && data.rows) {
		const headers = data.headers as string[];
		const rows = data.rows as unknown[][];
		return (
			<div style={dataStyles.tableWrap}>
				<table style={dataStyles.table}>
					<thead>
						<tr>
							{headers.map((h, i) => (
								<th key={i} style={dataStyles.th}>{h}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row, ri) => (
							<tr key={ri}>
								{row.map((cell, ci) => (
									<td key={ci} style={dataStyles.td}>{String(cell)}</td>
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
			<div style={{ marginTop: 12, width: '100%', height: 250 }}>
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
		<pre style={dataStyles.jsonPre}>
			{JSON.stringify(data, null, 2)}
		</pre>
	);
}

export default function AIChatInterface({ messages, isLoading, onSendMessage, onClear }: Props) {
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
		<div style={styles.container}>
			{/* 헤더 */}
			<div style={styles.header}>
				<h2 style={styles.title}>AI 챗봇</h2>
				{messages.length > 0 && (
					<button style={styles.clearBtn} onClick={onClear}>대화 초기화</button>
				)}
			</div>

			{/* 메시지 영역 */}
			<div style={styles.messagesArea}>
				{messages.length === 0 ? (
					<div style={styles.emptyState}>
						<div style={styles.emptyIcon}>AI</div>
						<p style={styles.emptyTitle}>무엇이든 물어보세요</p>
						<p style={styles.emptySubtitle}>매출, 재고, 발주에 대해 자연어로 질문할 수 있습니다.</p>
						<div style={styles.suggestions}>
							{SUGGESTIONS.map((s, i) => (
								<button
									key={i}
									style={styles.suggestionChip}
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
								style={msg.role === 'user' ? styles.userMsgRow : styles.assistantMsgRow}
							>
								<div style={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}>
									<div style={styles.msgContent}>{msg.content}</div>
									{msg.data && msg.dataType && (
										<DataRenderer data={msg.data} dataType={msg.dataType} />
									)}
								</div>
							</div>
						))}
						{isLoading && (
							<div style={styles.assistantMsgRow}>
								<div style={styles.assistantBubble}>
									<div style={styles.loadingDots}>
										<span style={styles.dot} />
										<span style={{ ...styles.dot, animationDelay: '0.2s' }} />
										<span style={{ ...styles.dot, animationDelay: '0.4s' }} />
									</div>
								</div>
							</div>
						)}
						<div ref={messagesEndRef} />
					</>
				)}
			</div>

			{/* 입력 바 */}
			<form style={styles.inputBar} onSubmit={handleSubmit}>
				<input
					style={styles.input}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="질문을 입력하세요..."
					disabled={isLoading}
				/>
				<button
					type="submit"
					style={{
						...styles.sendBtn,
						opacity: input.trim() && !isLoading ? 1 : 0.5,
					}}
					disabled={!input.trim() || isLoading}
				>
					전송
				</button>
			</form>

			{/* Loading animation keyframes injected via style tag */}
			<style>{`
				@keyframes kf-pulse {
					0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
					40% { opacity: 1; transform: scale(1); }
				}
			`}</style>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	container: {
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
		maxWidth: 800,
		margin: '0 auto',
	},
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: '16px 24px',
		borderBottom: `1px solid ${COLORS.border}`,
		backgroundColor: COLORS.white,
	},
	title: {
		margin: 0,
		fontSize: 18,
		fontWeight: 700,
		color: COLORS.text,
	},
	clearBtn: {
		padding: '6px 14px',
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 6,
		backgroundColor: COLORS.white,
		fontSize: 12,
		fontWeight: 600,
		color: COLORS.textMuted,
		cursor: 'pointer',
	},
	messagesArea: {
		flex: 1,
		overflowY: 'auto',
		padding: '20px 24px',
		display: 'flex',
		flexDirection: 'column',
		gap: 12,
	},
	emptyState: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		flex: 1,
		gap: 8,
	},
	emptyIcon: {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: 56,
		height: 56,
		borderRadius: 14,
		backgroundColor: COLORS.accent,
		color: COLORS.white,
		fontSize: 20,
		fontWeight: 900,
		marginBottom: 8,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: 700,
		color: COLORS.text,
		margin: 0,
	},
	emptySubtitle: {
		fontSize: 14,
		color: COLORS.textMuted,
		margin: 0,
	},
	suggestions: {
		display: 'flex',
		flexWrap: 'wrap',
		gap: 8,
		justifyContent: 'center',
		marginTop: 16,
		maxWidth: 500,
	},
	suggestionChip: {
		padding: '8px 16px',
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 20,
		backgroundColor: COLORS.white,
		fontSize: 13,
		fontWeight: 500,
		color: COLORS.textDark,
		cursor: 'pointer',
	},
	userMsgRow: {
		display: 'flex',
		justifyContent: 'flex-end',
	},
	assistantMsgRow: {
		display: 'flex',
		justifyContent: 'flex-start',
	},
	userBubble: {
		maxWidth: '75%',
		backgroundColor: COLORS.primary,
		color: COLORS.white,
		borderRadius: '16px 16px 4px 16px',
		padding: '12px 16px',
	},
	assistantBubble: {
		maxWidth: '85%',
		backgroundColor: COLORS.white,
		color: COLORS.text,
		borderRadius: '16px 16px 16px 4px',
		padding: '12px 16px',
		border: `1px solid ${COLORS.border}`,
	},
	msgContent: {
		fontSize: 14,
		lineHeight: 1.6,
		whiteSpace: 'pre-wrap',
		wordBreak: 'break-word',
	},
	loadingDots: {
		display: 'flex',
		gap: 6,
		padding: '4px 0',
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: '50%',
		backgroundColor: COLORS.textMuted,
		animation: 'kf-pulse 1.2s infinite ease-in-out',
	},
	inputBar: {
		display: 'flex',
		gap: 10,
		padding: '16px 24px',
		borderTop: `1px solid ${COLORS.border}`,
		backgroundColor: COLORS.white,
	},
	input: {
		flex: 1,
		padding: '12px 16px',
		fontSize: 14,
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 10,
		outline: 'none',
		boxSizing: 'border-box' as const,
	},
	sendBtn: {
		padding: '12px 24px',
		border: 'none',
		borderRadius: 10,
		backgroundColor: COLORS.primary,
		color: COLORS.white,
		fontSize: 14,
		fontWeight: 700,
		cursor: 'pointer',
		whiteSpace: 'nowrap',
	},
};

const dataStyles: Record<string, React.CSSProperties> = {
	tableWrap: {
		marginTop: 12,
		overflowX: 'auto',
		borderRadius: 8,
		border: `1px solid ${COLORS.border}`,
	},
	table: {
		width: '100%',
		borderCollapse: 'collapse',
	},
	th: {
		padding: '8px 12px',
		fontSize: 12,
		fontWeight: 700,
		color: COLORS.textMuted,
		borderBottom: `2px solid ${COLORS.borderDark}`,
		textAlign: 'left',
		backgroundColor: COLORS.backgroundLight,
		whiteSpace: 'nowrap',
	},
	td: {
		padding: '8px 12px',
		fontSize: 13,
		color: COLORS.text,
		borderBottom: `1px solid ${COLORS.border}`,
	},
	jsonPre: {
		marginTop: 12,
		padding: 12,
		backgroundColor: COLORS.backgroundLight,
		borderRadius: 8,
		fontSize: 12,
		overflow: 'auto',
		maxHeight: 300,
	},
};
