import { SharedTask } from './shared-task-model';
import { createClient } from '@/lib/supabase/client';

// Check if user is authenticated
async function isAuthenticated(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch (error) {
    console.error('[unified-storage] Error checking auth:', error);
    return false;
  }
}

// Get user ID for localStorage keys (guests)
function getGuestUserId(): string {
  if (typeof window === 'undefined') return 'guest';
  
  const guestMode = localStorage.getItem('guestMode');
  if (guestMode === 'true') {
    let guestId = localStorage.getItem('guestId');
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('guestId', guestId);
    }
    return guestId;
  }
  
  const currentUser = localStorage.getItem('currentUser');
  return currentUser || 'user';
}

// Load todo tasks (Supabase for authenticated, localStorage for guests)
export async function loadTodoTasks(): Promise<SharedTask[]> {
  console.log('[unified-storage] Loading todo tasks...');
  
  const authenticated = await isAuthenticated();
  console.log('[unified-storage] User authenticated:', authenticated);
  
  if (authenticated) {
    // Load from Supabase
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      console.log('[unified-storage] Loaded from Supabase:', data.tasks?.length || 0, 'tasks');
      return data.tasks || [];
    } catch (error) {
      console.error('[unified-storage] Error loading from Supabase:', error);
      return [];
    }
  } else {
    // Load from localStorage
    const userId = getGuestUserId();
    const key = `user_${userId}_todo-tasks`;
    const stored = localStorage.getItem(key);
    const tasks = stored ? JSON.parse(stored) : [];
    console.log('[unified-storage] Loaded from localStorage:', tasks.length, 'tasks');
    return tasks;
  }
}

// Save todo tasks (Supabase for authenticated, localStorage for guests)
export async function saveTodoTasks(tasks: SharedTask[]): Promise<void> {
  console.log('[unified-storage] Saving', tasks.length, 'todo tasks...');
  
  const authenticated = await isAuthenticated();
  console.log('[unified-storage] User authenticated:', authenticated);
  
  if (authenticated) {
    // Save to Supabase
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });
      const data = await response.json();
      console.log('[unified-storage] Saved to Supabase:', data.success ? 'success' : 'failed');
    } catch (error) {
      console.error('[unified-storage] Error saving to Supabase:', error);
    }
  } else {
    // Save to localStorage
    const userId = getGuestUserId();
    const key = `user_${userId}_todo-tasks`;
    localStorage.setItem(key, JSON.stringify(tasks));
    console.log('[unified-storage] Saved to localStorage');
  }
}

// Load kanban tasks (Supabase for authenticated, localStorage for guests)
export async function loadKanbanTasks(): Promise<SharedTask[]> {
  console.log('[unified-storage] Loading kanban tasks...');
  
  const authenticated = await isAuthenticated();
  console.log('[unified-storage] User authenticated:', authenticated);
  
  if (authenticated) {
    // Load from Supabase
    try {
      const response = await fetch('/api/cards');
      const data = await response.json();
      
      // Map Supabase cards to SharedTask format
      const tasks = (data.cards || []).map((card: any) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        status: card.status,
        priority: card.priority,
        project: card.project,
        tags: card.tags || [],
        dueDate: card.due_date,
        checklist: card.checklist || [],
        comments: card.comments || [],
        assignee: card.assignees?.[0],
        createdAt: card.created_at,
        completedAt: card.updated_at,
        owner: card.user_id,
        subtasks: [],
        recurring: 'none',
      }));
      
      console.log('[unified-storage] Loaded from Supabase:', tasks.length, 'cards');
      return tasks;
    } catch (error) {
      console.error('[unified-storage] Error loading from Supabase:', error);
      return [];
    }
  } else {
    // Load from localStorage
    const userId = getGuestUserId();
    const key = `user_${userId}_kanban-tasks`;
    const stored = localStorage.getItem(key);
    const tasks = stored ? JSON.parse(stored) : [];
    console.log('[unified-storage] Loaded from localStorage:', tasks.length, 'tasks');
    return tasks;
  }
}

// Save kanban tasks (Supabase for authenticated, localStorage for guests)
export async function saveKanbanTasks(tasks: SharedTask[]): Promise<void> {
  console.log('[unified-storage] Saving', tasks.length, 'kanban tasks...');
  
  const authenticated = await isAuthenticated();
  console.log('[unified-storage] User authenticated:', authenticated);
  
  if (authenticated) {
    // Save to Supabase
    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: tasks }),
      });
      const data = await response.json();
      console.log('[unified-storage] Saved to Supabase:', data.success ? 'success' : 'failed');
    } catch (error) {
      console.error('[unified-storage] Error saving to Supabase:', error);
    }
  } else {
    // Save to localStorage
    const userId = getGuestUserId();
    const key = `user_${userId}_kanban-tasks`;
    localStorage.setItem(key, JSON.stringify(tasks));
    console.log('[unified-storage] Saved to localStorage');
  }
}

// Get current user ID (for ownership checks)
export function getUserId(): string {
  if (typeof window === 'undefined') return 'unknown';
  return getGuestUserId();
}
