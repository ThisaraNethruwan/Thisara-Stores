import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import toast from 'react-hot-toast'

export default function AdminLogin() {
  const { user, isAdmin, loading: authLoading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [busy, setBusy]         = useState(false)

  useEffect(() => {
    if (!authLoading && user && isAdmin) navigate('/admin/dashboard', { replace: true })
  }, [authLoading, user, isAdmin, navigate])

  const handleLogin = async () => {
    if (!email.trim() || !password) { toast.error('Enter email and password'); return }
    setBusy(true)
    const { user: u, error } = await signIn(email.trim(), password)
    setBusy(false)
    if (error) { toast.error('Invalid email or password'); return }
    if (!u) return
    setTimeout(() => {
      if (!isAdmin) toast.error('Access denied. Admin accounts only.')
    }, 500)
  }

  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f2d1c' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: 12 }}>🌿</div>
        <div style={{ color: '#52b788', fontSize: 14, fontFamily: 'Nunito,sans-serif' }}>Loading...</div>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        footer { display: none !important; }
        .adm-login { min-height:100vh; background:linear-gradient(135deg,#0f2d1c,#1a3d28); display:flex; align-items:center; justify-content:center; padding:24px; }
        .adm-login-card { background:#fff; border-radius:24px; width:100%; max-width:400px; overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,.4); animation:popIn .3s ease; }
        .adm-login-top { background:linear-gradient(135deg,#0f2d1c,#1e6641); padding:30px 18px 6px; text-align:center; }
        .adm-login-body { padding:23px 20px 12px; }
        .alf { margin-bottom:16px; }
        .alf label { display:block; font-size:13px; font-weight:700; color:#444; margin-bottom:6px; }
        .alf-wrap { position:relative; }
        .alf input { width:100%; padding:13px 16px; border:2px solid #e8ede9; border-radius:10px; font-size:15px; outline:none; background:#fff; font-family:'Nunito',sans-serif; transition:border-color .2s; box-sizing:border-box; }
        .alf input:focus { border-color:#52b788; }
        .alf-eye { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:16px; }
        .adm-login-btn { width:100%; background:#1e6641; color:#fff; padding:14px; border-radius:12px; font-weight:800; font-size:16px; border:none; cursor:pointer; font-family:'Nunito',sans-serif; transition:all .2s; }
        .adm-login-btn:hover:not(:disabled) { background:#2d8653; transform:translateY(-1px); }
        .adm-login-btn:disabled { background:#ccc; cursor:not-allowed; }
        @keyframes popIn { from{opacity:0;transform:scale(.93)} to{opacity:1;transform:scale(1)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>
      <main className="adm-login">
        <div className="adm-login-card">
          <div className="adm-login-top">
            
            {/* Flex container to hold Logo and Header in a single line */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
              <img 
                src="/logo-round.png" 
                alt="Thisara Stores" 
                style={{ width: 62, height: 62, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,.3)' }} 
              />
              <div style={{ fontFamily: 'Fraunces,serif', fontSize: 28, fontWeight: 900, color: '#fff' }}>
                Thisara Stores
              </div>
            </div>

            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>Admin Only</div>
          </div>
          <div className="adm-login-body">
            <div className="alf">
              <label>Email Address</label>
              <div className="alf-wrap">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" autoComplete="email" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>
            </div>
            <div className="alf" style={{ marginBottom: 20 }}>
              <label>Password</label>
              <div className="alf-wrap">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ paddingRight: 46 }} />
                <button className="alf-eye" onClick={() => setShowPw(v => !v)} type="button">{showPw ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <button className="adm-login-btn" onClick={handleLogin} disabled={busy}>
              {busy ? '⏳ Signing in...' : '🔐 Sign In to Dashboard'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 20, lineHeight: 1.6 }}>
              Admin access only.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
