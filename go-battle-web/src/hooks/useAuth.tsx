import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthUser, AuthResponse } from '../models/AuthUser';
import { getApiUrl } from '../utils/utils';

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isAdmin: boolean;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<string | null>;
    register: (username: string, password: string) => Promise<string | null>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    isAdmin: false,
    isAuthenticated: false,
    login: async () => null,
    register: async () => null,
    logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Restore token/user from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('auth_user');
        if (savedToken && savedUser) {
            try {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
            }
        }
    }, []);

    const handleAuthResponse = useCallback(async (response: Response): Promise<string | null> => {
        if (!response.ok) {
            const text = await response.text();
            return text || 'Request failed';
        }
        const data: AuthResponse = await response.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        return null;
    }, []);

    const login = useCallback(async (username: string, password: string): Promise<string | null> => {
        try {
            const response = await fetch(`${getApiUrl()}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            return handleAuthResponse(response);
        } catch {
            return 'Network error';
        }
    }, [handleAuthResponse]);

    const register = useCallback(async (username: string, password: string): Promise<string | null> => {
        try {
            const response = await fetch(`${getApiUrl()}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            return handleAuthResponse(response);
        } catch {
            return 'Network error';
        }
    }, [handleAuthResponse]);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    }, []);

    const isAdmin = user?.role === 'admin';
    const isAuthenticated = !!token && !!user;

    return (
        <AuthContext.Provider value={{ user, token, isAdmin, isAuthenticated, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
