// components/TodoList.tsx
'use client';

import { useState, useEffect, useCallback, MouseEvent, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Todo } from '@/types/todo';
import { fetchGitHubRepos } from '@/lib/github';
import { getRepoColor } from '@/lib/colors';

interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    language: string | null;
}

interface TodoListProps {
    projectId?: string;
    githubUsername?: string;
}

export default function TodoList({ projectId, githubUsername = '' }: TodoListProps) {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [repos, setRepos] = useState<Array<{
        id: string,
        name: string,
        full_name?: string,
    }>>([]);
    const [newTodo, setNewTodo] = useState<{ title: string; priority: 'low' | 'medium' | 'high'; repoId?: string; }>({
        title: '',
        priority: 'medium',
        repoId: ''
    });
    const [loading, setLoading] = useState(false);
    const [reposLoading, setReposLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Todo>>({});
    const [repoColors, setRepoColors] = useState<Record<string, string>>({});
    const [showCompleted, setShowCompleted] = useState(false);
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [filterRepo, setFilterRepo] = useState<string>('all');
    const [visibleCount, setVisibleCount] = useState(5);
    const [sortedTodos, setSortedTodos] = useState<Todo[]>([]);

    const fetchUserRepos = useCallback(async (username: string) => {
        if (!username.trim()) {
            setRepos([]);
            setRepoColors({});
            return;
        }

        setReposLoading(true);
        try {
            const reposData = await fetchGitHubRepos(username, { perPage: 100, sort: 'updated' });
            const colorMap: Record<string, string> = {};

            const formattedRepos = reposData.map((repo: GitHubRepo) => {
                const color = getRepoColor(repo.name);
                colorMap[repo.id.toString()] = color;

                return {
                    id: repo.id.toString(),
                    name: repo.name,
                    full_name: repo.full_name,
                    description: repo.description,
                    language: repo.language ?? undefined,
                };
            });

            setRepos(formattedRepos);
            setRepoColors(colorMap);
        } catch (error) {
            console.error('Error fetching repos:', error);
            setRepos([]);
            setRepoColors({});
        } finally {
            setReposLoading(false);
        }
    }, []);

    const filteredTodos = todos.filter(todo => {
        if (!showCompleted && todo.status === 'completed') return false;
        if (filterPriority !== 'all' && todo.priority !== filterPriority) return false;
        if (filterRepo !== 'all') {
            if (filterRepo === 'none') {
                if (todo.repoId) return false;
            } else {
                if (!todo.repoId || todo.repoId !== filterRepo) return false;
            }
        }
        return true;
    });

    const priorityOrder = { high: 1, medium: 2, low: 3 };

    const pendingTodos = todos.filter(t => t.status !== 'completed');
    const completedTodos = todos.filter(t => t.status === 'completed');

    const getTodoColor = (todo: Todo): string => {
        if (!todo.repoName) return '#6B7280';
        const repoName = todo.repoName.split('/').pop() || todo.repoName;
        const colors = [
            '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#00FFFF',
            '#0000FF', '#8B00FF', '#FF1493',
        ];
        let sum = 0;
        for (let i = 0; i < repoName.length; i++) {
            sum += repoName.charCodeAt(i);
        }
        return colors[sum % colors.length];
    };

    const getRepoDisplayName = (repoName: string | undefined): string => {
        if (!repoName) return '';
        return repoName.split('/').pop() || repoName;
    };

    const getTodoItemClasses = (todo: Todo): string => {
        const baseClass = 'todo-item';
        const statusClass = todo.status === 'completed' ? 'completed' : '';
        const priorityClass = `${todo.priority}-priority`;
        return `${baseClass} ${statusClass} ${priorityClass}`.trim();
    };

    const getPriorityBadgeClass = (priority: string): string => {
        switch (priority) {
            case 'high': return 'priority-high';
            case 'medium': return 'priority-medium';
            case 'low': return 'priority-low';
            default: return '';
        }
    };

    async function addTodo(e?: MouseEvent<HTMLButtonElement>) {
        if (e) e.preventDefault();
        if (!newTodo.title.trim()) return;

        setLoading(true);
        try {
            const selectedRepo = repos.find(r => r.id === newTodo.repoId);
            await addDoc(collection(db, 'todos'), {
                title: newTodo.title.trim(),
                priority: newTodo.priority,
                status: 'pending',
                repoId: newTodo.repoId || null,
                repoName: selectedRepo?.name || null,
                projectId: projectId || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            setNewTodo({ title: '', priority: 'medium', repoId: '' });
        } catch (error) {
            console.error('Error adding todo:', error);
        } finally {
            setLoading(false);
        }
    }

    async function updateTodo(id: string, updates: Partial<Todo>) {
        try {
            await updateDoc(doc(db, 'todos', id), {
                ...updates,
                updatedAt: new Date().toISOString()
            });
            setEditingId(null);
            setEditData({});
        } catch (error) {
            console.error('Error updating todo:', error);
        }
    }

    async function toggleStatus(todo: Todo) {
        const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
        await updateTodo(todo.id, { status: newStatus });
    }

    async function deleteTodo(id: string) {
        if (!confirm('Are you sure you want to delete this todo?')) return;
        try {
            await deleteDoc(doc(db, 'todos', id));
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    }

    const startEditing = (todo: Todo) => {
        setEditingId(todo.id);
        setEditData({
            title: todo.title,
            priority: todo.priority,
            repoId: todo.repoId || undefined
        });
    };

    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const visibleTodos = sortedTodos.slice(0, visibleCount);
    const hasMoreTodos = sortedTodos.length > visibleCount;

    useEffect(() => {
        const sorted = [...filteredTodos].sort((a, b) => {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        // Only update if the sorted array actually changed
        if (JSON.stringify(sorted) !== JSON.stringify(sortedTodos)) {
            setSortedTodos(sorted);
        }
    }, [filteredTodos]);

    useEffect(() => {
        if (githubUsername) {
            fetchUserRepos(githubUsername);
        }
    }, [githubUsername, fetchUserRepos]);

    useEffect(() => {
        const q = projectId
            ? query(collection(db, 'todos'), where('projectId', '==', projectId), orderBy('createdAt', 'desc'))
            : query(collection(db, 'todos'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const todosData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Todo));
            setTodos(todosData);
        });

        return () => unsubscribe();
    }, [projectId]);

    useEffect(() => {
        if (todos.length > 0) {
            localStorage.setItem('todos', JSON.stringify(todos));
        }
    }, [todos]);


    return (
        <div className="todo-container">
            <h2 className="todo-title">
                {projectId ? 'Project TODOs' : 'My TODOs'}
            </h2>

            {/* Filter Controls */}
            <div className="filter-controls">
                <div className="filter-buttons">
                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        className={`view-toggle-btn ${showCompleted ? 'active' : ''}`}
                    >
                        {showCompleted ? 'Show Active' : 'Show Completed'}
                    </button>

                    <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Priorities</option>
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                    </select>

                    <select
                        value={filterRepo}
                        onChange={(e) => setFilterRepo(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Repos</option>
                        <option value="none">No Repo</option>
                        {repos.map(repo => (
                            <option key={repo.id} value={repo.id}>
                                {repo.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-stats">
                    Showing {filteredTodos.length} of {todos.length} todos
                </div>
            </div>

            {/* Add Todo Form */}
            <div className="todo-form">
                <div className="form-row">
                    <input
                        type="text"
                        value={newTodo.title}
                        onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                        placeholder="What needs to be done?"
                        className="todo-input"
                        onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                    />
                </div>

                <div className="form-row">
                    <select
                        value={newTodo.repoId || ''}
                        onChange={(e) => setNewTodo({ ...newTodo, repoId: e.target.value || undefined })}
                        className="priority-select"
                        disabled={reposLoading || !githubUsername}
                    >
                        <option value="">No specific repo</option>
                        {reposLoading ? (
                            <option disabled>Loading repos...</option>
                        ) : (
                            repos.map(repo => (
                                <option key={repo.id} value={repo.id}>
                                    {repo.name}
                                </option>
                            ))
                        )}
                    </select>

                    <select
                        value={newTodo.priority}
                        onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as 'low' | 'medium' | 'high' })}
                        className="priority-select"
                    >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                    </select>
                </div>

                <button
                    onClick={(e) => addTodo(e)}
                    disabled={loading || !newTodo.title.trim()}
                    className="add-btn"
                >
                    {loading ? 'Adding...' : 'Add Todo'}
                </button>

                {!githubUsername && (
                    <p className="text-sm text-gray-500 mt-2">
                        Enter a GitHub username in the main input to see repos
                    </p>
                )}
            </div>

            {/* Todo List */}
            {/* Todo List */}
            <div className="todo-list">
                {sortedTodos.length === 0 ? (
                    <div className="todo-empty">
                        <h3>No todos found</h3>
                        <p>
                            {showCompleted
                                ? 'No completed todos found'
                                : 'No active todos found. Add one above!'}
                        </p>
                    </div>
                ) : (
                    <>
                        {visibleTodos.map(todo => {
                            const repoColor = getTodoColor(todo);

                            return (
                                <div
                                    key={todo.id}
                                    className={getTodoItemClasses(todo)}
                                    style={{
                                        borderLeftColor: todo.repoId ? repoColor : undefined,
                                        borderLeftWidth: todo.repoId ? '4px' : undefined
                                    }}
                                >
                                    {editingId === todo.id ? (
                                        <div className="edit-mode">
                                            <input
                                                type="text"
                                                value={editData.title || todo.title}
                                                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                                className="edit-input"
                                                autoFocus
                                                placeholder="Edit todo title"
                                            />

                                            <div className="edit-fields">
                                                <select
                                                    value={editData.repoId || ''}
                                                    onChange={(e) => setEditData({ ...editData, repoId: e.target.value || undefined })}
                                                    className="priority-select"
                                                >
                                                    <option value="">No repo</option>
                                                    {repos.map(repo => (
                                                        <option key={repo.id} value={repo.id}>
                                                            {repo.name}
                                                        </option>
                                                    ))}
                                                </select>

                                                <select
                                                    value={editData.priority || todo.priority}
                                                    onChange={(e) => setEditData({ ...editData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                                                    className="priority-select"
                                                >
                                                    <option value="low">Low Priority</option>
                                                    <option value="medium">Medium Priority</option>
                                                    <option value="high">High Priority</option>
                                                </select>
                                            </div>

                                            <div className="edit-actions">
                                                <button
                                                    onClick={() => updateTodo(todo.id, editData)}
                                                    className="save-btn"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingId(null);
                                                        setEditData({});
                                                    }}
                                                    className="cancel-btn"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="todo-content">
                                            <div className="todo-main">
                                                <button
                                                    onClick={() => toggleStatus(todo)}
                                                    className={`todo-checkbox ${todo.status === 'completed' ? 'checked' : ''}`}
                                                    aria-label={todo.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
                                                />
                                                <div className="todo-info">
                                                    <div className={`todo-title ${todo.status === 'completed' ? 'completed' : ''}`}>
                                                        {todo.title}
                                                    </div>
                                                    <div className="todo-meta">
                                                        {todo.repoName && (
                                                            <span
                                                                className="repo-badge"
                                                                style={{
                                                                    backgroundColor: hexToRgba(repoColor, 0.12),
                                                                    color: repoColor,
                                                                    borderColor: repoColor,
                                                                    borderWidth: '1px',
                                                                    borderStyle: 'solid'
                                                                }}
                                                            >
                                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                                </svg>
                                                                {getRepoDisplayName(todo.repoName)}
                                                            </span>
                                                        )}
                                                        <span className={`priority-badge ${getPriorityBadgeClass(todo.priority)}`}>
                                                            {todo.priority}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="todo-actions">
                                                <button
                                                    onClick={() => startEditing(todo)}
                                                    className="action-btn edit-btn"
                                                    aria-label="Edit todo"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => deleteTodo(todo.id)}
                                                    className="action-btn delete-btn"
                                                    aria-label="Delete todo"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Show More/Less Buttons */}
                        <div className="show-more-container" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            {hasMoreTodos && (
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 5)}
                                    className="show-more-btn"
                                >
                                    Show 5 more ({sortedTodos.length - visibleCount} remaining)
                                </button>
                            )}

                            {visibleCount > 5 && (
                                <button
                                    onClick={() => setVisibleCount(prev => Math.max(5, prev - 5))}
                                    className="show-less-btn"
                                >
                                    Show less
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>


            {/* Stats */}
            <div className="todo-stats">
                <div className="stat-item">
                    <span className="stat-count">{todos.length}</span>
                    <span className="stat-label">Total</span>
                </div>
                <div className="stat-item">
                    <span className="stat-count">{completedTodos.length}</span>
                    <span className="stat-label">Completed</span>
                </div>
                <div className="stat-item">
                    <span className="stat-count">{pendingTodos.length}</span>
                    <span className="stat-label">Pending</span>
                </div>
            </div>

        </div>
    );
}