import { useState, type FC, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './LoginScreen.module.scss';

interface Props {
	onLogin: (email: string, password: string) => Promise<void>;
}

const LoginScreen: FC<Props> = ({ onLogin }) => {
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
		<div className={styles.container}>
			<form className={styles.card} onSubmit={handleSubmit}>
				<div className={styles.logoArea}>
					<div className={styles.logoIcon}>AI</div>
					<h1 className={styles.title}>{t('app.title')}</h1>
					<p className={styles.subtitle}>{t('login.subtitle')}</p>
				</div>

				{error && <div className={styles.error}>{error}</div>}

				<div className={styles.field}>
					<label className={styles.label}>{t('login.email')}</label>
					<input
						className={styles.input}
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="admin@60gye.local"
						autoFocus
						disabled={isLoading}
					/>
				</div>

				<div className={styles.field}>
					<label className={styles.label}>{t('login.password')}</label>
					<input
						className={styles.input}
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder={t('login.passwordPlaceholder')}
						disabled={isLoading}
					/>
				</div>

				<button
					type="submit"
					className={`${styles.button} ${isLoading ? styles.buttonDisabled : ''}`}
					disabled={isLoading}
				>
					{isLoading ? t('login.submitting') : t('login.submit')}
				</button>
			</form>
		</div>
	);
};

export default LoginScreen;
