import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { AppNotification } from '../../hooks/useApiResponse';
import s from './ApiToast.module.css';

const AUTO_DISMISS_MS = 15000;

interface NotificationItemProps {
    notification: AppNotification;
    onDismiss: (id: number) => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps): JSX.Element {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(notification.id), AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
    }, [notification.id, onDismiss]);

    return (
        <div className={`${s.notification} ${s[notification.variant] ?? ''}`}>
            <span className={s.text}>{notification.text}</span>
            <button className={s.close} onClick={() => onDismiss(notification.id)} aria-label="Dismiss">✕</button>
        </div>
    );
}

interface NotificationStackProps {
    notifications: AppNotification[];
    onDismiss: (id: number) => void;
}

export function ApiToast({ notifications, onDismiss }: NotificationStackProps): JSX.Element {
    if (notifications.length === 0) return <></>;
    return createPortal(
        <div className={s.stack}>
            {notifications.map(n => (
                <NotificationItem key={n.id} notification={n} onDismiss={onDismiss} />
            ))}
        </div>,
        document.body
    );
}
