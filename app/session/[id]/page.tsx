'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getVoterId } from '@/lib/voter'

type Session = { id: string; name: string; created_at: string; expires_at: string }
type Item = { id: string; session_id: string; label: string; created_at: string }
type Vote = { id: string; item_id: string; session_id: string; voter_id: string; created_at: string }

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!expiresAt) return
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setRemaining('Expired'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${m}:${s.toString().padStart(2, '0')}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return remaining
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [label, setLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [votingItem, setVotingItem] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const voterIdRef = useRef<string>('')
  const countdown = useCountdown(session?.expires_at ?? null)
  const isExpired = session ? new Date(session.expires_at) < new Date() : false

  useEffect(() => {
    voterIdRef.current = getVoterId()

    fetch(`/api/sessions/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        const { items: fetchedItems, votes: fetchedVotes, ...sessionData } = data
        setSession(sessionData)
        setItems(fetchedItems)
        setVotes(fetchedVotes)
        setLoading(false)
      })

    const channel = supabase
      .channel(`session-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'items', filter: `session_id=eq.${id}` },
        (payload) => {
          setItems(prev => [...prev, payload.new as Item])
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `session_id=eq.${id}` },
        (payload) => {
          setVotes(prev => [...prev, payload.new as Vote])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'votes', filter: `session_id=eq.${id}` },
        (payload) => {
          const deleted = payload.old as Partial<Vote>
          setVotes(prev => prev.filter(v => !(v.item_id === deleted.item_id && v.voter_id === deleted.voter_id)))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || isExpired) return
    setAdding(true)
    await fetch(`/api/sessions/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    })
    setLabel('')
    setAdding(false)
  }

  async function toggleVote(itemId: string) {
    if (isExpired) return
    const voterId = voterIdRef.current
    const hasVoted = votes.some(v => v.item_id === itemId && v.voter_id === voterId)
    setVotingItem(itemId)

    if (hasVoted) {
      await fetch(`/api/sessions/${id}/votes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, voter_id: voterId }),
      })
    } else {
      await fetch(`/api/sessions/${id}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, voter_id: voterId }),
      })
    }
    setVotingItem(null)
  }

  if (loading && !notFound) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-zinc-500 mb-4">Session not found.</p>
          <button onClick={() => router.push('/')} className="text-sm underline text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            Back to home
          </button>
        </div>
      </div>
    )
  }

  const voterId = voterIdRef.current

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <button
              onClick={() => router.push('/')}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 mb-2 block"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {session?.name}
            </h1>
          </div>
          <div className="text-right">
            <span className={`text-sm font-medium tabular-nums ${isExpired ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {countdown}
            </span>
            {isExpired && (
              <p className="text-xs text-red-400 mt-0.5">Session ended</p>
            )}
          </div>
        </div>

        {/* Add item form */}
        {!isExpired && (
          <form onSubmit={addItem} className="flex gap-2 mb-8">
            <input
              type="text"
              placeholder="Add an option..."
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            <button
              type="submit"
              disabled={adding || !label.trim()}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 disabled:opacity-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </form>
        )}

        {/* Items */}
        {items.length === 0 ? (
          <p className="text-sm text-zinc-400">No options yet. Add one above.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map(item => {
              const voteCount = votes.filter(v => v.item_id === item.id).length
              const hasVoted = votes.some(v => v.item_id === item.id && v.voter_id === voterId)
              const isVoting = votingItem === item.id

              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3"
                >
                  <span className="text-sm text-zinc-900 dark:text-zinc-50">{item.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums text-zinc-500 dark:text-zinc-400 min-w-[1.5rem] text-right">
                      {voteCount}
                    </span>
                    {!isExpired && (
                      <button
                        onClick={() => toggleVote(item.id)}
                        disabled={isVoting}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                          hasVoted
                            ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200'
                            : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {isVoting ? '...' : hasVoted ? 'Voted' : 'Vote'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
