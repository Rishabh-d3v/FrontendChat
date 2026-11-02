import * as Y from 'yjs'
import diff from 'fast-diff'
import { useState, useEffect } from 'react'
import './yjs.css'

const REMOTE = Symbol('remote')
const LOCAL = 'local-typing' 
const DOC_ID = '999'
function useYdoc() {
  const [session, setSession] = useState(null)
  console.log('step 1: useYdoc session', session)
  useEffect(() => {
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText('shared-text')
    setSession({ ydoc, ytext })
    console.log('step 2: useYdoc session set', session)
    return () => {
      ydoc.destroy()
      setSession(null)
    }
  }, [])
  console.log('step 3: useYdoc session return', session)
  return { ...session }
}
function useYjsStomp(ydoc, stompClient, docId) {
  useEffect(() => {
    if (!ydoc || !stompClient || !stompClient.connected) return
    console.log("step 4: useYjsStomp stompClient connected", stompClient.connected)
    const clientId = String(ydoc.clientID)

    const send = (type, update) =>
      console.log('step 5: sending', type, update) ||
      stompClient.publish({
        destination: `/chat/edit/${docId}`,
        body: JSON.stringify({
          type,
          data: update ? Array.from(update) : [], 
          clientId,
        }),
      })

    const sub = stompClient.subscribe(`/topic/yjs/${docId}`, (message) => {
      const msg = JSON.parse(message.body)
      if (msg.clientId === clientId) return 

      if (msg.type === 'update') {
        console.log('step 6: applying update', msg.data)
        Y.applyUpdate(ydoc, new Uint8Array(msg.data), REMOTE) 
      }
      if (msg.type === 'sync-request') {
        console.log('step 7: sending full document to newcomer ',ydoc)
        send('update', Y.encodeStateAsUpdate(ydoc))
      }
    })

    const onUpdate = (update, origin) => {
      console.log('step 8: onUpdate', update, origin)
      if (origin === REMOTE) return 
      send('update', update)
    }
    ydoc.on('update', onUpdate)

    send('sync-request')

    return () => {
      ydoc.off('update', onUpdate)
      sub.unsubscribe()
    }
  }, [ydoc, stompClient, stompClient?.connected, docId])
}

function diffToDelta(diffResult) {
  console.log('step 9: diffToDelta==> ', diffResult)
  return diffResult
    .map(([op, value]) =>
      op === diff.INSERT ? { insert: value } :
      op === diff.EQUAL ? { retain: value.length } :
      op === diff.DELETE ? { delete: value.length } : null
    )
    .filter(Boolean)
}
function useText(ydoc, ytext) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!ytext) return
    const updateText = () =>{ 
      console.log('step 0.2.1: updating text', ytext.toString())
      setText(ytext.toString())}
    ytext.observe(updateText)
    updateText()
    return () => ytext.unobserve(updateText)
  }, [ytext])

  const setYText = (newText) => {
    if (!ydoc || !ytext) return
    const current = ytext.toString()
    if (current === newText) return
    const delta = diffToDelta(diff(current, newText))
    ydoc.transact(() => {
      console.log('step 10: applying delta', delta) 
      ytext.applyDelta(delta, {sanitize: true })
    }, LOCAL)
  }

  return [text, setYText]
}
export default function Yditor({ stompClient }) {
  console.log('step 0: Yditor stompClient', stompClient)
  const { ydoc, ytext } = useYdoc()
  console.log("step 0.0: Yditor ydoc, ytext", ydoc, ytext)
  useYjsStomp(ydoc, stompClient, DOC_ID)
  console.log("step 0.1: Yditor useYjsStomp called")
  const [text, setYText] = useText(ydoc, ytext)
  console.log("step 0.2: Yditor useText called, text", text)

  return (
    <div className="editor-container">
      <textarea
        value={text}
        disabled={!ytext}
        onChange={(e) => setYText(e.target.value)}
      />
    </div>
  )
}