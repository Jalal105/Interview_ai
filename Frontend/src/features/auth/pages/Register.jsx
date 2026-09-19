import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import "../auth.form.scss"

const Register = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const { loading, handleRegister } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const success = await handleRegister({ username, email, password })
    if (success) navigate("/")
  }

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-wrapper">
          <div className="auth-card" style={{ textAlign: 'center', color: 'rgba(240,244,255,0.6)' }}>
            Loading...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-wrapper">

        {/* Brand */}
        <div className="auth-brand">
          <Link to="/" className="brand-logo">
            <span className="brand-icon">✦</span>
            <span className="brand-name">Aura</span>
          </Link>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Join Aura to experience the future.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>

            {/* Full Name */}
            <div className="input-group">
              <label htmlFor="username">Full Name</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="John Doe"
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span
                  className="input-icon"
                  style={{ left: 'auto', right: '0.9rem', cursor: 'pointer' }}
                  onClick={() => setShowPass(!showPass)}
                  title={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? '🙈' : '👁'}
                </span>
              </div>
            </div>

            <button
              className="auth-submit-btn"
              type="submit"
              disabled={loading}
            >
              Sign Up
            </button>
          </form>

          <div className="auth-switch">
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Register