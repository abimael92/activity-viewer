'use client';

import { useState, useEffect, useCallback } from 'react';

type SnackbarType = 'success' | 'error' | 'info' | 'warning';

interface SnackbarMessage {
    message: string;
    type: SnackbarType;
    duration?: number;
    id: number;
}

let globalShowSnackbar: ((msg: string, type?: SnackbarType, duration?: number) => void) | null = null;

export function showSnackbar(
    msg: string,
    type: SnackbarType = 'info',
    duration?: number
) {
    if (globalShowSnackbar) {
        globalShowSnackbar(msg, type, duration);
    } else {
        console.log(`[Snackbar] ${type}: ${msg}`);
    }
}

export default function Snackbar() {
    const [messages, setMessages] = useState<SnackbarMessage[]>([]);

    const addMessage = useCallback((
        msg: string,
        type: SnackbarType = 'info',
        duration?: number
    ) => {
        const id = Date.now();
        setMessages(prev => [...prev, {
            message: msg,
            type,
            duration,
            id
        }]);
    }, []);

    const removeMessage = useCallback((id: number) => {
        setMessages(prev => prev.filter(msg => msg.id !== id));
    }, []);

    useEffect(() => {
        globalShowSnackbar = addMessage;
        return () => {
            globalShowSnackbar = null;
        };
    }, [addMessage]);

    const getTypeIcon = (type: SnackbarType) => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✗';
            case 'warning':
                return '⚠';
            case 'info':
            default:
                return 'ℹ';
        }
    };

    return (
        <div className="snackbar-container">
            {messages.map(({ id, message, type, duration = 4000 }) => (
                <SnackbarItem
                    key={id}
                    id={id}
                    message={message}
                    type={type}
                    duration={duration}
                    onClose={removeMessage}
                    getTypeIcon={getTypeIcon}
                />
            ))}
        </div>
    );
}

interface SnackbarItemProps {
    id: number;
    message: string;
    type: SnackbarType;
    duration: number;
    onClose: (id: number) => void;
    getTypeIcon: (type: SnackbarType) => string;
}

function SnackbarItem({
    id,
    message,
    type,
    duration,
    onClose,
    getTypeIcon
}: SnackbarItemProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
                onClose(id);
            }, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose(id);
        }, 300);
    };

    return (
        <div
            className={`
        snackbar
        snackbar-${type}
        ${isExiting ? 'animate-fadeOut' : 'animate-slideIn'}
      `}
            role="alert"
            aria-live="polite"
        >
            <div className="snackbar-content">
                <span className="snackbar-icon">{getTypeIcon(type)}</span>
                <span className="snackbar-message">{message}</span>
            </div>
            <button
                onClick={handleClose}
                className="snackbar-close"
                aria-label="Close notification"
            >
                ✕
            </button>
        </div>
    );
}