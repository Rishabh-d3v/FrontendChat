import { MessageCircle, Send, Users } from "lucide-react";
import "./ChatPanel.css";
import "./GroupChat.css";

export default function GroupChat({roomId,username,
    setRoomId,joinRoom,joinedRoom,leaveRoom,groupMessages,
    messagesEndRef,sendGroupMessage,setGroupMessage,groupMessage,handleKeyPress
}){


const handleSendMessage=()=>{
  // console.log("Sending group message10:", groupMessage);
  sendGroupMessage({
    content:groupMessage,
    type:"CHAT",
    username:username,
    roomId:joinedRoom
  })
}
    return(<>
    <div className="chat-box">
            <div className="chat-input-header">
              {!joinedRoom ? (
                <div className="room-join-wrapper">
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                    placeholder="Enter room ID to join/create the group"
                    className="recipient-input"
                  />
                  <button onClick={joinRoom} className="btn-join">
                    Join Room
                  </button>
                </div>
                 ) : (
                <div className="room-info">
                  <div className="room-details">
                    <div className="room-icon">
                      <Users />
                    </div>
                    <div className="room-info-text">
                      <h3 className="room-name">Room: {joinedRoom}</h3>
                      <p className="room-type">Group Chat</p>
                    </div>
                  </div>
                  <button onClick={leaveRoom} className="btn-leave">
                    Leave Room
                  </button>
                </div>
              )}
            </div>

            <div className="messages-container">
              {!joinedRoom ? (
                <div className="empty-state">
                  <Users />
                  <p>Join a room to start chatting</p>
                </div>
              ) : groupMessages.length === 0 ? (
                <div className="empty-state">
                  <MessageCircle />
                  <p>No messages yet. Be the first to send one!</p>
                </div>
              ) : (
                groupMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message-row ${msg.username === username ? 'sent' : 'received'}`}
                  >
                    <div className={`message-bubble ${msg.username === username ? 'sent' : 'received'}`}>
                      {msg.username !== username && (
                        <div className="message-sender">{msg.username}</div>
                      )}
                      <p className="message-content">{msg.content}</p>
                      <div className="message-time">
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {joinedRoom && (
              <div className="message-input-container">
                <div className="message-input-wrapper">
                  <input
                    type="text"
                    value={groupMessage}
                    onChange={(e) => setGroupMessage(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e)}
                    placeholder="Type a message..."
                    className="message-input"
                  />
                  <button onClick={handleSendMessage} className="btn-send">
                    <Send />
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
    </>)
}