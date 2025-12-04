// components/TodoList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Todo } from '@/types/todo';
import { fetchWithAuth } from '@/lib/github';

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
    const [repos, setRepos] = useState<Array<{ id: string, name: string, full_name?: string }>>([]);
    const [newTodo, setNewTodo] = useState<{ title: string; priority: 'low' | 'medium' | 'high'; repoId?: string; }>({
        title: '',
        priority: 'medium',
        repoId: ''
    });
    const [loading, setLoading] = useState(false);
    const [reposLoading, setReposLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Todo>>({});

    // Independent function to fetch user repos
    const fetchUserRepos = useCallback(async (username: string) => {
        if (!username.trim()) {
            setRepos([]);
            return;
        }

        setReposLoading(true);
        try {
            const repoRes = await fetchWithAuth(
                `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`
            );

            if (repoRes.ok) {
                const reposData = await repoRes.json();
                const formattedRepos = reposData.map((repo: GitHubRepo) => ({
                    id: repo.id.toString(),
                    name: repo.name,
                    full_name: repo.full_name,
                    description: repo.description,
                    language: repo.language ?? undefined
                }));
                setRepos(formattedRepos);
            }
        } catch (error) {
            console.error('Error fetching repos:', error);
            setRepos([]);
        } finally {
            setReposLoading(false);
        }
    }, []);

    // Load repos when githubUsername changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchUserRepos(githubUsername);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [githubUsername, fetchUserRepos]);

    // Load todos from Firestore
    useEffect(() => {

        const todosQuery = projectId
            ? query(
                collection(db, 'todos'),
                where('projectId', '==', projectId),
                orderBy('createdAt', 'desc')
            )
            : query(
                collection(db, 'todos'),
                orderBy('createdAt', 'desc')
            );

        console.log('Firestore query created');


        const unsubscribe = onSnapshot(todosQuery, (snapshot) => {
            const todoList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Todo[];
            setTodos(todoList);
        });

        return () => unsubscribe();
    }, [projectId]);

    const addTodo = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault(); // Prevent form submission if inside a form
            e.stopPropagation();
        }

        console.log('Add todo clicked'); // Debug log

        if (!newTodo.title.trim()) {
            alert('Please enter a todo title');
            return;
        }


        setLoading(true);
        try {
            const selectedRepo = repos.find(repo => repo.id === newTodo.repoId); // FIXED: Use 'repos' not 'availableRepos'

            await addDoc(collection(db, 'todos'), {
                ...newTodo,
                status: 'pending',
                projectId: projectId || null,
                repoId: newTodo.repoId || null,
                repoName: selectedRepo?.full_name || selectedRepo?.name || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            console.log('7. Todo data to save:', addDoc);

            setNewTodo({
                title: '',
                priority: 'medium',
                repoId: ''
            });
        } catch (error) {
            console.error('Error adding todo:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateTodo = async (id: string, updates: Partial<Todo>) => {
        try {
            await updateDoc(doc(db, 'todos', id), {
                ...updates,
                updatedAt: new Date().toISOString()
            });
            setEditingId(null);
        } catch (error) {
            console.error('Error updating todo:', error);
        }
    };

    const deleteTodo = async (id: string) => {
        if (!confirm('Are you sure you want to delete this todo?')) return;

        try {
            await deleteDoc(doc(db, 'todos', id));
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    };

    const toggleStatus = (todo: Todo) => {
        const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
        updateTodo(todo.id, { status: newStatus });
    };

    const getPriorityClasses = (priority: 'low' | 'medium' | 'high') => {
        switch (priority) {
            case 'high':
                return 'priority-high';
            case 'medium':
                return 'priority-medium';
            case 'low':
                return 'priority-low';
        }
    };

    const getTodoItemClasses = (todo: Todo) => {
        const baseClasses = 'todo-item';
        const priorityClass = `todo-item ${todo.priority}-priority`;
        const completedClass = todo.status === 'completed' ? 'completed' : '';
        return `${baseClasses} ${priorityClass} ${completedClass}`;
    };

    return (
        <div className="todo-container">
            <h2 className="todo-title">
                {projectId ? 'Project TODOs' : 'My TODOs'}
            </h2>

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
                            repos.map(repo => ( // FIXED: Use 'repos' not 'availableRepos'
                                <option key={repo.id} value={repo.id}>
                                    {repo.full_name || repo.name}
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
            <div className="todo-list">
                {todos.length === 0 ? (
                    <div className="todo-empty">
                        <h3>No todos yet</h3>
                        <p>Add your first todo to get started!</p>
                    </div>
                ) : (
                    todos.map(todo => (
                        <div
                            key={todo.id}
                            className={getTodoItemClasses(todo)}
                        >
                            {editingId === todo.id ? (
                                <div className="edit-mode">
                                    <input
                                        type="text"
                                        value={editData.title || todo.title}
                                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                        className="edit-input"
                                        autoFocus
                                    />
                                    <div className="edit-actions">
                                        <button
                                            onClick={() => updateTodo(todo.id, editData)}
                                            className="save-btn"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
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
                                                    <span className="repo-badge">
                                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                        {todo.repoName}
                                                    </span>
                                                )}
                                                <span className={`priority-badge ${getPriorityClasses(todo.priority)}`}>
                                                    {todo.priority}
                                                </span>
                                                {/* <span className="todo-date">
                                                    {new Date(todo.createdAt).toLocaleDateString()}
                                                </span> */}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="todo-actions">
                                        <button
                                            onClick={() => {
                                                setEditingId(todo.id);
                                                setEditData({ title: todo.title });
                                            }}
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
                    ))
                )}
            </div>

            {/* Stats */}
            <div className="todo-stats">
                <div className="stat-item">
                    <span className="stat-count">{todos.length}</span>
                    <span className="stat-label">Total</span>
                </div>
                <div className="stat-item">
                    <span className="stat-count">{todos.filter(t => t.status === 'completed').length}</span>
                    <span className="stat-label">Completed</span>
                </div>
                <div className="stat-item">
                    <span className="stat-count">{todos.filter(t => t.status !== 'completed').length}</span>
                    <span className="stat-label">Pending</span>
                </div>
            </div>
        </div>
    );
}