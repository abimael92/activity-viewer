// types/todo.ts
export interface Todo {
	id: string;
	title: string;
	description?: string;
	priority: 'low' | 'medium' | 'high';
	status: 'pending' | 'in-progress' | 'completed';
	category?: string;
	dueDate?: string;
	createdAt: string;
	updatedAt: string;
	userId: string;
	repoId?: string; // Add this field
	repoName?: string; // Add this field
	projectId?: string;
	tags?: string[];
}
