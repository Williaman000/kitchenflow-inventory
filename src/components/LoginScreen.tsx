import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/theme';

interface Props {
	onLogin: (email: string, password: string) => Promise<void>;
}

export default function LoginScreen({ onLogin }: Props) {
	const { t } = useTranslation();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!email.trim() || !password.trim()) {
			setError(t('login.errorEmpty'));
			return;
		}
		setError('');
		setIsLoading(true);
		try {
			await onLogin(email.trim(), password);
		} catch (err) {
			setError(err instanceof Error ? err.message : t('login.errorFailed'));
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div style={styles.container}>
			<form style={styles.card} onSubmit={handleSubmit}>
				<div style={styles.logoArea}>
					<div style={styles.logoIcon}>AI</div>
					<h1 style={styles.title}>{t('app.title')}</h1>
					<p style={styles.subtitle}>{t('login.subtitle')}</p>
				</div>

				{error && <div style={styles.error}>{error}</div>}

				<div style={styles.field}>
					<label style={styles.label}>{t('login.email')}</label>
					<input
						style={styles.input}
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="admin@60gye.local"
						autoFocus
						disabled={isLoading}
					/>
				</div>

				<div style={styles.field}>
					<label style={styles.label}>{t('login.password')}</label>
					<input
						style={styles.input}
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder={t('login.passwordPlaceholder')}
						disabled={isLoading}
					/>
				</div>

				<button
					type="submit"
					style={{
						...styles.button,
						...(isLoading ? styles.buttonDisabled : {}),
					}}
					disabled={isLoading}
				>
					{isLoading ? t('login.submitting') : t('login.submit')}
				</button>
			</form>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	container: {
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		height: '100vh',
		backgroundColor: COLORS.background,
	},
	card: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
		padding: 40,
		width: 400,
		boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
	},
	logoArea: {
		textAlign: 'center' as const,
		marginBottom: 32,
	},
	logoIcon: {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: 56,
		height: 56,
		borderRadius: 14,
		backgroundColor: COLORS.primary,
		color: COLORS.white,
		fontSize: 20,
		fontWeight: 900,
		letterSpacing: -1,
	},
	title: {
		fontSize: 22,
		fontWeight: 800,
		color: COLORS.text,
		margin: '12px 0 0',
	},
	subtitle: {
		fontSize: 14,
		color: COLORS.textMuted,
		margin: '4px 0 0',
	},
	error: {
		backgroundColor: '#FFEBEE',
		color: '#C62828',
		padding: '10px 14px',
		borderRadius: 8,
		fontSize: 13,
		fontWeight: 600,
		marginBottom: 16,
	},
	field: {
		marginBottom: 16,
	},
	label: {
		display: 'block',
		fontSize: 13,
		fontWeight: 600,
		color: COLORS.textLight,
		marginBottom: 6,
	},
	input: {
		width: '100%',
		padding: '12px 14px',
		fontSize: 14,
		border: `1px solid ${COLORS.borderInput}`,
		borderRadius: 8,
		outline: 'none',
		boxSizing: 'border-box' as const,
	},
	button: {
		width: '100%',
		padding: '14px',
		fontSize: 15,
		fontWeight: 700,
		color: COLORS.white,
		backgroundColor: COLORS.primary,
		border: 'none',
		borderRadius: 10,
		cursor: 'pointer',
		marginTop: 8,
	},
	buttonDisabled: {
		backgroundColor: COLORS.textMuted,
		cursor: 'not-allowed',
	},
};
