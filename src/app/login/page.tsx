'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-0)',
    }}>
      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--line)',
        borderRadius: 20, padding: '48px 40px', width: 360,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'radial-gradient(circle at 35% 30%, #FFE169, #FFCB2E 50%, #C8960C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, boxShadow: '0 4px 20px rgba(255,203,46,0.4)',
          }}>
            ⚡
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-space)', fontSize: 22, fontWeight: 700, color: 'var(--ink-0)' }}>
              TCG Vault
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              Il tuo spazio per collezione Pokémon & Magic
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: 1, background: 'var(--line)' }} />

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={signInWithGoogle}
            style={{
              width: '100%', padding: '12px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: '#fff', border: '1px solid #ddd', borderRadius: 12,
              fontSize: 14, fontWeight: 600, color: '#1a1a1a',
              cursor: 'pointer', transition: 'box-shadow 140ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <GoogleIcon />
            Accedi con Google
          </button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
          Accedendo accetti i termini di utilizzo.
          <br />La tua collezione è privata e accessibile solo a te.
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
