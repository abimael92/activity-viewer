'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Check, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { InactivityData, InactiveRepo } from '@/types';

interface Notification {
    id: string;
    type: 'inactive' | 'warning' | 'info';
    title: string;
    message: string;
    repoName: string;
    days: number;
    read: boolean;
    timestamp: Date;
    data?: InactiveRepo;
}

interface NotificationBellProps {
    inactivityData: InactivityData | null;
    username: string;
    onNotificationClick?: (repoName: string, type: 'stale' | 'idle' | 'inactive') => void;
}

export default function NotificationBell({
    inactivityData,
    username,
    onNotificationClick
}: NotificationBellProps) {
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        const saved = localStorage.getItem(`notifications_${username}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as Array<Omit<Notification, 'timestamp'> & { timestamp: string | number }>;
                return parsed.map((n) => ({
                    ...n,
                    timestamp: new Date(n.timestamp)
                }));
            } catch (e) {
                console.error('Failed to load notifications:', e);
                return [];
            }
        }
        return [];
    });
    const prevNotificationsRef = useRef<Notification[]>(notifications);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastNotification, setToastNotification] = useState<Notification | null>(null);

    // Generate notifications from inactivity data
    useEffect(() => {
        if (!inactivityData) return;

        const newNotifications: Notification[] = [];
        const now = new Date();
        const currentNotifications = prevNotificationsRef.current;

        // Check for inactive repos
        inactivityData.inactiveRepos.forEach(repo => {
            const notificationId = `inactive-${repo.name}`;

            // Check if we already notified about this repo in the last 24 hours
            const existing = currentNotifications.find(n =>
                n.repoName === repo.name &&
                n.type === 'inactive' &&
                (now.getTime() - n.timestamp.getTime()) < 24 * 60 * 60 * 1000
            );

            if (!existing) {
                newNotifications.push({
                    id: notificationId,
                    type: 'inactive',
                    title: 'Repository Inactive',
                    message: `${repo.name} has no commits for ${repo.daysWithoutCommits} days`,
                    repoName: repo.name,
                    days: typeof repo.daysWithoutCommits === 'number' ? repo.daysWithoutCommits : parseInt(repo.daysWithoutCommits, 10),
                    read: false,
                    timestamp: new Date(),
                    data: repo
                });
            }
        });

        // Check for warning repos
        inactivityData.repos15Days.forEach(repo => {
            const notificationId = `warning-${repo.name}`;

            const existing = currentNotifications.find(n =>
                n.repoName === repo.name &&
                n.type === 'warning' &&
                (now.getTime() - n.timestamp.getTime()) < 12 * 60 * 60 * 1000
            );

            if (!existing) {
                newNotifications.push({
                    id: notificationId,
                    type: 'warning',
                    title: 'Repository Warning',
                    message: `${repo.name} approaching inactivity (${repo.daysWithoutCommits} days)`,
                    repoName: repo.name,
                    days: typeof repo.daysWithoutCommits === 'number' ? repo.daysWithoutCommits : parseInt(repo.daysWithoutCommits, 10),
                    read: false,
                    timestamp: new Date(),
                    data: repo
                });
            }
        });

        if (newNotifications.length > 0) {
            // Add new notifications
            const updated = [...newNotifications, ...currentNotifications];
            // Keep only latest 50 notifications
            const limited = updated.slice(0, 50);
            // Save to localStorage
            localStorage.setItem(`notifications_${username}`, JSON.stringify(limited));
            prevNotificationsRef.current = limited;
            setNotifications(limited);

            // Show toast for the first new notification
            if (newNotifications[0]) {
                setToastNotification(newNotifications[0]);
                setShowToast(true);
            }

            // Auto-open panel if there are unread notifications and it's the first load
            if (newNotifications.length > 0 && currentNotifications.length === 0) {
                setIsOpen(true);
            }
        }
    }, [inactivityData, username]);

    // Auto-hide toast after 5 seconds
    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => {
                setShowToast(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showToast]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => {
            const updated = prev.map(n =>
                n.id === id ? { ...n, read: true } : n
            );
            localStorage.setItem(`notifications_${username}`, JSON.stringify(updated));
            return updated;
        });
    }, [username]);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => {
            const updated = prev.map(n => ({ ...n, read: true }));
            localStorage.setItem(`notifications_${username}`, JSON.stringify(updated));
            return updated;
        });
    }, [username]);

    const clearNotification = useCallback((id: string) => {
        setNotifications(prev => {
            const updated = prev.filter(n => n.id !== id);
            localStorage.setItem(`notifications_${username}`, JSON.stringify(updated));
            return updated;
        });
    }, [username]);

    const clearAll = useCallback(() => {
        setNotifications([]);
        localStorage.removeItem(`notifications_${username}`);
    }, [username]);

    const handleNotificationClick = useCallback((notification: Notification) => {
        markAsRead(notification.id);
        if (onNotificationClick) {
            // Map notification types to callback types
            const typeMap: Record<'inactive' | 'warning' | 'info', 'stale' | 'idle' | 'inactive'> = {
                'inactive': 'inactive',
                'warning': 'stale',
                'info': 'idle'
            };
            onNotificationClick(notification.repoName, typeMap[notification.type]);
        }
        // Scroll to the repo in the page
        const element = document.getElementById('inactivitySections');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }, [markAsRead, onNotificationClick]);

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'inactive': return '🔴';
            case 'warning': return '🟡';
            default: return '🔵';
        }
    };

    return (
        <>
            {/* Notification Bell Button */}
            <div className="notification-bell" onClick={() => setIsOpen(!isOpen)}>
                <div className="bell-icon">
                    <Bell />
                    {unreadCount > 0 && (
                        <span className="notification-count">{unreadCount}</span>
                    )}
                </div>
            </div>

            {/* Toast Notification */}
            {showToast && toastNotification && (
                <div className={`notification-toast notification-type-${toastNotification.type}`}>
                    <div className="toast-header">
                        <h4 className="toast-title">{toastNotification.title}</h4>
                        <button className="toast-close" onClick={() => setShowToast(false)}>
                            <X />
                        </button>
                    </div>
                    <p className="toast-message">{toastNotification.message}</p>
                </div>
            )}

            {/* Notification Panel */}
            {isOpen && (
                <div className="notification-panel">
                    <div className="panel-header">
                        <div className="panel-title">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="notification-count-badge">{unreadCount} new</span>
                            )}
                        </div>
                        <div className="panel-actions">
                            <button
                                className="panel-action-btn"
                                onClick={() => setIsMinimized(!isMinimized)}
                                title={isMinimized ? "Expand" : "Minimize"}
                            >
                                {isMinimized ? <ChevronUp /> : <ChevronDown />}
                            </button>
                            {!isMinimized && (
                                <>
                                    <button
                                        className="panel-action-btn"
                                        onClick={markAllAsRead}
                                        title="Mark all as read"
                                    >
                                        <Check />
                                    </button>
                                    <button
                                        className="panel-action-btn"
                                        onClick={clearAll}
                                        title="Clear all"
                                    >
                                        <X />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {!isMinimized && (
                        <div className="notification-list">
                            {notifications.length === 0 ? (
                                <div className="notification-empty">
                                    <h4>No notifications</h4>
                                    <p>You&apos;re all caught up!</p>
                                </div>
                            ) : (
                                notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`notification-item notification-type-${notification.type} ${notification.read ? '' : 'unread'}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="notification-header">
                                            <h4 className="notification-title">
                                                {getNotificationIcon(notification.type)} {notification.title}
                                            </h4>
                                            <span className="notification-time">
                                                <Clock size={12} /> {formatTime(notification.timestamp)}
                                            </span>
                                        </div>
                                        <p className="notification-message">{notification.message}</p>
                                        <div className="notification-meta">
                                            <span className="repo-badge-small">{notification.repoName}</span>
                                            <span className="days-badge">{notification.days} days</span>
                                        </div>
                                        <div className="notification-actions">
                                            <button
                                                className="notification-action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}
                                            >
                                                Mark read
                                            </button>
                                            <button
                                                className="notification-action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    clearNotification(notification.id);
                                                }}
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}