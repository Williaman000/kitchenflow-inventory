import { useCallback, useEffect, useState } from 'react';
import { type AuthUser, fetchMe, loginAdmin, setApiToken } from '../services/api';

const TOKEN_KEY = 'kitchenflow_token';

interface AuthState {
	user: AuthUser | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}

export function useAuth() {
	const [state, setState] = useState<AuthState>({
		user: null,
		isAuthenticated: false,
		isLoading: true,
	});

	// 앱 시작 시 저장된 토큰 검증
	useEffect(() => {
		const savedToken = localStorage.getItem(TOKEN_KEY);
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

	return { ...state, login, logout };
}
