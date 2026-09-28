import { describe, expect, it, vi } from 'vitest'
import { LRUCache } from '../src'

describe('LRUCache', () => {
  it('matches the example from the task', () => {
    const cache = new LRUCache<string, number>(2)
    cache.put('A', 10)
    cache.put('B', 20)
    expect(cache.get('A')).toBe(10)
    cache.put('C', 30)
    expect(cache.get('B')).toBe(-1)
    expect(cache.get('C')).toBe(30)
    expect(cache.get('A')).toBe(10)
  })

  it('returns -1 for a missing key', () => {
    expect(new LRUCache<string, number>(1).get('nope')).toBe(-1)
  })

  it('a successful get makes the key most recently used', () => {
    const cache = new LRUCache<string, number>(2)
    cache.put('A', 1)
    cache.put('B', 2)
    cache.get('A')
    expect(cache.entries().map(([k]) => k)).toEqual(['A', 'B'])
  })

  it('updating an existing key refreshes it and does not grow the cache', () => {
    const cache = new LRUCache<string, number>(2)
    cache.put('A', 1)
    cache.put('B', 2)
    cache.put('A', 99)
    expect(cache.size).toBe(2)
    cache.put('C', 3) // evicts B, the least recently used
    expect(cache.get('B')).toBe(-1)
    expect(cache.get('A')).toBe(99)
  })

  it('evicts the least recently used entry when capacity is exceeded', () => {
    const cache = new LRUCache<string, number>(3)
    ;['A', 'B', 'C', 'D'].forEach((k, i) => cache.put(k, i))
    expect(cache.get('A')).toBe(-1)
    expect(cache.size).toBe(3)
  })

  it('works with capacity 1', () => {
    const cache = new LRUCache<string, number>(1)
    cache.put('A', 1)
    cache.put('B', 2)
    expect(cache.get('A')).toBe(-1)
    expect(cache.get('B')).toBe(2)
  })

  it('reports evictions through onEvict', () => {
    const onEvict = vi.fn()
    const cache = new LRUCache<string, number>(1, { onEvict })
    cache.put('A', 1)
    cache.put('B', 2)
    expect(onEvict).toHaveBeenCalledWith('A', 1)
  })

  it('rejects non-positive or non-integer capacity', () => {
    expect(() => new LRUCache(0)).toThrow(RangeError)
    expect(() => new LRUCache(-3)).toThrow(RangeError)
    expect(() => new LRUCache(1.5)).toThrow(RangeError)
  })

  it('never exceeds capacity under heavy use', () => {
    const cache = new LRUCache<number, number>(100)
    for (let i = 0; i < 10_000; i++) cache.put(i, i)
    expect(cache.size).toBe(100)
    expect(cache.get(9_999)).toBe(9_999)
    expect(cache.get(0)).toBe(-1)
  })
})

describe('LRUCache TTL', () => {
  function setup(ttlMs = 1000) {
    let time = 0
    const cache = new LRUCache<string, number>(2, { ttlMs, now: () => time })
    return {
      cache,
      advance: (ms: number) => {
        time += ms
      },
    }
  }

  it('returns a value until its TTL elapses', () => {
    const { cache, advance } = setup()
    cache.put('A', 1)
    advance(999)
    expect(cache.get('A')).toBe(1)
    advance(1)
    expect(cache.get('A')).toBe(-1)
  })

  it('removes an expired entry when it is read', () => {
    const { cache, advance } = setup()
    cache.put('A', 1)
    advance(1000)
    expect(cache.get('A')).toBe(-1)
    expect(cache.size).toBe(0)
  })

  it('put refreshes the TTL of an existing key', () => {
    const { cache, advance } = setup()
    cache.put('A', 1)
    advance(800)
    cache.put('A', 2)
    advance(800)
    expect(cache.get('A')).toBe(2)
  })

  it('lets a per-entry TTL override the default', () => {
    const { cache, advance } = setup()
    cache.put('A', 1, 500)
    cache.put('B', 2)
    advance(600)
    expect(cache.get('A')).toBe(-1)
    expect(cache.get('B')).toBe(2)
  })

  it('keeps expired entries in the cache until they are touched or purged', () => {
    const { cache, advance } = setup()
    cache.put('A', 1)
    cache.put('B', 2)
    advance(2000)
    expect(cache.size).toBe(2)
    expect(cache.entries()).toEqual([])
    expect(cache.purgeExpired()).toBe(2)
    expect(cache.size).toBe(0)
  })

  it('never expires entries when no TTL is set', () => {
    let time = 0
    const cache = new LRUCache<string, number>(2, { now: () => time })
    cache.put('A', 1)
    time += 10 ** 9
    expect(cache.get('A')).toBe(1)
  })

  it('rejects an invalid TTL', () => {
    expect(() => new LRUCache(1, { ttlMs: 0 })).toThrow(RangeError)
    expect(() => new LRUCache<string, number>(1).put('A', 1, -5)).toThrow(RangeError)
  })
})