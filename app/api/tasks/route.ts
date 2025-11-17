import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ tasks: [] }, { status: 200 })
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error('[API] Error fetching tasks:', error)
    return NextResponse.json({ tasks: [] }, { status: 200 })
  }

  return NextResponse.json({ tasks: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { tasks } = body

  if (!Array.isArray(tasks)) {
    return NextResponse.json({ error: "Expected tasks array" }, { status: 400 })
  }

  // Delete all existing tasks for this user
  await supabase
    .from("tasks")
    .delete()
    .eq("user_id", user.id)

  if (tasks.length === 0) {
    return NextResponse.json({ success: true })
  }

  // Insert all new tasks
  const tasksToInsert = tasks.map(task => ({
    id: task.id,
    user_id: user.id,
    title: task.title,
    description: task.description || null,
    status: task.status,
    priority: task.priority,
    project: task.project || null,
    tags: task.tags || [],
    due_date: task.dueDate || null,
    reminder_time: task.reminderTime || null,
    completed: task.status === 'done',
    subtasks: task.subtasks || [],
    recurring: task.recurring || null,
    created_at: task.createdAt,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from("tasks")
    .insert(tasksToInsert)

  if (error) {
    console.error('[API] Error saving tasks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { id, ...updates } = body
  
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }
  
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
