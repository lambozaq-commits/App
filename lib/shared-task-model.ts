import { loadFromLocalStorage, saveToLocalStorage, getCurrentUserId } from './data-storage';

export type TaskStatus = 'todo' | 'inprogress' | 'done';

export interface SharedTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  dueTime?: string;
  tags?: string[];
  project?: string;
  assignee?: string;
  checklist?: { id: string; text: string; completed: boolean }[];
  subtasks?: { id: string; text: string; completed: boolean }[];
  comments?: { id: string; text: string; timestamp: string }[];
  createdAt: string;
  completedAt?: string;
  archived?: boolean;
  archivedAt?: string; // Added timestamp for when task was archived
  owner: string;
  reminderTime?: string;
  reminderEnabled?: boolean;
  recurring?: 'daily' | 'weekly' | 'monthly' | 'none';
}

const BASE_TASKS_KEY = 'shared-tasks-unified';
const TODO_TASKS_KEY = 'todo-tasks-only';
const KANBAN_TASKS_KEY = 'kanban-tasks-only';

export function loadSharedTasks(): SharedTask[] {
  if (typeof window === 'undefined') return [];
  const userId = getCurrentUserId();
  return loadFromLocalStorage<SharedTask[]>(BASE_TASKS_KEY, userId, []);
}

export function saveSharedTasks(tasks: SharedTask[]): void {
  if (typeof window === 'undefined') return;
  const userId = getCurrentUserId();
  saveToLocalStorage(BASE_TASKS_KEY, tasks, userId);
}

export function loadTodoTasks(): SharedTask[] {
  if (typeof window === 'undefined') return [];
  const userId = getCurrentUserId();
  return loadFromLocalStorage<SharedTask[]>(TODO_TASKS_KEY, userId, []);
}

export function saveTodoTasks(tasks: SharedTask[]): void {
  if (typeof window === 'undefined') return;
  const userId = getCurrentUserId();
  saveToLocalStorage(TODO_TASKS_KEY, tasks, userId);
}

export function loadKanbanTasks(): SharedTask[] {
  if (typeof window === 'undefined') return [];
  const userId = getCurrentUserId();
  return loadFromLocalStorage<SharedTask[]>(KANBAN_TASKS_KEY, userId, []);
}

export function saveKanbanTasks(tasks: SharedTask[]): void {
  if (typeof window === 'undefined') return;
  const userId = getCurrentUserId();
  saveToLocalStorage(KANBAN_TASKS_KEY, tasks, userId);
}

export function mapStatusToColumn(status: TaskStatus): string {
  const mapping: Record<TaskStatus, string> = {
    todo: 'todo',
    inprogress: 'inprogress',
    done: 'done',
  };
  return mapping[status];
}

export function mapColumnToStatus(columnId: string): TaskStatus {
  const mapping: Record<string, TaskStatus> = {
    todo: 'todo',
    inprogress: 'inprogress',
    done: 'done',
  };
  return mapping[columnId] || 'todo';
}
