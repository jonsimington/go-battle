import { getApiUrl } from './utils';

/**
 * Wrapper around fetch that automatically attaches the JWT auth token
 * from localStorage for authenticated API requests.
 */
export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = path.startsWith('http') ? path : `${getApiUrl()}${path}`;
    const token = localStorage.getItem('auth_token');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers,
    });
}
