const el = (id) => document.getElementById(id)

function nextUrl() {
  const params = new URLSearchParams(location.search)
  return params.get('next') || '/dashboard'
}

function showError(msg) {
  const box = el('auth-error')
  box.textContent = msg
  box.hidden = false
}
function hideError() {
  el('auth-error').hidden = true
}

// ---------------- Tab switching: Masuk / Daftar ----------------
const tabs = document.querySelectorAll('.auth-tab')
const formLogin = el('form-login')
const formRegister = el('form-register')
const title = el('auth-title')
const subtitle = el('auth-subtitle')
const switchHint = el('auth-switch-hint')

function setMode(mode) {
  hideError()
  tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.mode === mode))
  if (mode === 'register') {
    formLogin.hidden = true
    formRegister.hidden = false
    title.textContent = 'Buat akun baru'
    subtitle.textContent = 'Gratis, langsung bisa sambungkan bot kamu.'
    switchHint.innerHTML = 'Sudah punya akun? <a href="#" id="auth-switch-link">Masuk di sini</a>'
  } else {
    formLogin.hidden = false
    formRegister.hidden = true
    title.textContent = 'Masuk ke akun kamu'
    subtitle.textContent = 'Kelola bot WhatsApp kamu dari dashboard.'
    switchHint.innerHTML = 'Belum punya akun? <a href="#" id="auth-switch-link">Daftar di sini</a>'
  }
  bindSwitchLink(mode)
}

function bindSwitchLink(currentMode) {
  const link = el('auth-switch-link')
  if (!link) return
  link.addEventListener('click', (e) => {
    e.preventDefault()
    setMode(currentMode === 'register' ? 'login' : 'register')
  })
}

tabs.forEach((btn) => btn.addEventListener('click', () => setMode(btn.dataset.mode)))
bindSwitchLink('login')

// ---------------- Login (email/password) ----------------
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError()
  const btn = el('login-submit')
  btn.disabled = true
  btn.textContent = 'Memproses…'
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: el('login-email').value,
        password: el('login-password').value
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal masuk.')
    window.location.href = nextUrl()
  } catch (err) {
    showError(err.message)
  } finally {
    btn.disabled = false
    btn.textContent = 'Masuk'
  }
})

// ---------------- Daftar (email/password) ----------------
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError()
  const btn = el('register-submit')
  btn.disabled = true
  btn.textContent = 'Memproses…'
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: el('register-name').value,
        email: el('register-email').value,
        password: el('register-password').value
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal mendaftar.')
    window.location.href = nextUrl()
  } catch (err) {
    showError(err.message)
  } finally {
    btn.disabled = false
    btn.textContent = 'Buat akun'
  }
})

// ---------------- Google Identity Services ----------------
async function handleGoogleCredential(response) {
  hideError()
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal masuk dengan Google.')
    window.location.href = nextUrl()
  } catch (err) {
    showError(err.message)
  }
}

async function initGoogle() {
  try {
    const res = await fetch('/api/auth/me')
    const data = await res.json()
    if (data.user) {
      window.location.href = '/dashboard'
      return
    }
    if (!data.googleClientId || typeof google === 'undefined') {
      el('google-note').hidden = false
      return
    }
    google.accounts.id.initialize({
      client_id: data.googleClientId,
      callback: handleGoogleCredential
    })
    google.accounts.id.renderButton(el('google-signin-btn'), {
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'filled_black' : 'outline',
      size: 'large',
      width: 340,
      shape: 'pill'
    })
  } catch (e) {
    el('google-note').hidden = false
  }
}
window.addEventListener('load', () => setTimeout(initGoogle, 150))
