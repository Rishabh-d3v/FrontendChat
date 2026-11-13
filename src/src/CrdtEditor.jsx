import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import TextCRDT from './crdt/TextCRDT'
import findDiff from './FindDiff'
import './yjs.css'

const DOC_ID = 'raw-crdt-1'

const encode = (update) => Array.from(new TextEncoder().encode(JSON.stringify(update)))
const decode = (bytes) => JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))

export default function CrdtEditor({ stompClient }) {
  const docRef = useRef(null)
  if (docRef.current === null) {
    console.log('Creating new TextCRDT instance')
    docRef.current = new TextCRDT(Math.floor(Math.random() * 2 ** 31))
    console.log('TextCRDT instance created:', docRef.current)
  }
  const doc = docRef.current

  const [text, setText] = useState('')
  const textareaRef = useRef(null)
  const sendRef = useRef(null)
  const savedCaret = useRef(null)

  useEffect(() => {
    if (!stompClient || !stompClient.connected) return
    const clientId = String(doc.clientId)

    const send = (type, update) =>
      stompClient.publish({
        destination: `/chat/edit/${DOC_ID}`,
        body: JSON.stringify({ type, data: update ? encode(update) : [], clientId }),
      })

    const sub = stompClient.subscribe(`/topic/yjs/${DOC_ID}`, (message) => {
      const msg = JSON.parse(message.body)
      if (msg.clientId === clientId) return

      if (msg.type === 'update') {
        const el = textareaRef.current
        if (el && savedCaret.current === null) {
          savedCaret.current = {
            start: doc.relativePosition(el.selectionStart),
            end: doc.relativePosition(el.selectionEnd),
          }
        }
        doc.applyUpdate(decode(msg.data))
        setText(doc.toString())
      }
      if (msg.type === 'sync-request') {
        send('update', doc.encodeState())
      }
    })
    sendRef.current = send

    send('update', doc.encodeState())
    send('sync-request')

    return () => {
      sendRef.current = null
      sub.unsubscribe()
    }
  }, [doc, stompClient, stompClient?.connected])

  useLayoutEffect(() => {
    const caret = savedCaret.current
    if (!caret || !textareaRef.current) return
    savedCaret.current = null
    if (document.activeElement !== textareaRef.current) return
    textareaRef.current.setSelectionRange(doc.absolutePosition(caret.start),
    doc.absolutePosition(caret.end))
  }, [doc, text])

  const handleChange = (e) => {
    const { start, delete_count, newText } = findDiff(doc.toString(), e.target.value)
    const deletes = delete_count > 0 ? doc.localDelete(start, delete_count) : []
    const items = newText ? doc.localInsert(start, newText) : []
    setText(doc.toString())
    sendRef.current?.('update', { items, deletes })
  }

  return (
    <div className="editor-container">
      <textarea ref={textareaRef} value={text} onChange={handleChange} />
    </div>
  )
}
