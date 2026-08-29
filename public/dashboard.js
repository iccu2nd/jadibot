const el = (id) => document.getElementById(id)
const STORE_KEY = 'jadibot_sessions_v1'

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {} } catch { return {} }
}

async function apiGet(number, token) {
  const res = await fetch(`/api/session/${number}`, { headers: { 'x-session-token': token } })
  if (!res.ok) throw new Error('gagal')
  return res.json()
}

// --- Statistik ringan, sama seperti landing page ---
async function loadStats() {
  try {
    const res = await fetch('/api/stats')
    if (!res.ok) return
    const data = await res.json()
    const statFeatures = el('stat-features')
    const statBots = el('stat-bots')
    if (statFeatures && typeof data.totalFeatures === 'number') statFeatures.textContent = `${data.totalFeatures}+`
    if (statBots && typeof data.totalBots === 'number') statBots.textContent = data.totalBots
  } catch {}
}
loadStats()

// --- Daftar nomor yang tersimpan di browser ini (read-only, kelola penuh di /bot) ---
async function renderMine() {
  const panelMine = el('panel-mine')
  const mineList = el('mine-list')
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
    openBtn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> kelola'
    openBtn.addEventListener('click', () => { window.location.href = '/bot' })
    right.appendChild(openBtn)

    li.appendChild(label)
    li.appendChild(right)
    mineList.appendChild(li)
  }
}
renderMine()
