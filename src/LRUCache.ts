import { ListNode } from './ListNode'

export interface LRUCacheOptions<K, V> {
  /** Called whenever an entry is evicted because the cache is full. */
  onEvict?: (key: K, value: V) => void
}

/**
 * Least Recently Used cache with O(1) average get and put.
 *
 * - `map` finds a node by key in O(1).
 * - A doubly linked list orders nodes from most recently used (next to `head`)
 *   to least recently used (next to `tail`), so reordering and eviction are O(1).
 * - `head` and `tail` are sentinel nodes that remove empty-list edge cases.
 */
export class LRUCache<K, V> {
  private readonly map = new Map<K, ListNode<K, V>>()
  private readonly head: ListNode<K, V>
  private readonly tail: ListNode<K, V>

  constructor(
    readonly capacity: number,
    private readonly options: LRUCacheOptions<K, V> = {},
  ) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError('capacity must be a positive integer')
    }
    this.head = new ListNode<K, V>(undefined as unknown as K, undefined as unknown as V)
    this.tail = new ListNode<K, V>(undefined as unknown as K, undefined as unknown as V)
    this.head.next = this.tail
    this.tail.prev = this.head
  }

  get size(): number {
    return this.map.size
  }

  /** Returns the value for `key`, or -1 if it is not cached. A hit marks the key as most recently used. */
  get(key: K): V | -1 {
    const node = this.map.get(key)
    if (!node) return -1
    this.moveToFront(node)
    return node.value
  }

  /** Inserts or updates `key`, marking it most recently used. Evicts the least recently used entry if over capacity. */
  put(key: K, value: V): void {
    const existing = this.map.get(key)
    if (existing) {
      existing.value = value
      this.moveToFront(existing)
      return
    }

    const node = new ListNode(key, value)
    this.map.set(key, node)
    this.addToFront(node)

    if (this.map.size > this.capacity) {
      this.evictLeastRecentlyUsed()
    }
  }

  /** Entries ordered from most to least recently used. O(n), intended for debugging and demos. */
  entries(): [K, V][] {
    const result: [K, V][] = []
    for (let node = this.head.next; node !== this.tail; node = node.next) {
      result.push([node.key, node.value])
    }
    return result
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

  private moveToFront(node: ListNode<K, V>): void {
    this.unlink(node)
    this.addToFront(node)
  }

  private evictLeastRecentlyUsed(): void {
    const lru = this.tail.prev
    this.unlink(lru)
    this.map.delete(lru.key)
    this.options.onEvict?.(lru.key, lru.value)
  }
}
