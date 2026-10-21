import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import './Login.css'
// import {jwtDecode} from "jwt-decode"

const BASE_URL = `${window.location.protocol}//${window.location.hostname}:8080`

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required")
      return
    }

    try {
      const endpoint = isRegistering ? '/register' : '/login'
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const token = await response.text()
        
        // Clear any old token
        sessionStorage.clear()
        
        // Save new token
        sessionStorage.setItem('jwt', token)  // Changed 'token' to 'jwt'

        // Extract username from JWT
        console.log("Received token:", token)
        const tokenPayload = JSON.parse(atob(token.split('.')[1]))
        // const token2=jwtDecode(token)
        // console.log(token2)
        console.log(tokenPayload);
        const extractedUsername = tokenPayload.username || tokenPayload.sub

       // SAVE USERNAME TO LOCALSTORAGE
       sessionStorage.setItem('username', extractedUsername)

       console.log("Logged in as:", extractedUsername)

       // Navigate to chat
       navigate('/chat', { state: { username: extractedUsername } })
      } else {
        const errorText = await response.text()
        setError(errorText || `${isRegistering ? 'Registration' : 'Login'} failed`)
      }
    } catch (err) {
      console.error(err)
      setError("Connection error. Please try again.")
    }
  }

  return (
    <div className="auth-screen">
      <ThemeToggle className="theme-toggle-floating" />
      <div className="auth-card">
        <h2 className="auth-title">
          {isRegistering ? 'Register' : 'Login'}
        </h2>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="auth-username" className="auth-label">
              Username
            </label>
            <input
              id="auth-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
              placeholder="Enter username"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password" className="auth-label">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
          >
            {isRegistering ? 'Register' : 'Login'}
          </button>
        </form>

        <div className="auth-switch">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering)
              setError("")
            }}
            className="auth-switch-btn"
          >
            {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </div>
      </div>
    </div>
  )
}
