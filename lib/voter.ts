export function getVoterId(): string {
  if (typeof window === 'undefined') return ''
  let voterId = localStorage.getItem('proxy_tea_voter_id')
  if (!voterId) {
    voterId = crypto.randomUUID()
    localStorage.setItem('proxy_tea_voter_id', voterId)
  }
  return voterId
}
