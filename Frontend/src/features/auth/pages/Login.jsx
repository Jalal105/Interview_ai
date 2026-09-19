import { React, useState } from 'react'
import "../auth.form.scss"
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'

const Login = () => {
  const { loading, handleLogin } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    await handleLogin({ email, password })
    navigate("/")
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
            <h1>Sign In</h1>
            <p>Welcome back. Enter your credentials to access your account.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>

            {/* Email */}
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter email address"
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
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Forgot */}
            <div className="forgot-link">
              <a href="#">Forgot password?</a>
            </div>

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              Login
            </button>
          </form>

          <div className="auth-switch">
            Don't have an account? <Link to="/register">Register</Link>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Login