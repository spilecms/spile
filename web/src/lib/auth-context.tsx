import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import type { User } from "@/types/domain";
import { api } from "./api";

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: (email: string, pass: string) => Promise<void>;
	register: (name: string, email: string, pass: string) => Promise<void>;
	logout: () => Promise<void>;
	refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const queryClient = useQueryClient();
	const [user, setUser] = React.useState<User | null>(null);
	const [isLoading, setIsLoading] = React.useState(true);

	const refreshUser = React.useCallback(async () => {
		try {
			const res = await api.auth.me();
			setUser(res.user);
			// Also sync React Query's current user cache
			queryClient.setQueryData(["users", "current"], res.user);
		} catch {
			setUser(null);
			queryClient.setQueryData(["users", "current"], null);
		} finally {
			setIsLoading(false);
		}
	}, [queryClient]);

	React.useEffect(() => {
		refreshUser();
	}, [refreshUser]);

	const login = async (email: string, pass: string) => {
		const res = await api.auth.login(email, pass);
		setUser(res.user);
		queryClient.setQueryData(["users", "current"], res.user);
	};

	const register = async (name: string, email: string, pass: string) => {
		const res = await api.auth.register(name, email, pass);
		setUser(res.user);
		queryClient.setQueryData(["users", "current"], res.user);
	};

	const logout = async () => {
		try {
			await api.auth.logout();
		} finally {
			setUser(null);
			queryClient.clear();
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				isAuthenticated: Boolean(user),
				login,
				register,
				logout,
				refreshUser,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = React.useContext(AuthContext);
	if (!ctx) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return ctx;
}
