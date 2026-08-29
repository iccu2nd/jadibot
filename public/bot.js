const STORE_KEY = 'jadibot_sessions_v1'

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {} } catch { return {} }
}
function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}
function rememberSession(number, accessToken) {
  const store = loadStore()
  store[number] = accessToken
  saveStore(store)
}
function forgetSession(number) {
  const store = loadStore()
  delete store[number]
  saveStore(store)
}

const el = (id) => document.getElementById(id)

const panelConnect = el('panel-connect')
const panelPairing = el('panel-pairing')
const panelSettings = el('panel-settings')
const panelMine = el('panel-mine')

const formConnect = el('form-connect')
const inputNumber = el('input-number')
const btnConnect = el('btn-connect')
const connectError = el('connect-error')

const pairingCodeEl = el('pairing-code')
const btnCopyCode = el('btn-copy-code')
const statusDot = el('status-dot')
const statusText = el('status-text')
const countdownEl = el('countdown')

const settingsNumber = el('settings-number')
const inputOwner = el('input-owner')
const toggleAutoread = el('toggle-autoread')
const toggleAutotyping = el('toggle-autotyping')
const btnSave = el('btn-save')
const btnDisconnect = el('btn-disconnect')
const saveMsg = el('save-msg')
const mineList = el('mine-list')
const settingsEmpty = el('settings-empty')

const modeConnect = el('mode-connect')
const modeSettings = el('mode-settings')
const modeTabConnect = el('mode-tab-connect')
const modeTabSettings = el('mode-tab-settings')

let currentNumber = null
let currentToken = null
let pollTimer = null
let countdownTimer = null
let countdownDeadline = null

// --- Mode switcher: fokus "Sambungkan Nomor" vs "Bot Settings" biar nggak numpuk ---
function setMode(mode) {
  const isConnect = mode === 'connect'
  modeConnect.hidden = !isConnect
  modeSettings.hidden = isConnect
  modeTabConnect.classList.toggle('is-active', isConnect)
  modeTabConnect.setAttribute('aria-selected', String(isConnect))
  modeTabSettings.classList.toggle('is-active', !isConnect)
  modeTabSettings.setAttribute('aria-selected', String(!isConnect))
  if (!isConnect) updateSettingsEmptyState()
}
function updateSettingsEmptyState() {
  settingsEmpty.hidden = !panelSettings.hidden
}
modeTabConnect.addEventListener('click', () => setMode('connect'))
modeTabSettings.addEventListener('click', () => setMode('settings'))

function showOnly(panel) {
  panelConnect.hidden = true
  for (const p of [panelPairing, panelSettings]) p.hidden = (p !== panel)
}

async function apiGet(number, token) {
  const res = await fetch(`/api/session/${number}`, { headers: { 'x-session-token': token } })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal ambil status sesi.')
  return res.json()
}

function startCountdown() {
  clearInterval(countdownTimer)
  countdownDeadline = Date.now() + 3 * 60 * 1000
  countdownTimer = setInterval(() => {
    const remaining = Math.max(0, countdownDeadline - Date.now())
    const mm = Math.floor(remaining / 60000)
    const ss = Math.floor((remaining % 60000) / 1000)
    countdownEl.textContent = `${mm}:${String(ss).padStart(2, '0')}`
    if (remaining <= 0) clearInterval(countdownTimer)
  }, 500)
}

function applySession(session) {
  if (session.status === 'connecting' || session.status === 'reconnecting') {
    showOnly(panelPairing)
    setMode('connect')
    statusDot.className = 'status-dot'
    statusText.textContent = session.status === 'reconnecting'
      ? 'Terputus sebentar, mencoba menyambung ulang…'
      : 'Menunggu ditautkan…'
    if (session.pairingCode) {
      if (pairingCodeEl.textContent.replace(/\s/g, '') !== session.pairingCode) startCountdown()
      pairingCodeEl.textContent = session.pairingCode
    } else {
      pairingCodeEl.textContent = 'Meminta kode…'
    }
    return
  }

  if (session.status === 'connected') {
    clearInterval(countdownTimer)
    showOnly(panelSettings)
    setMode('settings')
    settingsNumber.textContent = currentNumber
    inputOwner.value = session.settings?.ownerNumber || ''
    toggleAutoread.checked = !!session.settings?.autoread
    toggleAutotyping.checked = !!session.settings?.autotyping
    return
  }

  // stopped / disconnected / expired / error → balik ke form connect
  clearInterval(pollTimer)
  clearInterval(countdownTimer)
  forgetSession(currentNumber)
  panelConnect.hidden = false
  panelPairing.hidden = true
  panelSettings.hidden = true
  currentNumber = null
  currentToken = null
  setMode('connect')
  renderMine()
}

function poll() {
  clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    if (!currentNumber || !currentToken) return
    try {
      const session = await apiGet(currentNumber, currentToken)
      applySession(session)
    } catch (e) {
      clearInterval(pollTimer)
      forgetSession(currentNumber)
      panelConnect.hidden = false
      panelPairing.hidden = true
      panelSettings.hidden = true
      currentNumber = null
      currentToken = null
      setMode('connect')
      renderMine()
    }
  }, 2500)
}

