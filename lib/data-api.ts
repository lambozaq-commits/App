import { createClient } from '@/lib/supabase/client'
import { SharedTask, TaskStatus } from './shared-task-model'

let authCheckCache: { value: boolean; timestamp: number } | null = null
const CACHE_DURATION = 5000 // 5 seconds

export async function isAuthenticated(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const guestMode = localStorage.getItem('guestMode')
  if (guestMode === 'true') {
    console.log('[v0] data-api: Guest mode detected')
    return false
  }
  
  // Use cache to avoid excessive auth checks
  if (authCheckCache && Date.now() - authCheckCache.timestamp < CACHE_DURATION) {
    return authCheckCache.value
  }
  
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuth = !!user
  
  authCheckCache = { value: isAuth, timestamp: Date.now() }
  console.log('[v0] data-api: Authentication check:', isAuth ? 'authenticated' : 'guest')
  
  return isAuth
}

// Todo Tasks API
export async function fetchTodoTasks(): Promise<SharedTask[]> {
  console.log('[v0] data-api: fetchTodoTasks called')
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    console.log('[v0] data-api: Loading from localStorage (guest)')
    const { loadTodoTasks } = await import('./shared-task-model')
    const tasks = loadTodoTasks()
    console.log('[v0] data-api: Loaded', tasks.length, 'tasks from localStorage')
    return tasks
  }
  
  // Authenticated: fetch from Supabase API
  try {
    console.log('[v0] data-api: Fetching from API (authenticated)')
    const response = await fetch('/api/tasks', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
    if (!response.ok) {
      console.error('[v0] data-api: API response not ok:', response.status)
      return []
    }
    const data = await response.json()
    console.log('[v0] data-api: Fetched', data.tasks?.length || 0, 'tasks from API')
    
    // Map Supabase schema to SharedTask
    const tasks: SharedTask[] = (data.tasks || []).map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      project: task.project,
      tags: task.tags || [],
      dueDate: task.due_date,
      dueTime: task.reminder_time,
      reminderTime: task.reminder_time,
      reminderEnabled: !!task.reminder_time,
      createdAt: task.created_at,
      completedAt: task.completed ? task.updated_at : undefined,
      subtasks: task.subtasks || [],
      owner: task.user_id,
      recurring: task.recurring,
    }))
    
    return tasks
  } catch (error) {
    console.error('[v0] data-api: Error fetching tasks from API:', error)
    return []
  }
}

export async function saveTodoTasksAPI(tasks: SharedTask[]): Promise<void> {
  console.log('[v0] data-api: saveTodoTasksAPI called with', tasks.length, 'tasks')
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    console.log('[v0] data-api: Saving to localStorage (guest)')
    const { saveTodoTasks } = await import('./shared-task-model')
    saveTodoTasks(tasks)
    console.log('[v0] data-api: Saved to localStorage successfully')
    return
  }
  
  // Authenticated: save to Supabase API
  try {
    console.log('[v0] data-api: Saving to API (authenticated)')
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks }),
    })
    if (!response.ok) {
      console.error('[v0] data-api: Failed to save tasks, status:', response.status)
      throw new Error('Failed to save tasks')
    }
    console.log('[v0] data-api: Saved to API successfully')
  } catch (error) {
    console.error('[v0] data-api: Error saving tasks to API:', error)
    throw error
  }
}

// Kanban Tasks API
export async function fetchKanbanTasks(): Promise<SharedTask[]> {
  console.log('[v0] data-api: fetchKanbanTasks called')
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    console.log('[v0] data-api: Loading kanban from localStorage (guest)')
    const { loadKanbanTasks } = await import('./shared-task-model')
    const tasks = loadKanbanTasks()
    console.log('[v0] data-api: Loaded', tasks.length, 'kanban tasks from localStorage')
    return tasks
  }
  
  try {
    console.log('[v0] data-api: Fetching kanban from API (authenticated)')
    const response = await fetch('/api/cards', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
    if (!response.ok) {
      console.error('[v0] data-api: API response not ok:', response.status)
      return []
    }
    const data = await response.json()
    console.log('[v0] data-api: Fetched', data.cards?.length || 0, 'cards from API')
    
    // Map Supabase schema to SharedTask
    const tasks: SharedTask[] = (data.cards || []).map((card: any) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      status: card.status,
      priority: card.priority,
      project: card.project,
      tags: card.tags || [],
      dueDate: card.due_date,
      createdAt: card.created_at,
      completedAt: card.status === 'done' ? card.updated_at : undefined,
      owner: card.user_id,
      checklist: card.checklist || [],
      comments: card.comments || [],
      assignee: card.assignees?.[0],
      archived: false, // Not stored in Supabase yet
      archivedAt: undefined,
    }))
    
    return tasks
  } catch (error) {
    console.error('[v0] data-api: Error fetching kanban tasks from API:', error)
    return []
  }
}

export async function saveKanbanTasksAPI(tasks: SharedTask[]): Promise<void> {
  console.log('[v0] data-api: saveKanbanTasksAPI called with', tasks.length, 'tasks')
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    console.log('[v0] data-api: Saving kanban to localStorage (guest)')
    const { saveKanbanTasks } = await import('./shared-task-model')
    saveKanbanTasks(tasks)
    console.log('[v0] data-api: Saved kanban to localStorage successfully')
    return
  }
  
  // Authenticated: save to Supabase API
  try {
    console.log('[v0] data-api: Saving kanban to API (authenticated)')
    const response = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards: tasks }),
    })
    if (!response.ok) {
      console.error('[v0] data-api: Failed to save cards, status:', response.status)
      throw new Error('Failed to save cards')
    }
    console.log('[v0] data-api: Saved kanban to API successfully')
  } catch (error) {
    console.error('[v0] data-api: Error saving kanban tasks to API:', error)
    throw error
  }
}
