import { useState, useCallback } from 'react';

export interface AppNotification {
    id: number;
    variant: string;
    text: string;
}

let nextId = 0;

export function useApiResponse() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    const dismiss = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const handleResponse = async (response: Response) => {
        const responseText = await response.text();
        const text = `HTTP ${response.status}: ${responseText}`;
        let variant = 'success';
        if (response.status === 400) variant = 'warning';
        else if (!response.ok) variant = 'danger';

        const id = nextId++;
        setNotifications(prev => [...prev, { id, variant, text }]);

        if (!response.ok && response.status !== 400) {
            console.error(responseText);
            return Promise.reject();
        }
    };

    return { notifications, dismiss, handleResponse };
}
