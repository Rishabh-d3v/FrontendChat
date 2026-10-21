
import { MessageCircle, User } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import './ConnectPage.css'

export default function ConnectPage({username,connect}){
    return(<>
    <div className="login-screen">
        <ThemeToggle className="theme-toggle-floating" />
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon-wrapper">
              <MessageCircle />
            </div>
            <h1 className="login-title">Welcome to Chat</h1>
            <p className="login-subtitle">Enter your username to get started</p>
          </div>
          
          <div className="login-form">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                value={username}
                // onChange={(e) => setUsername(e.target.value)}
                readOnly={true}
                onKeyDown={(e) => e.key === 'Enter' && connect()}
                placeholder="Enter your username"
                className="form-input"
              />
            </div>
            
            <button onClick={connect} className="btn-connect">
              <User />
              Connect to Chat
            </button>
          </div>
        </div>
      </div>
    </>)
}