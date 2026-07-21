import { useCallback, useEffect, useState } from 'react';
import { type AuthUser, fetchMe, loginAdmin, setApiToken } from '../services/api';

const TOKEN_KEY = 'kitchenflow_token';

// Demo showcase: auto-login with the read-only demo admin account. Triggered by
// ?demo=1 (portfolio link) OR by the demo build flag VITE_DEMO_AUTOLOGIN, so
// opening the demo domain directly also auto-logs in.
const IS_DEMO = new URLSearchParams(window.location.search).get('demo') === '1'
	|| import.meta.env.VITE_DEMO_AUTOLOGIN === '1' || import.meta.env.VITE_DEMO_AUTOLOGIN === 'true'
	// Demo domains always auto-login, even if a rebuild forgets the env flag.
	|| /^demo(-[a-z0-9-]+)?\.kitchenflow\.jp$/.test(window.location.hostname);
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
		let isCancelled = false;

		// Demo mode: auto-login with the demo admin account. Retried because the
		// first request can hit a cold backend; also the fallback when a saved
		// token turns out to be expired (visitors must never see a login form).
		const demoLogin = (attempt = 0) => {
			loginAdmin(DEMO_EMAIL, DEMO_PASSWORD)
				.then((result) => {
					localStorage.setItem(TOKEN_KEY, result.token);
					setApiToken(result.token);
					if (!isCancelled) {
						setState({ user: result.user, isAuthenticated: true, isLoading: false });
					}
				})
				.catch(() => {
					if (isCancelled) return;
					if (attempt < 2) {
						setTimeout(() => demoLogin(attempt + 1), 1500);
					} else {
						setState({ user: null, isAuthenticated: false, isLoading: false });
					}
				});
		};

		if (!savedToken) {
			if (IS_DEMO) {
				demoLogin();
			} else {
				setState({ user: null, isAuthenticated: false, isLoading: false });
			}
			return () => {
				isCancelled = true;
			};
		}

		setApiToken(savedToken);
		fetchMe(savedToken)
			.then((user) => {
				if (!isCancelled) {
					setState({ user, isAuthenticated: true, isLoading: false });
				}
			})
			.catch(() => {
				// Stale/expired token: clear it and, in demo, log straight back in.
				localStorage.removeItem(TOKEN_KEY);
				setApiToken('');
				if (isCancelled) return;
				if (IS_DEMO) {
					demoLogin();
				} else {
					setState({ user: null, isAuthenticated: false, isLoading: false });
				}
			});

		return () => {
			isCancelled = true;
		};
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
