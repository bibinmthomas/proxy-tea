import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { item_id, voter_id } = await request.json()

  if (!item_id || !voter_id) {
    return NextResponse.json({ error: 'item_id and voter_id required' }, { status: 400 })
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('expires_at')
    .eq('id', id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Session expired' }, { status: 410 })
  }

  const { data, error } = await supabase
    .from('votes')
    .insert({ item_id, session_id: id, voter_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { item_id, voter_id } = await request.json()

  if (!item_id || !voter_id) {
    return NextResponse.json({ error: 'item_id and voter_id required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('item_id', item_id)
    .eq('voter_id', voter_id)
    .eq('session_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
