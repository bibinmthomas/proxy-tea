'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Session = {
  id: string
  name: string
  created_at: string
  expires_at: string
}

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Less than a minute'
  return `${minutes} min left`
}

export default function Home() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(data => {
        setSessions(data)
        setLoading(false)
      })
  }, [])

  async function createSession(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const session = await res.json()
    router.push(`/session/${session.id}`)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
          proxy-tea
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-10">
          Vote on where to eat or drink.
        </p>

        {/* Create session */}
        <form onSubmit={createSession} className="flex gap-2 mb-10">
          <input
            type="text"
            placeholder="Session name..."
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 disabled:opacity-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            {creating ? 'Creating...' : 'New session'}
          </button>
        </form>

        {/* Sessions list */}
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
            Active sessions
          </h2>
          {loading ? (
            <p className="text-sm text-zinc-400">Loading...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-zinc-400">No active sessions. Create one above.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sessions.map(session => (
                <li key={session.id}>
                  <button
                    onClick={() => router.push(`/session/${session.id}`)}
                    className="w-full text-left rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {session.name}
                    </span>
                    <span className="block text-xs text-zinc-400 mt-0.5">
                      {timeRemaining(session.expires_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
