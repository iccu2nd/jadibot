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

// GSI diberi tag <script async defer>, jadi kapan tepatnya `google` siap di
// window itu nggak pasti — kadang belum siap saat halaman load (koneksi
// lambat), kadang udah (dari cache). Sebelumnya dicoba sekali pakai
// setTimeout tetap 150ms: kalau GSI belum siap di momen itu tombolnya nggak
// pernah dicoba render ulang, makanya kadang ilang dan baru muncul pas
// refresh (giliran gsi ke-cache/lebih cepat). Sekarang di-poll sampai siap
// (atau sampai batas waktu habis) supaya tombolnya konsisten muncul setiap
// kali halaman dibuka, bukan tergantung kecepatan koneksi saat itu.
function waitForGoogleScript(timeoutMs = 8000, intervalMs = 150) {
  return new Promise((resolve) => {
    const start = Date.now()
    ;(function poll() {
      if (typeof google !== 'undefined' && google.accounts?.id) return resolve(true)
      if (Date.now() - start >= timeoutMs) return resolve(false)
      setTimeout(poll, intervalMs)
    })()
  })
}

async function initGoogle() {
  let data
  try {
    const res = await fetch('/api/auth/me')
    data = await res.json()
  } catch (e) {
    el('google-note').hidden = false
    return
  }

  if (data.user) {
    window.location.href = '/dashboard'
    return
  }
  if (!data.googleClientId) {
    el('google-note').hidden = false
    return
  }

  const ready = await waitForGoogleScript()
  if (!ready) {
    // GSI beneran gagal load (mis. offline / diblokir) — tampilkan catatan
    // tapi tetap coba render sekali lagi kalau ternyata siap belakangan.
    el('google-note').hidden = false
    const late = await waitForGoogleScript(15000, 500)
    if (!late) return
    el('google-note').hidden = true
  }

  try {
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
window.addEventListener('DOMContentLoaded', initGoogle)
