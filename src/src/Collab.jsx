import { useEffect, useLayoutEffect, useRef, useState } from "react"
import './Collab.css'
import findDiff from "./FindDiff"

// A small curated palette (not neon/rainbow) — each user gets a stable
// color derived from their username so it never jumps around between renders.
const USER_COLORS = ["#c9a227", "#4c7fd6", "#d66b6b", "#6bb88a", "#a979d6", "#4bc0c0"]
function getUserColor(name) {
    if (!name) return USER_COLORS[0]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i)
        hash |= 0
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function Collab({roomId,username,
    setRoomId,joinRoom,joinedRoom,leaveRoom,
    messagesEndRef,sendGroupMessage,handleKeyPress,docs,setDocs,setOnlineUsers,onlineUsers,sendCaret,sendlocal,remoteOps
}){
    const [project,setProject]=useState("");
    const [name,setName]=useState(null);

    const textarearef=useRef(null)
    const caretPos1=useRef(0)
    const caretPos2=useRef(0)
    const [remotecaret, setremoteCaret]=useState({x:0,y:0})
    const markerRef=useRef({})
    const containerRef=useRef(null)

    useLayoutEffect(()=>{
        const newCaret={}
        Object.entries(markerRef.current).forEach(([name,mref])=>{
        const rect=mref?.getBoundingClientRect()
        const contRect=containerRef.current?.closest('.editor-container')?.getBoundingClientRect()
        newCaret[name]=({
            x:rect&&contRect ? rect.left-contRect.left:0,
            y:rect&&contRect ? rect.top-contRect.top:0
        })
    })
    setremoteCaret(newCaret)    
    console.log("onlineUsers == ", onlineUsers)
    },[onlineUsers])
    useLayoutEffect(() => {
        console.log("remoteOps.current starting == ",remoteOps.current)
        const ops = remoteOps.current.splice(0); 
        for (const op of ops) {
        caretPos1.current = shiftCaret(caretPos1.current, op);
        caretPos2.current = shiftCaret(caretPos2.current, op);
     }
        console.log("caretPos1.current == ",caretPos1.current)
        console.log("caretPos2.current == ",caretPos2.current)
        textarearef.current?.setSelectionRange(caretPos1.current, caretPos2.current);
    }, [docs?.content]);
    const shiftCaret = (currentPos, remoteOp) => {
        if (currentPos <= remoteOp.start) {
            console.log("currentPos <= remoteOp.start == ",currentPos,remoteOp.start)
            return currentPos;
        }                                        
        if (currentPos >= remoteOp.start + remoteOp.delete_count) {
            console.log("currentPos >= remoteOp.start + remoteOp.delete_count == ",currentPos,remoteOp.start,remoteOp.delete_count)
            return currentPos + remoteOp.newText.length - remoteOp.delete_count;
        }
        console.log("returning remoteOp.start + remoteOp.newText.length == ",remoteOp.start,remoteOp.newText.length)    
        return remoteOp.start + remoteOp.newText.length;                                
    };
    const handleProject = (e) => {
    caretPos1.current = e.target.selectionStart;
    caretPos2.current = e.target.selectionEnd;
    sendlocal(e.target.value);
};
    const handleCaret=(e)=>{
    caretPos1.current = e.target.selectionStart;
    caretPos2.current = e.target.selectionEnd;
        sendCaret({
            PosStart:caretPos1.current,
            PosEnd:caretPos2.current
        })
    }
    const saveFile=async()=>{
        const token=sessionStorage.getItem("jwt")
        const promise=await fetch(`http://localhost:8080/updateDocs`,{
            method:'PUT',
            headers:{
                'Authorization':`Bearer ${token}`,
                'Content-Type':'application/json'
            },
            body:JSON.stringify(docs),
        })
        const message=await promise.json()
    }

    return (<div className="collab-wrapper">
        {!joinedRoom?(
            <div className="entry-screen">
                <p className="entry-prompt">name a document to create or join it</p>
                <div className="input-buttons">
                    <input type="text" placeholder="document name"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}/>
                    <button onClick={joinRoom}>create</button>
                    <button onClick={joinRoom}>join</button>
                </div>
            </div>
        ):(
                <div className="collab-header">
                    <div className="tracking-container"> 
                        { onlineUsers!=null ?(Object.entries(onlineUsers)?.map(([key,users])=>(
                            <div className="online-users" key={key}
                            style={{'--user-color':getUserColor(users.username)}}>{users.username}</div>
                        ))
                    ):(
                    <div className="online-users">no users</div>
                    )}</div> 
                    <div className="save-container">
                        <span className="save-status" title="live"></span>
                        <button className="save-button"onClick={saveFile}>
                            save</button>
                            </div>
                            </div>
                        )}
                        <div>
                            {joinedRoom&&(
                                <div  className="editor-container" ref={containerRef}>
                                    <textarea className="editor"
                                    name="textarea" value={docs?.content ??""} id="1" ref={textarearef} onChange={(e)=>{handleProject(e)}}
                                    onSelect={(e)=>{handleCaret(e)}}>
    
                                    </textarea>
                                    {Object.entries(onlineUsers??[]).map(([onlineuser,users])=>{
                                        const userColor=getUserColor(users?.username??onlineuser)
                                        return  <div key={onlineuser}>
                                <div className="selection-area">
                                    {(docs?.content??"").slice(0,users?.caret?.PosStart??0)}
                                    <span className="selection-rect" ref={el=>{markerRef.current[onlineuser]=el}}
                                    style={{'--user-color-soft':hexToRgba(userColor,0.28)}}>
                                        {(docs?.content??"").slice(users?.caret?.PosStart??0,users?.caret?.PosEnd??0)}
                                        </span>{(docs?.content??"").slice(users?.caret?.PosEnd??0)}
                                        </div>
                                        {onlineuser!==username&&remotecaret[onlineuser]?.x!==0&&remotecaret[onlineuser]?.y!==0&&(
                                            <div className="caret1" data-user={users?.username??onlineuser}
                                            style={{left:`${remotecaret[onlineuser]?.x}px`,top:`${remotecaret[onlineuser]?.y}px`,
                                            '--user-color':userColor
                                        }}></div>
                                    )}
                                    </div>
                                    })
                                    }
                                    </div>)}
                                    </div>
                                    </div>)
                                    }



                            