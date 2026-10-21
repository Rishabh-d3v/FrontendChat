import React, { useRef } from "react"
import { MessageCircle, Send } from "lucide-react"
import "./ChatPanel.css"

export default function PrivateChat({privateMessages,setPrivateMessage,
    privateMessage,sendPrivateMessage,setPrivateRecipient,privateRecipient,
    handleKeyPress,messagesEndRef
}){
    return(<>
    <div className="chat-box">
            <div className="chat-input-header">
              <input
                type="text"
                value={privateRecipient}
                onChange={(e) => setPrivateRecipient(e.target.value)}
                placeholder="Enter recipient username"
                className="recipient-input"
              />
            </div>

            <div className="messages-container">
              {privateMessages.length === 0 ? (
                <div className="empty-state">
                  <MessageCircle />
                  <p>No messages yet. Start a conversation!</p>
                </div>
              ) : (
                privateMessages.map((msg, index) => (
                  <div key={index} className={`message-row ${msg.type}`}>
                    <div className={`message-bubble ${msg.type}`}>
                      <div className="message-header">
                        {msg.type === 'sent' ? `To: ${msg.receivername}` : `From: ${msg.sendername}`}
                      </div>
                      <p className="message-content">{msg.message}</p>
                      <div className="message-time">
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-container">
              <div className="message-input-wrapper">
                <input
                  type="text"
                  value={privateMessage}
                  onChange={(e) => setPrivateMessage(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e,()=> sendPrivateMessage(privateRecipient,privateMessage))}
                  placeholder="Type a message..."
                  className="message-input"
                />
                <button onClick={()=>sendPrivateMessage(privateRecipient,privateMessage)} className="btn-send">
                  <Send />
                  Send
                </button>
              </div>
            </div>
          </div>
    </>)
}