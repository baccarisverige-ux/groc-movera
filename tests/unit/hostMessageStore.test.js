import { describe, expect, it } from 'vitest'
import { buildHostThreads, threadIdForReservation } from '../../src/entities/host/hostMessageStore.js'

const reservation = (id, checkIn) => ({ id, listingId: 'listing-1', checkIn, checkOut: '2026-12-01', units: 1, guestLabel: `Guest ${id}` })
const message = (threadId, createdAt, body = 'hello') => ({ id: `m-${createdAt}`, threadId, listingId: 'listing-1', body, author: 'host', createdAt })

describe('host message threads', () => {
  it('opens one thread per reservation, even with nothing written yet', () => {
    const threads = buildHostThreads([reservation('r1', '2026-10-04'), reservation('r2', '2026-11-12')], [])
    expect(threads).toHaveLength(2)
    expect(threads.every((thread) => thread.unanswered)).toBe(true)
    expect(threads.map((thread) => thread.threadId)).toEqual([
      threadIdForReservation('listing-1', 'r1'),
      threadIdForReservation('listing-1', 'r2'),
    ])
  })

  it('orders unwritten threads by who arrives next', () => {
    const threads = buildHostThreads([reservation('late', '2026-11-12'), reservation('soon', '2026-10-04')], [])
    expect(threads.map((thread) => thread.reservation.id)).toEqual(['soon', 'late'])
  })

  /* The bug this covers: message timestamps are full ISO datetimes and check-ins
     are plain dates. Ordering both on one raw string key sank a thread written
     to today below a stay two months out, so the conversation the host had just
     sent to scrolled away from under them. */
  it('floats conversations with messages above untouched ones, newest first', () => {
    const rows = [reservation('future', '2026-11-12'), reservation('soon', '2026-10-04')]
    const soonThread = threadIdForReservation('listing-1', 'soon')
    const threads = buildHostThreads(rows, [message(soonThread, '2026-09-11T18:00:00.000Z')])

    expect(threads[0].reservation.id).toBe('soon')
    expect(threads[0].unanswered).toBe(false)
    expect(threads[0].lastMessage.body).toBe('hello')
    expect(threads[1].reservation.id).toBe('future')
  })

  it('keeps each thread in send order and reports the latest', () => {
    const threadId = threadIdForReservation('listing-1', 'r1')
    const threads = buildHostThreads([reservation('r1', '2026-10-04')], [
      message(threadId, '2026-09-11T18:05:00.000Z', 'second'),
      message(threadId, '2026-09-11T18:00:00.000Z', 'first'),
    ])
    expect(threads[0].messages.map((item) => item.body)).toEqual(['first', 'second'])
    expect(threads[0].lastMessage.body).toBe('second')
  })

  it('never mixes messages between threads', () => {
    const rows = [reservation('r1', '2026-10-04'), reservation('r2', '2026-11-12')]
    const threads = buildHostThreads(rows, [message(threadIdForReservation('listing-1', 'r2'), '2026-09-11T18:00:00.000Z')])
    const byId = Object.fromEntries(threads.map((thread) => [thread.reservation.id, thread]))
    expect(byId.r2.messages).toHaveLength(1)
    expect(byId.r1.messages).toHaveLength(0)
  })
})
