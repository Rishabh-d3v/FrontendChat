import React from "react"
import { LogOut, User } from "lucide-react"
import ThemeToggle from "./ThemeToggle"
import "./ChatHeader.css"

export default function ChatHeader({username,disconnect}) {

    return(<>
        <div className="chat-header">
        <div className="header-content">
          <div className="user-info">
            <div className="user-avatar">
              <User />
            </div>
            <div className="user-details">
              <h2 className="user-name">{username}</h2>
              <p className="user-status">● Online</p>
            </div>
          </div>
          
          <div className="header-actions">
          <ThemeToggle />
          <button onClick={disconnect} className="btn-disconnect">
            <LogOut />
            Disconnect
          </button>
          </div>
        </div>
      </div>
        </>)
}