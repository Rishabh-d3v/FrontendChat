export default class DeleteSet {
  constructor() {
    this.clients = new Map()
  }    
  add(client, start, length) {
    if (length <= 0) return
    const ranges = this.clients.get(client) ?? []
    ranges.push([start, length])
    ranges.sort((a, b) => a[0] - b[0])

    const merged = [ranges[0]]
    for (let i = 1; i < ranges.length; i++) {
      const last = merged[merged.length - 1]
      const [s, l] = ranges[i]
      if (s <= last[0] + last[1]) {
        last[1] = Math.max(last[1], s + l - last[0])
      } else {
        merged.push([s, l])
      }
    }
    this.clients.set(client, merged)
  }

  rangesOf(client) {
    return this.clients.get(client) ?? []
  }

  toArray() {
    const out = []
    for (const [client, ranges] of this.clients) {
      for (const [start, length] of ranges) out.push([client, start, length])
    }
    return out
  }
}
