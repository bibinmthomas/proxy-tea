import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const [{ data: items }, { data: votes }] = await Promise.all([
    supabase.from('items').select('*').eq('session_id', id).order('created_at', { ascending: true }),
    supabase.from('votes').select('*').eq('session_id', id),
  ])

  return NextResponse.json({ ...session, items: items ?? [], votes: votes ?? [] })
}
