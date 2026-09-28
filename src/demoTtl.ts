import { LRUCache } from './LRUCache'

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const start = performance.now()
const at = () => `t=${String(Math.round(performance.now() - start)).padStart(4)} ms`

const cache = new LRUCache<string, number>(3, { ttlMs: 1000 })

function get(key: string): void {
  const result = cache.get(key)
  const note = result === -1 ? 'missing or expired' : 'hit'
  console.log(`${at()}  get("${key}") -> ${result}   (${note})`)
}

console.log('LRU Cache TTL demo (capacity = 3, default TTL = 1000 ms)')
console.log('---------------------------------------------------------')

cache.put('A', 1)
console.log(`${at()}  put("A", 1)          default TTL 1000 ms`)
cache.put('B', 2, 300)
console.log(`${at()}  put("B", 2, 300)     per-entry TTL 300 ms`)
get('A')
get('B')

await sleep(400)
console.log('\n... waited 400 ms ...')
get('B') // expired after 300 ms
get('A') // still valid, get does not extend the TTL

await sleep(700)
console.log('\n... waited another 700 ms ...')
get('A') // expired after 1000 ms

console.log('\nLazy expiry: expired entries keep their slot until touched or purged')
cache.put('C', 3, 100)
cache.put('D', 4, 100)
await sleep(150)
console.log(`${at()}  size before purge: ${cache.size}`)
console.log(`${at()}  purgeExpired() removed ${cache.purgeExpired()} entries`)
console.log(`${at()}  size after purge:  ${cache.size}`)