const el = (id) => document.getElementById(id)
const REMEMBER_KEY = 'botzora_remember_email'

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

const formLogin = el('form-login')
const formRegister = el('form-register')
const title = el('auth-title')
const subtitle = el('auth-subtitle')
const switchHint = el('auth-switch-hint')
const topSwitch = el('auth-top-switch')

function setMode(mode) {
  hideError()
  if (mode === 'register') {
    formLogin.hidden = true
    formRegister.hidden = false
    title.textContent = 'Buat akun baru'
    subtitle.textContent = 'Gratis, langsung bisa sambungkan bot Anda.'
    switchHint.innerHTML = 'Sudah punya akun? <a href="#" id="auth-switch-link">Masuk di sini</a>'
    topSwitch.textContent = 'Masuk'
  } else {
    formLogin.hidden = false
    formRegister.hidden = true
    title.textContent = 'Masuk ke Botzora'
    subtitle.textContent = 'Kelola bot WhatsApp Anda dari satu dashboard.'
    switchHint.innerHTML = 'Belum punya akun? <a href="#" id="auth-switch-link">Daftar di sini</a>'
    topSwitch.textContent = 'Daftar'
  }
  bindSwitchLink(mode)
}

function bindSwitchLink(currentMode) {
  const link = el('auth-switch-link')
  if (link) link.addEventListener('click', (e) => { e.preventDefault(); setMode(currentMode === 'register' ? 'login' : 'register') })
}

topSwitch.addEventListener('click', () => setMode(formLogin.hidden ? 'login' : 'register'))
bindSwitchLink('login')

document.querySelectorAll('.auth-eye').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = el(btn.dataset.target)
    const icon = btn.querySelector('i')
    const show = input.type === 'password'
    input.type = show ? 'text' : 'password'
    icon.className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'
    btn.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password')
  })
})

try {
  const savedEmail = localStorage.getItem(REMEMBER_KEY)
  if (savedEmail) el('login-email').value = savedEmail
} catch {}

function persistRememberedEmail(email) {
  try {
    if (el('remember-email').checked) localStorage.setItem(REMEMBER_KEY, email)
    else localStorage.removeItem(REMEMBER_KEY)
  } catch {}
}

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError()
  const btn = el('login-submit')
  btn.disabled = true
  btn.textContent = 'Memproses…'
  const email = el('login-email').value
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: el('login-password').value })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal masuk.')
    persistRememberedEmail(email)
    window.location.href = nextUrl()
  } catch (err) {
    showError(err.message)
  } finally {
    btn.disabled = false
    btn.textContent = 'Masuk'
  }
})

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
    google.accounts.id.initialize({ client_id: data.googleClientId, callback: handleGoogleCredential })
    google.accounts.id.renderButton(el('google-signin-btn'), {
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'filled_black' : 'outline',
      size: 'large',
      width: 424,
      shape: 'rectangular'
    })
  } catch (e) {
    el('google-note').hidden = false
  }
}
window.addEventListener('load', () => setTimeout(initGoogle, 150))
