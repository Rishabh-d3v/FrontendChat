import DeleteSet from './DeleteSet.js'
export default class TextCRDT {
  constructor(clientId) {
    this.clientId = clientId
    this.clock = 0
    this.items = []            
    this.deleteSet = new DeleteSet()
    this.pending = []          
  }

  toString() {
    let out = ''
    for (const item of this.items) 
      if (item.text !== null) out += item.text
    return out
  }

  localInsert(index, text) {
    if (!text) return []
    const item = {
      client: this.clientId,
      clock: this.clock + 1,
      length: text.length,
      text,
      origin: index === 0 ? null : this.idAtIndex(index - 1),
    }
    const copy = { ...item }
    this.integrate(item)
    return [copy]
  }
  localDelete(index, count) {
    const ranges = []
    let pos = 0
    for (const item of this.items) {
      if (item.text === null) continue
      const from = Math.max(index, pos)
      const to = Math.min(index + count, pos + item.length)
      if (from < to) ranges.push([item.client, item.clock + (from - pos), to - from])
      pos += item.length
      if (pos >= index + count) break
    }
    for (const [client, start, length] of ranges) this.deleteRange(client, start, length)
    return ranges
  }

  applyUpdate(update) {
    for (const [client, start, length] of update.deletes ?? []) {
      this.deleteRange(client, start, length)
    }
    this.pending.push(...(update.items ?? []).map((item) => ({ ...item })))

    let progress = true
    while (progress) {
      progress = false
      this.pending = this.pending.filter((item) => {
        const placed = this.integrate(item)
        if (placed) progress = true
        return !placed
      })
    }
  }

  encodeState() {
    return {
      items: this.items.map((item) => ({ ...item })),
      deletes: this.deleteSet.toArray(),
    }
  }

  relativePosition(index) {
    return index === 0 ? null : this.idAtIndex(index - 1)
  }

  absolutePosition(id) {
    if (id === null) return 0
    let pos = 0
    for (const item of this.items) {
      if (item.client === id.client && id.clock >= item.clock && id.clock < item.clock + item.length) {
        return item.text === null ? pos : pos + (id.clock - item.clock) + 1
      }
      if (item.text !== null) pos += item.length
    }
    return pos
  }
  idAtIndex(index) {
    let pos = 0
    for (const item of this.items) {
      if (item.text === null) continue
      if (index < pos + item.length) return { 
        client: item.client, clock: item.clock + (index - pos) }
      pos += item.length
    }
    return null
  }

  integrate(item) {
    for (;;) {
      const known = this.items[this.findIndex(item.client, item.clock)]
      if (!known) break
      const skip = known.clock + known.length - item.clock
      if (skip >= item.length) return true
      item = sliceItem(item, skip)
    }

    let pos = 0
    if (item.origin !== null) {
      const o = this.findIndex(item.origin.client, item.origin.clock)
      if (o === -1) return false
      this.splitAt(o, item.origin.clock - this.items[o].clock + 1)
      pos = o + 1
    }

    while (pos < this.items.length && isNewer(this.items[pos], item)) pos++

    this.items.splice(pos, 0, item)
    this.clock = Math.max(this.clock, item.clock + item.length - 1)
    const first = item.clock
    const last = item.clock + item.length
    for (const [start, length] of this.deleteSet.rangesOf(item.client)) {
      if (start < last && start + length > first) {
        this.markDeleted(item.client, start, length)
      }
    }
    this.mergeNeighbours()
    return true
  }

  deleteRange(client, start, length) {
    this.deleteSet.add(client, start, length)
    this.markDeleted(client, start, length)
    this.mergeNeighbours()
  }
  markDeleted(client, start, length) {
    const end = start + length
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]
      if (item.client !== client || item.text === null) continue
      const from = Math.max(start, item.clock)
      const to = Math.min(end, item.clock + item.length)
      if (from >= to) continue
      if (from > item.clock) {
        this.splitAt(i, from - item.clock)
        continue
      }
      this.splitAt(i, to - item.clock)
      item.text = null
    }
  }

  splitAt(index, offset) {
    const item = this.items[index]
    if (offset <= 0 || offset >= item.length) return
    this.items.splice(index + 1, 0, sliceItem(item, offset))
    item.length = offset
    if (item.text !== null) item.text = item.text.slice(0, offset)
  }
  mergeNeighbours() {
    const merged = []
    for (const item of this.items) {
      const last = merged[merged.length - 1]
      if (last && canMerge(last, item)) {
        last.length += item.length
        if (last.text !== null) last.text += item.text
      } else {
        merged.push(item)
      }
    }
    this.items = merged
  }

  findIndex(client, clock) {
    return this.items.findIndex(
      (item) => item.client === client && clock >= item.clock && clock < item.clock + item.length
    )
  }

}

function sliceItem(item, offset) {
  return {
    client: item.client,
    clock: item.clock + offset,
    length: item.length - offset,
    text: item.text === null ? null : item.text.slice(offset),
    origin: { client: item.client, clock: item.clock + offset - 1 },
  }
}

function isNewer(a, b) {
  return a.clock > b.clock || (a.clock === b.clock && a.client > b.client)
}

function canMerge(a, b) {
  return (
    a.client === b.client &&
    b.clock === a.clock + a.length &&
    (a.text === null) === (b.text === null) &&
    b.origin !== null &&
    b.origin.client === a.client &&
    b.origin.clock === a.clock + a.length - 1
  )
}
