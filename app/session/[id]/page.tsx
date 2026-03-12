'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ref, onValue, push, set, remove } from 'firebase/database'
import { db } from '@/lib/firebase'
import { getVoterId } from '@/lib/voter'

type Session = { id: string; name: string; created_at: string; expires_at: string }
type Item = { id: string; label: string; created_at: string }
type Vote = { item_id: string; voter_id: string }

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

    const sessionUnsub = onValue(ref(db, `sessions/${id}`), snap => {
      if (!snap.exists()) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setSession({ id, ...snap.val() })
      setLoading(false)
    })

    const itemsUnsub = onValue(ref(db, `items/${id}`), snap => {
      const data = snap.val() as Record<string, Omit<Item, 'id'>> | null
      if (!data) { setItems([]); return }
      const list: Item[] = Object.entries(data)
        .map(([itemId, val]) => ({ id: itemId, ...val }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
      setItems(list)
    })

    const votesUnsub = onValue(ref(db, `votes/${id}`), snap => {
      const data = snap.val() as Record<string, Record<string, true>> | null
      if (!data) { setVotes([]); return }
      const flat: Vote[] = []
      for (const [itemId, voters] of Object.entries(data)) {
        for (const voterId of Object.keys(voters)) {
          flat.push({ item_id: itemId, voter_id: voterId })
        }
      }
      setVotes(flat)
    })

    return () => {
      sessionUnsub()
      itemsUnsub()
      votesUnsub()
    }
  }, [id])

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || isExpired) return
    setAdding(true)
    const newItemRef = push(ref(db, `items/${id}`))
    await set(newItemRef, {
      label: label.trim(),
      created_at: new Date().toISOString(),
    })
    setLabel('')
    setAdding(false)
  }

  async function toggleVote(itemId: string) {
    if (isExpired) return
    const voterId = voterIdRef.current
    const hasVoted = votes.some(v => v.item_id === itemId && v.voter_id === voterId)
    setVotingItem(itemId)
    const voteRef = ref(db, `votes/${id}/${itemId}/${voterId}`)
    if (hasVoted) {
      await remove(voteRef)
    } else {
      await set(voteRef, true)
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