async function openSession(number, token) {
  currentNumber = number
  currentToken = token
  connectError.hidden = true
  try {
    const session = await apiGet(number, token)
    applySession(session)
    poll()
  } catch (e) {
    connectError.textContent = e.message
    connectError.hidden = false
    forgetSession(number)
    renderMine()
  }
}

formConnect.addEventListener('submit', async (ev) => {
  ev.preventDefault()
  connectError.hidden = true
  btnConnect.disabled = true
  btnConnect.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Menyambungkan…'
  try {
    const res = await fetch('/api/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: inputNumber.value })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal menyambungkan.')
    rememberSession(data.number, data.accessToken)
    inputNumber.value = ''
    await openSession(data.number, data.accessToken)
    renderMine()
  } catch (e) {
    connectError.textContent = e.message
    connectError.hidden = false
  } finally {
    btnConnect.disabled = false
    btnConnect.innerHTML = 'Sambungkan'
  }
})

btnCopyCode.addEventListener('click', async () => {
  const code = pairingCodeEl.textContent.trim()
  if (!code || code.includes('…')) return
  try {
    await navigator.clipboard.writeText(code)
    btnCopyCode.innerHTML = '<i class="fa-solid fa-check"></i> Tersalin'
    setTimeout(() => { btnCopyCode.innerHTML = '<i class="fa-regular fa-copy"></i> Salin kode' }, 1500)
  } catch {}
})

btnSave.addEventListener('click', async () => {
  if (!currentNumber || !currentToken) return
  btnSave.disabled = true
  saveMsg.hidden = true
  try {
    const res = await fetch(`/api/session/${currentNumber}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-session-token': currentToken },
      body: JSON.stringify({
        ownerNumber: inputOwner.value.trim() || null,
        autoread: toggleAutoread.checked,
        autotyping: toggleAutotyping.checked
      })
    })
    if (!res.ok) throw new Error((await res.json()).error || 'Gagal menyimpan.')
    saveMsg.textContent = 'Pengaturan tersimpan.'
    saveMsg.hidden = false
    setTimeout(() => { saveMsg.hidden = true }, 2500)
  } catch (e) {
    saveMsg.textContent = e.message
    saveMsg.hidden = false
  } finally {
    btnSave.disabled = false
  }
})

btnDisconnect.addEventListener('click', async () => {
  if (!currentNumber || !currentToken) return
  if (!confirm(`Putuskan bot untuk nomor ${currentNumber}? Sesi akan dihapus permanen.`)) return
  try {
    await fetch(`/api/session/${currentNumber}/stop`, {
      method: 'POST',
      headers: { 'x-session-token': currentToken }
    })
  } catch {}
  forgetSession(currentNumber)
  clearInterval(pollTimer)
  panelConnect.hidden = false
  panelSettings.hidden = true
  currentNumber = null
  currentToken = null
  updateSettingsEmptyState()
  renderMine()
})

async function renderMine() {
  const store = loadStore()
  const numbers = Object.keys(store)
  panelMine.hidden = numbers.length === 0
  mineList.innerHTML = ''

  for (const number of numbers) {
    const li = document.createElement('li')
    const label = document.createElement('span')
    label.textContent = number

    const right = document.createElement('span')
    let statusClass = 'gone'
    let statusLabel = 'memuat…'

    try {
      const session = await apiGet(number, store[number])
      statusClass = ['connected'].includes(session.status) ? 'connected'
        : ['connecting', 'reconnecting'].includes(session.status) ? 'connecting' : 'gone'
      statusLabel = session.status
    } catch {
      statusClass = 'gone'
      statusLabel = 'tidak aktif'
    }

    const badge = document.createElement('span')
    badge.className = `mine-status ${statusClass}`
    badge.textContent = statusLabel
    right.appendChild(badge)

    const openBtn = document.createElement('button')
    openBtn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> buka'
    openBtn.addEventListener('click', () => openSession(number, store[number]))
    right.appendChild(openBtn)

    const forgetBtn = document.createElement('button')
    forgetBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> lupakan'
    forgetBtn.addEventListener('click', () => { forgetSession(number); renderMine() })
    right.appendChild(forgetBtn)

    li.appendChild(label)
    li.appendChild(right)
    mineList.appendChild(li)
  }

  updateSettingsEmptyState()
}

renderMine()
// Kalau udah ada nomor yang connected tersimpan, langsung buka tab Bot Settings.
;(function initMode() {
  const store = loadStore()
  const numbers = Object.keys(store)
  setMode(numbers.length ? 'settings' : 'connect')
})()

// --- Tab switching: panel pengaturan bot (Umum / Otomatisasi / Keamanan / Plugin) ---
const tabButtons = document.querySelectorAll('.tab-btn')
const tabPanels = document.querySelectorAll('.tab-panel')
tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false') })
    tabPanels.forEach((p) => { p.hidden = true; p.classList.remove('is-active') })
    btn.classList.add('is-active')
    btn.setAttribute('aria-selected', 'true')
    const target = document.getElementById(btn.dataset.tab)
    if (target) { target.hidden = false; target.classList.add('is-active') }
  })
})
