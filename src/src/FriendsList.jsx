import React, { useEffect, useRef, useState } from "react";
import "./FriendsList.css";
import MessageImage from "./MessageImage";
import { ArrowLeft, Paperclip, Send } from "lucide-react";
export default function FriendsList({
  userchat,
  username,
  sendMessage,
  setUserchat,
}) 
{
  const messagesEndRef = useRef(null);
  const [messageText, setMessageText] = useState("");
  const [selectedFriendName, setSelectedFriendName] = useState(null);
  const baseurl=`http://localhost:8080/`
  const selectedFriend = userchat.find(
    (user) => user.friends === selectedFriendName
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    if (selectedFriend?.MessageList?.length) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [selectedFriend?.MessageList?.length]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedFriend) return;

        sendMessage(selectedFriendName,messageText);
    setMessageText("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const messagesContainerRef = useRef(null);
const [hasMore, setHasMore] = useState(true);
const [loading, setLoading] = useState(false);
const [files,setFiles]=useState(null);
// const [cursor, setCursor] = useState(null);

const handleScroll = () => {
  const container = messagesContainerRef.current;
  if (container.scrollTop === 0 && hasMore && !loading) {
    fetchMoreMessages();
  }
};
  const token=sessionStorage.getItem('jwt')

const fetchMoreMessages = async () => {
  if(hasMore===false) return;
  setLoading(true);
  let cursor = null;
  if(selectedFriend.MessageList[0].messageId!==cursor){
       cursor =selectedFriend.MessageList[0].messageId;
        console.log("Cursor updated to:", cursor);
  }
  else{
    // console.log(selectedFriend.MessageList[0].messageId,"is same as cursor, not fetching more");
    return;
  }
  // // console.log("Fetching more messages with cursor:", cursor, "for chatId:", selectedFriend.chatId);
  const response=await fetch(`${baseurl}af?chatId=${selectedFriend.chatId}&selectedF=${selectedFriend.friends}&cursor=${cursor}&ps=10`,{
      method:'GET',
      headers:{
        'Authorization':`Bearer ${token}`,
      },
    })
  const data = await response.json();
  // console.log("Fetched messages:", data[0].hasNext ,data[0].message);
  if (data[0].hasNext===false) {  
    setHasMore(false);
    //  return;
  }
  
  const oldMessages=[...data].reverse();

  const container = messagesContainerRef.current;
  const prevScrollHeight = container.scrollHeight;

  setUserchat(prev => prev.map(chat =>
    chat.friends === selectedFriend.friends
      ? { ...chat, MessageList: [...oldMessages, ...chat.MessageList] }
      : chat
  ));

  // restore scroll position so it doesn't jump to top
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight - prevScrollHeight;
  });

  setLoading(false);
};
const selectedFriendMessages=(e)=>{
  setSelectedFriendName(e.friends);
  setHasMore(true);
}
const postFiles=async(e)=>{
  const formdata=new FormData();
  console.log("e.target.files[] ",e.target.files[0])
  formdata.append("file",e.target.files[0])
  console.log("files uploading")
  const response=await fetch(`${baseurl}upload`,{
    method: 'POST',
    headers: {
      'Authorization' :`Bearer ${token}`
    },
    body:formdata,
  });
  const data= await response.json();
  let type=null;
  if(data.fileType.startsWith("image/")){
    type="IMAGE";
  }
  if(data.fileType.startsWith("application/")){
    type="FILE";
  }
  sendMessage(selectedFriendName,data.fileName,type);

  console.log(data.fileName);
  console.log(data.fileType);
}
  return (
    <div className="friends-container">
      {/* LEFT SIDE - FRIEND LIST */}
      <div className={`friends-sidebar ${selectedFriend ? "mobile-hidden" : ""}`}>
        <div className="sidebar-header">Chats-List</div>
        {userchat.length === 0 ? (
          <div className="empty-state">
            <p>No conversations</p>
          </div>
        ) : (
          userchat.map((user, index) => (
            <div
              key={user.username || index}
              onClick={() => selectedFriendMessages(user)}
              className={`friend-item ${
                selectedFriendName === user.friends ? "active" : ""
              }`}
            >
              <div className="friend-name">{user.friends}</div>

              <div className="friend-last-message">
                {user.MessageList && user.MessageList.length > 0
                  ? user.MessageList[user.MessageList.length - 1].message
                  : "No messages yet"}
              </div>
            </div>
          ))
        )}
      </div>

      {/* RIGHT SIDE - CHAT AREA */}
      {selectedFriend && (
        <div className="chat-area">
          {/* Chat Header with back button */}
          <div className="chat-header" onClick={() => setSelectedFriendName(null)}>
            <span className="back-arrow"><ArrowLeft /></span>
            {selectedFriendName}
          </div>

          {/* Messages */}
          <div className="messages-container"
             ref={messagesContainerRef}
             onScroll={handleScroll}
            >
            {loading && <div className="loading-top">Loading...</div>}
            {selectedFriend.MessageList && selectedFriend.MessageList.length > 0 ? (
              <>
                {selectedFriend.MessageList.map((m, index) => {
                  const isSentByMe = m.sendername === username;
                  if(m.mType==='TEXT'){
                    return (
                    <div
                      key={index}
                      className={`message-row ${isSentByMe ? "sent" : "received"}`}
                    >
                      <div
                        className={`message-bubble ${
                          isSentByMe ? "sent" : "received"
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                  }
                  else{
                    return (
                    <div
                      key={index}
                      className={`message-row ${isSentByMe ? "sent" : "received"}`}
                    >
                      <div
                        className={`message-bubble ${
                          isSentByMe ? "sent" : "received"
                        }`}
                      >
                      <MessageImage 
                        filename={m.message}
                        token={token}
                        baseurl={baseurl}
                        type={m.mType}
                      />
                      </div>
                    </div>
                  );
                  }
                  
                })}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div className="empty-state">
                <p>No messages yet</p>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="message-input-wrapper">
            <div className="input-inner">
              <input
                type="text"
                className="message-input"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <input
                type="file"
                id="file-input"
                style={{ display: "none" }}
                onChange={postFiles}
              />
              <label htmlFor="file-input" className="attachment-button">
                <Paperclip />
              </label>
              <button
                onClick={handleSendMessage}
                className={`send-button ${
                  messageText.trim() || files ? "enabled" : "disabled"
                }`}
                disabled={!messageText.trim() && !files}
              >
                <Send />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}