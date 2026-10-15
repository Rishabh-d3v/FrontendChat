import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import './ChatApp.css';
import ChatHeader from './ChatHeader';
import ConnectPage from './ConnectPage';
import PrivateChat from './PrivateChat';
import GroupChat from './GroupChat';
import TabNavigation from './TabNavigation';
import FriendsList from './FriendsList';
import Collab from './Collab';
import findDiff from './FindDiff';

export default function ChatApp() {
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [stompClient, setStompClient] = useState(null);
  const [activeTab, setActiveTab] = useState('private');
  const [roomId, setRoomId] = useState('');
  const [joinedRoom, setJoinedRoom] = useState('');
  // Private chat 
  const [privateRecipient, setPrivateRecipient] = useState('');
  const [privateMessage, setPrivateMessage] = useState('');
  const [privateMessages, setPrivateMessages] = useState([]);
  const [userChat,setUserchat]=useState([]);
  // Group chat 
  const [groupMessage, setGroupMessage] = useState('');
  const [groupMessages, setGroupMessages] = useState([]);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const BASE_URL = `${window.location.protocol}//${window.location.hostname}:8080`

  // Load username on mount
  useEffect(() => {
    const savedUsername = sessionStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
    (async()=>{
      // console.log('Getting friends list:',);
    const token=sessionStorage.getItem('jwt')
    const response=await fetch(`http://localhost:8080/af`,{
      method:'GET',
      headers:{
        'Authorization':`Bearer ${token}`,
      },
    })
    const data=await response.json();
    if (!response.ok) {
      // console.log("Backend error:", data.message);
      alert(data.message);
      return;
    }
     const fixedData = data.map(chats=>({
      ...chats,
      MessageList:[...chats.MessageList].reverse()
     }))
    setUserchat(fixedData);
    fixedData.forEach(d => {
      // console.log("Friend:", d);
    });
    // console.log("friends list----==>")
    })();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [privateMessages, groupMessages]);

  const connect = () => {
    const token = sessionStorage.getItem('jwt');
    const savedUsername = sessionStorage.getItem('username');
    
    if (!token || !savedUsername) {
      alert('Please login first');
      window.location.href = '/';
      return;
    }
    
    if (!username) {
      setUsername(savedUsername);
    }

    const socket = new SockJS(`${window.location.protocol}//${window.location.hostname}:8080/ws`);
    //step 1
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      
      connectHeaders: {
        'Authorization': `Bearer ${token}`,
      },
      
      // debug: (str) => {
      //   console.log('STOMP: ' + str);
      // },
      // step 2
      onConnect: () => {
        // console.log('Connected to WebSocket as:', username);
        setIsConnected(true);
        // step 4
        client.subscribe(`/user/queue/private`,(message) => {
          const received = JSON.parse(message.body);
          // console.log('Received private message:', received);
          setPrivateMessages(prev => [...prev, {
            sendername: received.sendername,
            receivername: received.receivername,
            message: received.message,
            timestamp: new Date(),
            type: 'received'
          }]);
          setUserchat(prevUserchat => 
            prevUserchat.map(chats => {
              if (chats.friends === received.sendername) {
                  return {
                   ...chats,
                    MessageList: [
                      ...chats.MessageList,
                     {
                        message: received.message,
                        sendername: received.sendername,
                        timestamp: new Date().toISOString(),
                        mType: received.mType
                        }
                        ]
                     };
                     } 
                 return chats;
    }));
        });
        // console.log('Subscribed to private messages for user:', username);
      },
      
      onStompError: (frame) => {
        if (!token || !savedUsername) {
      alert('Please login first');
      window.location.href = '/';
      return;
    }
        // console.error('STOMP error:', frame);
        alert('Connection error. Please try again.',frame);
        setIsConnected(false);
      },
      
      onWebSocketClose: () => {
        // console.log('WebSocket connection closed');
        setIsConnected(false);
      }
    });
    // step 3
    client.activate();
    setStompClient(client);
  }

  const disconnect = () => {
    if (stompClient) {
      stompClient.deactivate();
      setStompClient(null);
      setIsConnected(false);
      setJoinedRoom('');
      setPrivateMessages([]);
      setGroupMessages([]);
    }
  };
  const GroupSubRef=useRef(null);
  const joinRoom = () => {
    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }
    setJoinedRoom(roomId);
    setGroupMessages([]);
  }
  const [docs,setDocs]=useState({
    content:"",
    version:0,
  });  
  const ot=useRef({version:0,inflight:null,local:'',sentText:''})
  const [onlineUsers,setOnlineUsers]=useState(null)
  const remoteOps=useRef([])
    useEffect(() => {
      if(!joinedRoom) return;

      if (stompClient && stompClient.connected) {
      GroupSubRef.current=stompClient.subscribe(`/topic/group/${joinedRoom}`, (message) => {
        const received = JSON.parse(message.body);
        if(received.type==='PROJECT' || received.type==='PASS'){
          console.log('checking document data 55', received);
          if(received.username!==username){
            const p=received.payload;
            const splice=(text)=>text.slice(0,p.start)+p.newText+text.slice(p.start+p.delete_count)
            ot.current.version=p.version;
            ot.current.sentText=splice(ot.current.sentText??"");
            ot.current.local=splice(ot.current.local??"");
            remoteOps.current.push({start:p.start,newText:p.newText,delete_count:p.delete_count,sender:received.username})
            return setDocs(prev=>({...prev,
              content:splice(prev.content),
              type:received.type,
              username:received.username,
              roomId:received.roomId,
              version:received.payload.version,
            }))
          }
          else{
            ot.current.version=received.payload.version;
            ot.current.inflight=null;
            flush();
            return setDocs(prev=>({...prev,version:received.payload.version}))
          }
        }
        if(received.type=='CHAT'){
          setGroupMessages(prev => [...prev, {
          username: received.username,
          content: received.payload.content,
          type:received.type,
          timestamp: new Date()
        }]);
      }  
      else{
        console.log('checking if i can receive caret position ', received);
        console.log("onlineUsers == ", received);
        return setOnlineUsers(received);
          // }
      }
      });
      // console.log('Joined room:', roomId);
    }
    return ()=>{
      console.log("leaving room bye bye!")
      leaveRoom()
      console.log("leaving room bye bye 2!")
    };
    }, [joinedRoom, stompClient?.connected]);

  const leaveRoom = () => {
    // console.log('Leaving room:', joinedRoom);
    GroupSubRef.current?.unsubscribe();
    GroupSubRef.current = null;
    if (stompClient && stompClient?.connected) {
      const leaving=({
      username: username,
      roomId:joinedRoom,
      state:'UNSUBSCRIBE'
    })
    try{
      stompClient.publish({
      destination:'/chat/unsubscribe',
      body:JSON.stringify(leaving),
    })
    }
    catch(err){
      alert("error in unsubscribing ",err)
    }
  }
    console.log('leaved room:', joinedRoom);
    setJoinedRoom('');
    setGroupMessages([]);
    setRoomId('');
  };
  
  const sendPrivateMessage =(privateRecipient,privateMessage,ftype="TEXT") => {
    // console.log("====>",privateMessage, privateRecipient)
    if (!privateMessage.trim() ||( !privateRecipient.trim()&& ftype==="TEXT")) {
      alert('Please enter recipient and message');
      return;
    }
    // console.log("fil type set",ftype)
    // console.log("private message ",privateMessage)

    if (stompClient && stompClient.connected) {
      const messageObj = {
        sendername: username,
        receivername: privateRecipient,
        message: privateMessage,
        mType: ftype
      };
      // console.log(messageObj)
      stompClient.publish({
        destination: '/chat/private/message',
        body: JSON.stringify(messageObj),
        headers: {
          'message-type': 'private',
          'priority': 'high',
          'timestamp': new Date().toISOString()
        }
      });

      setPrivateMessages(prev => [...prev, {
        sendername: username,
        receivername: privateRecipient,
        message: privateMessage,
        timestamp: new Date(),
        type: 'sent'
      }]);
        setUserchat(prevUserchat =>  
            prevUserchat.map(chats => {
              if (chats.friends === privateRecipient) {
                  return {
                   ...chats,
                    MessageList: [
                      ...chats.MessageList,
                     {
                        message: privateMessage,
                        sendername: username,
                        timestamp: new Date().toISOString(),
                        mType: ftype
                    }
                        ]
                     };
                     } 
                 return chats;
    })
  );
      // console.log("=============>",privateMessages)
      setPrivateMessage('');
}
  };

  const sendlocal=(currenttext)=>{
      ot.current.local=currenttext;
      setDocs(prev=>({...prev,
            content:currenttext,
            type:'PASS',       
            username:username,
            roomId:joinedRoom,
        }));
      if(ot.current.inflight===null){
        flush();
      }
    }
    const flush=()=>{   
      const diff=findDiff(ot.current.sentText??"",ot.current.local??"");
      if(diff.newText===""&&diff.delete_count===0){
        return;
      }
      sendGroupMessage({
            type:'PASS',
            version:ot.current.version,  
            changed_text1:diff.newText,
            deletecount:diff.delete_count,
            start:diff.start,
        })
      ot.current.inflight=diff;
      ot.current.sentText=ot.current.local;
      }

  const sendGroupMessage = (Data) => {
    if(Data.type=='CHAT'&&!Data.content.trim()){
      alert('Please enter a message');
      return;
    }    
    if (stompClient && stompClient.connected && joinedRoom) {
      let messageObj = {};
      if(Data.type=='PASS'){
        messageObj = {
        username: username,
        type:Data.type,
        roomId:joinedRoom,
        payload:{
          newText:Data.changed_text1,
          start:Data.start,
          delete_count:Data.deletecount,
          version:Data.version,
        },  
      };
    }
    else if(Data.type=='CHAT'){
       messageObj = {
        username: username,
        type:Data.type,
        roomId:joinedRoom,
        payload:{
          content:Data.content,
        },
      };
    }
    console.log("sending group message======> ",messageObj)
      // console.log('Sending group message:', messageObj);
          stompClient.publish({
        destination: `/chat/message/${joinedRoom}`,
        body: JSON.stringify(messageObj),
        headers: {
          'message-type': 'group',
          'room': joinedRoom,
          'timestamp': new Date().toISOString()
        }
      });
      setGroupMessage('');
    }
  };
  const sendCaret=(caretData)=>{
    // console.log("sending caret position via sendCaret ",caretPos)
    stompClient.publish({
      destination: `/chat/caret/${joinedRoom}`,
      body:JSON.stringify(caretData),
      headers: {
          'message-type': 'caretPos',
          'room': joinedRoom,
          'timestamp': new Date().toISOString()
        }
    })
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // console.log("event ",e)
      sendGroupMessage({
            content:e.target.value,
            type:"CHAT",
            username:username,
            roomId:joinedRoom
        })
    }
  };

  // CONNECT PAGE
  if (!isConnected) {
    return (
    <ConnectPage
    username={username}
    connect={connect}
    />
    );
  }
  const renderchat=()=>{
    switch(activeTab){
      case 'private':
        return <PrivateChat
            privateMessages={privateMessages}
            privateMessage={privateMessage}
            setPrivateMessage={setPrivateMessage}
            sendPrivateMessage={sendPrivateMessage}
            handleKeyPress={handleKeyPress}
            messagesEndRef={messagesEndRef}
            setPrivateRecipient={setPrivateRecipient}
            privateRecipient={privateRecipient}
          />
      case 'friendlist':
        return <FriendsList
        userchat={userChat}
        username={username}
        sendMessage={sendPrivateMessage}
        messagesEndRef={messagesEndRef}
        setUserchat={setUserchat}
        />
      case 'group':
        return <GroupChat
          username={username}
          roomId={roomId}
          setRoomId={setRoomId}
          joinRoom={joinRoom}
          joinedRoom={joinedRoom}
          leaveRoom={leaveRoom}
          groupMessages={groupMessages}
          messagesEndRef={messagesEndRef}
          sendGroupMessage={sendGroupMessage}
          groupMessage={groupMessage}
          setGroupMessage={setGroupMessage}
          handleKeyPress={handleKeyPress}
          />
      case 'collab':
        return<Collab
          username={username}
          roomId={roomId}
          setRoomId={setRoomId}
          joinRoom={joinRoom}
          joinedRoom={joinedRoom}
          leaveRoom={leaveRoom}
          groupMessages={groupMessages}
          messagesEndRef={messagesEndRef}
          sendGroupMessage={sendGroupMessage}
          setGroupMessage={setGroupMessage}
          handleKeyPress={handleKeyPress}
          docs={docs}
          setDocs={setDocs}
          setOnlineUsers={setOnlineUsers}
          onlineUsers={onlineUsers}
          sendCaret={sendCaret}
          sendlocal={sendlocal}
          remoteOps={remoteOps}
        />
    }
  }

  // MAIN CHAT PAGE
  return (
    <div className="chat-container">
      {/* HEADER */}
      <ChatHeader
      username={username}
      disconnect={disconnect}
      />

      {/* TAB NAVIGATION */}
      <TabNavigation
      setActiveTab={setActiveTab}
      activeTab={activeTab}
      />

      {/* CHAT AREA */}
      <div className="chat-wrapper">
        {renderchat()}
      </div>
    </div>
  );
}