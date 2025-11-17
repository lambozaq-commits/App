import { getSupabaseClient } from './supabase/client'
import { SharedTask, TaskStatus } from './shared-task-model'

export type Todo = SharedTask

export type KanbanCard = SharedTask

// Check if user is authenticated
async function getCurrentUser() {
  const supabase = getSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ============================================
// TODOS API
// ============================================

export async function getTodos(): Promise<Todo[]> {
  const user = await getCurrentUser()
  
  if (!user) {
    // Guest mode: read from localStorage
    const stored = localStorage.getItem('guest_todos')
    return stored ? JSON.parse(stored) : []
  }
  
  // Authenticated: fetch from Supabase
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('[v0] Error fetching todos:', error)
    return []
  }
  
  // Map Supabase schema to SharedTask
  return (data || []).map(row => ({
    id: row.id,
    title: row.title,
    status: row.completed ? 'done' as TaskStatus : 'todo' as TaskStatus,
    priority: row.priority || 'medium',
    project: row.project || 'Inbox',
    tags: row.tags || [],
    dueDate: row.due_date,
    createdAt: row.created_at,
    owner: user.id,
    subtasks: row.subtasks || [],
    recurring: row.recurring || 'none',
  }))
}

export async function saveTodos(todos: Todo[]): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user) {
    // Guest mode: save to localStorage
    localStorage.setItem('guest_todos', JSON.stringify(todos))
    return true
  }
  
  // Authenticated: save to Supabase
  const supabase = getSupabaseClient()
  
  // Delete all existing tasks for this user
  await supabase
    .from('tasks')
    .delete()
    .eq('user_id', user.id)
  
  // Insert all todos
  const { error } = await supabase
    .from('tasks')
    .insert(todos.map(task => ({
      id: task.id,
      user_id: user.id,
      title: task.title,
      completed: task.status === 'done',
      priority: task.priority,
      project: task.project,
      tags: task.tags,
      due_date: task.dueDate,
      created_at: task.createdAt,
      subtasks: task.subtasks,
      recurring: task.recurring,
    })))
  
  if (error) {
    console.error('[v0] Error saving todos:', error)
    return false
  }
  
  return true
}

// ============================================
// KANBAN API
// ============================================

export async function getKanbanCards(): Promise<KanbanCard[]> {
  const user = await getCurrentUser()
  
  if (!user) {
    // Guest mode: read from localStorage
    const stored = localStorage.getItem('guest_kanban')
    return stored ? JSON.parse(stored) : []
  }
  
  // Authenticated: fetch from Supabase
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('[v0] Error fetching kanban cards:', error)
    return []
  }
  
  // Map Supabase schema to SharedTask
  return (data || []).map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status || 'todo',
    priority: row.priority || 'medium',
    project: row.project || 'General',
    tags: row.tags || [],
    dueDate: row.due_date,
    createdAt: row.created_at,
    owner: user.id,
    subtasks: [],
    archived: false,
    comments: row.comments || [],
    checklist: row.checklist || [],
    assignee: row.assignees?.[0],
  }))
}

export async function saveKanbanCards(cards: KanbanCard[]): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user) {
    // Guest mode: save to localStorage
    localStorage.setItem('guest_kanban', JSON.stringify(cards))
    return true
  }
  
  // Authenticated: save to Supabase
  const supabase = getSupabaseClient()
  
  // Delete all existing cards for this user
  await supabase
    .from('cards')
    .delete()
    .eq('user_id', user.id)
  
  // Insert all cards
  const { error } = await supabase
    .from('cards')
    .insert(cards.map(card => ({
      id: card.id,
      user_id: user.id,
      title: card.title,
      description: card.description,
      status: card.status,
      priority: card.priority,
      project: card.project,
      tags: card.tags,
      due_date: card.dueDate,
      created_at: card.createdAt,
      comments: card.comments,
      checklist: card.checklist,
      assignees: card.assignee ? [card.assignee] : [],
    })))
  
  if (error) {
    console.error('[v0] Error saving kanban cards:', error)
    return false
  }
  
  return true
}

// ============================================
// REAL-TIME SYNC
// ============================================

export function subscribeTodoChanges(callback: (todos: Todo[]) => void) {
  const supabase = getSupabaseClient()
  
  const channel = supabase
    .channel('todos-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks'
      },
      async () => {
        const todos = await getTodos()
        callback(todos)
      }
    )
    .subscribe()
  
  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeKanbanChanges(callback: (cards: KanbanCard[]) => void) {
  const supabase = getSupabaseClient()
  
  const channel = supabase
    .channel('kanban-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cards'
      },
      async () => {
        const cards = await getKanbanCards()
        callback(cards)
      }
    )
    .subscribe()
  
  return () => {
    supabase.removeChannel(channel)
  }
}

// ============================================
// DATA MIGRATION (localStorage -> Supabase)
// ============================================

export async function migrateGuestDataToSupabase() {
  const user = await getCurrentUser()
  if (!user) return
  
  console.log('[v0] Starting guest data migration to Supabase...')
  
  // Check if user already has data in Supabase
  const supabase = getSupabaseClient()
  const { data: existingTodos } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
  
  if (existingTodos && existingTodos.length > 0) {
    console.log('[v0] User already has data in Supabase, skipping migration')
    return
  }
  
  // Migrate todos
  const guestTodos = localStorage.getItem('guest_todos')
  if (guestTodos) {
    try {
      const todos: Todo[] = JSON.parse(guestTodos)
      if (todos.length > 0) {
        console.log('[v0] Migrating', todos.length, 'todos to Supabase')
        await saveTodos(todos)
        localStorage.removeItem('guest_todos')
        console.log('[v0] Todos migrated successfully')
      }
    } catch (error) {
      console.error('[v0] Error migrating todos:', error)
    }
  }
  
  // Migrate kanban cards
  const guestKanban = localStorage.getItem('guest_kanban')
  if (guestKanban) {
    try {
      const cards: KanbanCard[] = JSON.parse(guestKanban)
      if (cards.length > 0) {
        console.log('[v0] Migrating', cards.length, 'kanban cards to Supabase')
        await saveKanbanCards(cards)
        localStorage.removeItem('guest_kanban')
        console.log('[v0] Kanban cards migrated successfully')
      }
    } catch (error) {
      console.error('[v0] Error migrating kanban cards:', error)
    }
  }
  
  console.log('[v0] Migration complete!')
}
