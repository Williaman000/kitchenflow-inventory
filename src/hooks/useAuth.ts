import { useCallback, useEffect, useState } from 'react';
import { type AuthUser, fetchMe, loginAdmin, setApiToken } from '../services/api';

const TOKEN_KEY = 'kitchenflow_token';

// Demo showcase: when opened with ?demo=1 (e.g. from the portfolio site),
// auto-login with the read-only demo admin account.
const IS_DEMO = new URLSearchParams(window.location.search).get('demo') === '1';
const DEMO_EMAIL = 'demo@kitchenflow.jp';
const DEMO_PASSWORD = 'demo1234';

interface AuthState {
	user: AuthUser | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}

export const useAuth = () => {
	const [state, setState] = useState<AuthState>({
		user: null,
		isAuthenticated: false,
		isLoading: true,
	});

	// Verify saved token on app start
	useEffect(() => {
		const savedToken = localStorage.getItem(TOKEN_KEY);

		// Demo mode: auto-login with the demo admin account when arriving via ?demo=1
		if (!savedToken && IS_DEMO) {
			loginAdmin(DEMO_EMAIL, DEMO_PASSWORD)
				.then((result) => {
					localStorage.setItem(TOKEN_KEY, result.token);
					setApiToken(result.token);
					setState({ user: result.user, isAuthenticated: true, isLoading: false });
				})
				.catch(() => {
					setState({ user: null, isAuthenticated: false, isLoading: false });
				});
			return;
		}

		if (!savedToken) {
			setState({ user: null, isAuthenticated: false, isLoading: false });
			return;
		}

		setApiToken(savedToken);
		fetchMe(savedToken)
			.then((user) => {
				setState({ user, isAuthenticated: true, isLoading: false });
			})
			.catch(() => {
				localStorage.removeItem(TOKEN_KEY);
				setApiToken('');
				setState({ user: null, isAuthenticated: false, isLoading: false });
			});
	}, []);

	const login = useCallback(async (email: string, password: string) => {
		const result = await loginAdmin(email, password);
		localStorage.setItem(TOKEN_KEY, result.token);
		setApiToken(result.token);
		setState({ user: result.user, isAuthenticated: true, isLoading: false });
	}, []);

	const logout = useCallback(() => {
		localStorage.removeItem(TOKEN_KEY);
		setApiToken('');
		setState({ user: null, isAuthenticated: false, isLoading: false });
	}, []);

	return { ...state, login, logout, isDemo: IS_DEMO };
};
