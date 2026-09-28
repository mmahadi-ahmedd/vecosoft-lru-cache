import assert from 'node:assert/strict'
import { LRUCache } from './LRUCache'

const cache = new LRUCache<string, number>(2, {
  onEvict: (key, value) =>
    console.log(`   [evicted] least recently used entry removed: "${key}" -> ${value}`),
})

const state = () =>
  cache
    .entries()
    .map(([key, value]) => `${key}=${value}`)
    .join(', ') || '(empty)'

function put(key: string, value: number): void {
  console.log(`put("${key}", ${value})`)
  cache.put(key, value)
  console.log(`   order (most -> least recent): ${state()}`)
}

function get(key: string, expected: number): void {
  const result = cache.get(key)
  const verdict = result === expected ? 'PASS' : 'FAIL'
  console.log(`get("${key}") -> ${result}   [expected ${expected}: ${verdict}]`)
  console.log(`   order (most -> least recent): ${state()}`)
  assert.equal(result, expected)
}

console.log('LRU Cache demo (capacity = 2)')
console.log('-----------------------------')
put('A', 10)
put('B', 20)
get('A', 10)
put('C', 30)
get('B', -1)
get('C', 30)
get('A', 10)
console.log('-----------------------------')
console.log('All results match the expected values.')