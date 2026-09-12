import { createLocalCollection } from '../../services/data/localCollection.js'

/* Host ↔ traveller messages, one thread per confirmed reservation.

   The workspace previously showed a permanent empty state here, and it was
   right to: the guest-side conversations are demo fixtures, and presenting them
   as this host's inbox would have been inventing correspondence. So threads are
   derived from something real instead — a reservation that actually exists in
   this listing's inventory — and the only messages stored are the ones the host
   actually writes. Nothing fabricates a traveller reply.

   Built on the collection contract rather than storageAdapter directly, so the
   day a messaging backend exists this store changes its data source and the
   screen does not change at all. */

export const HOST_MESSAGE_EVENT = 'movera:host-messages-change'

const messages = createLocalCollection({
  name: 'host-messages',
  storageKey: 'movera:host-messages:v1',
  idPrefix: 'msg',
  validate: (record) => {
    if (!record.threadId) return 'threadId is required'
    if (!String(record.body || '').trim()) return 'an empty message cannot be sent'
    return null
  },
})

function announce() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(HOST_MESSAGE_EVENT))
}

export function threadIdForReservation(listingId, reservationId) {
  return `${listingId}::${reservationId}`
}

export async function listThreadMessages(threadId) {
  const result = await messages.list({ threadId })
  if (!result.ok) return []
  return result.data.slice().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
}

export async function listMessagesForListing(listingId) {
  const result = await messages.list({ listingId })
  return result.ok ? result.data : []
}

/* Returns the contract envelope rather than a boolean, so the caller can tell
   "sent" from "could not be saved" — storage is blocked in private browsing and
   full stores reject writes. */
export async function sendHostMessage({ listingId, threadId, body }) {
  const result = await messages.create(
    { body: String(body || '').trim(), author: 'host' },
    { listingId, threadId },
  )
  if (result.ok) announce()
  return result
}

/* One thread per reservation, newest activity first. A thread with no messages
   is still a real thread — it is a guest the host has not written to yet. */
export function buildHostThreads(reservations, allMessages) {
  const byThread = new Map()
  for (const message of allMessages) {
    const bucket = byThread.get(message.threadId) || []
    bucket.push(message)
    byThread.set(message.threadId, bucket)
  }

  return reservations
    .map((reservation) => {
      const threadId = threadIdForReservation(reservation.listingId, reservation.id)
      const thread = (byThread.get(threadId) || [])
        .slice()
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      const last = thread[thread.length - 1] || null
      return {
        threadId,
        reservation,
        messages: thread,
        lastMessage: last,
        lastActivity: last?.createdAt || '',
        upcoming: reservation.checkIn || '',
        unanswered: thread.length === 0,
      }
    })
    /* Inbox ordering, in two tiers.

       Conversations you have actually written in come first, most recent reply
       at the top -- that is what an inbox is for, and it keeps the thread you
       just sent to under your eyes instead of sinking it.

       Threads with no messages follow, soonest arrival first, because the
       useful question there is "who checks in next and still needs a word".

       Ordering them all on one key was the bug: message timestamps are full ISO
       datetimes and check-ins are plain dates, so a thread written to today
       sorted below a stay two months out, and the open conversation jumped
       away the moment the host pressed send. */
    .sort((a, b) => {
      if (a.lastActivity && b.lastActivity) return b.lastActivity.localeCompare(a.lastActivity)
      if (a.lastActivity) return -1
      if (b.lastActivity) return 1
      return String(a.upcoming).localeCompare(String(b.upcoming))
    })
}
