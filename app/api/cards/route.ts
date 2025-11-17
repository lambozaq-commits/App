import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ cards: [] }, { status: 200 })
  }

  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error('[API] Error fetching cards:', error)
    return NextResponse.json({ cards: [] }, { status: 200 })
  }

  return NextResponse.json({ cards: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { cards } = body

  if (!Array.isArray(cards)) {
    return NextResponse.json({ error: "Expected cards array" }, { status: 400 })
  }

  // Delete all existing cards for this user
  await supabase
    .from("cards")
    .delete()
    .eq("user_id", user.id)

  if (cards.length === 0) {
    return NextResponse.json({ success: true })
  }

  // Insert all new cards
  const cardsToInsert = cards.map(card => ({
    id: card.id,
    user_id: user.id,
    title: card.title,
    description: card.description || null,
    status: card.status,
    priority: card.priority,
    project: card.project || null,
    tags: card.tags || [],
    due_date: card.dueDate || null,
    checklist: card.checklist || [],
    comments: card.comments || [],
    assignees: card.assignee ? [card.assignee] : [],
    created_at: card.createdAt,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from("cards")
    .insert(cardsToInsert)

  if (error) {
    console.error('[API] Error saving cards:', error)
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
    .from("cards")
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
    .from("cards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
