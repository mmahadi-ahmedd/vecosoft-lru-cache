import { ListNode } from './ListNode'

export interface LRUCacheOptions<K, V> {
  /** Called whenever an entry is evicted because the cache is full. */
  onEvict?: (key: K, value: V) => void
  /** Default time-to-live in milliseconds for every entry. Omit for no expiry. */
  ttlMs?: number
  /** Clock used for expiry checks. Injectable so tests need no real waiting. */
  now?: () => number
}

function assertValidTtl(ttlMs: number): void {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new RangeError('ttlMs must be a positive number of milliseconds')
  }
}

/**
 * Least Recently Used cache with O(1) average get and put, and optional TTL.
 *
 * - `map` finds a node by key in O(1).
 * - A doubly linked list orders nodes from most recently used (next to `head`)
 *   to least recently used (next to `tail`), so reordering and eviction are O(1).
 * - `head` and `tail` are sentinel nodes that remove empty-list edge cases.
 * - Expiry is lazy: an expired entry is dropped when it is next read, so get and
 *   put stay O(1) without timers. Use `purgeExpired()` to sweep eagerly.
 */
export class LRUCache<K, V> {
  private readonly map = new Map<K, ListNode<K, V>>()
  private readonly head: ListNode<K, V>
  private readonly tail: ListNode<K, V>
  private readonly now: () => number

  constructor(
    readonly capacity: number,
    private readonly options: LRUCacheOptions<K, V> = {},
  ) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError('capacity must be a positive integer')
    }
    if (options.ttlMs !== undefined) assertValidTtl(options.ttlMs)

    this.now = options.now ?? Date.now
    this.head = new ListNode<K, V>(undefined as unknown as K, undefined as unknown as V)
    this.tail = new ListNode<K, V>(undefined as unknown as K, undefined as unknown as V)
    this.head.next = this.tail
    this.tail.prev = this.head
  }

  /** Number of stored entries. May include expired entries that have not been removed yet. */
  get size(): number {
    return this.map.size
  }

  /** Returns the value for `key`, or -1 if it is missing or expired. A hit marks the key as most recently used. */
  get(key: K): V | -1 {
    const node = this.map.get(key)
    if (!node) return -1
    if (this.isExpired(node)) {
      this.remove(node)
      return -1
    }
    this.moveToFront(node)
    return node.value
  }

  /**
   * Inserts or updates `key`, marking it most recently used and (re)starting its TTL.
   * `ttlMs` overrides the cache-wide default for this entry.
   * Evicts the least recently used entry if the cache is over capacity.
   */
  put(key: K, value: V, ttlMs: number | undefined = this.options.ttlMs): void {
    if (ttlMs !== undefined) assertValidTtl(ttlMs)
    const expiresAt = ttlMs === undefined ? null : this.now() + ttlMs

    const existing = this.map.get(key)
    if (existing) {
      existing.value = value
      existing.expiresAt = expiresAt
      this.moveToFront(existing)
      return
    }

    const node = new ListNode(key, value, expiresAt)
    this.map.set(key, node)
    this.addToFront(node)

    if (this.map.size > this.capacity) {
      this.evictLeastRecentlyUsed()
    }
  }

  /** Removes every expired entry and returns how many were removed. O(n). */
  purgeExpired(): number {
    let removed = 0
    for (const node of [...this.map.values()]) {
      if (this.isExpired(node)) {
        this.remove(node)
        removed++
      }
    }
    return removed
  }

  /** Live (non-expired) entries ordered from most to least recently used. O(n), for debugging and demos. */
  entries(): [K, V][] {
    const result: [K, V][] = []
    for (let node = this.head.next; node !== this.tail; node = node.next) {
      if (!this.isExpired(node)) result.push([node.key, node.value])
    }
    return result
  }

  private isExpired(node: ListNode<K, V>): boolean {
    return node.expiresAt !== null && node.expiresAt <= this.now()
  }

  private addToFront(node: ListNode<K, V>): void {
    node.prev = this.head
    node.next = this.head.next
    this.head.next.prev = node
    this.head.next = node
  }

  private unlink(node: ListNode<K, V>): void {
    node.prev.next = node.next
    node.next.prev = node.prev
  }

  private remove(node: ListNode<K, V>): void {
    this.unlink(node)
    this.map.delete(node.key)
  }

  private moveToFront(node: ListNode<K, V>): void {
    this.unlink(node)
    this.addToFront(node)
  }

  private evictLeastRecentlyUsed(): void {
    const lru = this.tail.prev
    this.remove(lru)
    this.options.onEvict?.(lru.key, lru.value)
  }
}