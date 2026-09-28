/** A node in a doubly linked list. Each node knows both neighbours,
 *  so it can be unlinked or moved in O(1) without searching. */
export class ListNode<K, V> {
  prev!: ListNode<K, V>
  next!: ListNode<K, V>

  constructor(
    readonly key: K,
    public value: V,
  ) {}
}