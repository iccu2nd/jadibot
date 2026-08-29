const inputKey = document.getElementById('input-key')
const btnLoad = document.getElementById('btn-load')
const errorEl = document.getElementById('admin-error')
const summaryEl = document.getElementById('summary')
const tableWrap = document.getElementById('table-wrap')

const STORAGE_KEY = 'jadibot-admin-key'

function showError(msg) {
  errorEl.textContent = msg
  errorEl.hidden = !msg
}

function statusPillClass(status) {
  if (status === 'connected') return 'pill-connected'
  if (status === 'reconnecting') return 'pill-reconnecting'
  return 'pill-other'
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('id-ID')
}

function render(sessions) {
  if (!sessions.length) {
    tableWrap.innerHTML = '<div class="empty-state">Belum ada bot yang tersambung.</div>'
    summaryEl.hidden = true
    return
  }

  const connected = sessions.filter(s => s.status === 'connected').length
  summaryEl.hidden = false
  summaryEl.textContent = `${sessions.length} sesi total — ${connected} sedang terhubung.`

  const rows = sessions.map(s => `
    <tr>
      <td>${s.number}</td>
      <td><span class="pill ${statusPillClass(s.status)}">${s.status}</span></td>
      <td>${fmtDate(s.connectedAt)}</td>
      <td>${s.settings?.ownerNumber || '—'}</td>
      <td><button class="stop-btn" data-number="${s.number}"><i class="fa-solid fa-plug-circle-xmark"></i> Putuskan</button></td>
    </tr>
  `).join('')

  tableWrap.innerHTML = `
    <table class="bot-table">
      <thead>
        <tr><th>Nomor</th><th>Status</th><th>Terhubung sejak</th><th>Owner tambahan</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `

  tableWrap.querySelectorAll('.stop-btn').forEach(btn => {
    btn.addEventListener('click', () => stopSession(btn.dataset.number))
  })
}

async function loadSessions() {
  const key = inputKey.value.trim()
  if (!key) return showError('Masukkan admin key dulu.')
  showError('')
  btnLoad.disabled = true
  btnLoad.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Memuat…'
  try {
    const res = await fetch('/api/admin/sessions', { headers: { 'x-admin-key': key } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Gagal memuat daftar sesi.')
    sessionStorage.setItem(STORAGE_KEY, key)
    render(data)
  } catch (e) {
    showError(e.message)
  } finally {
    btnLoad.disabled = false
    btnLoad.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Muat daftar'
  }
}

async function stopSession(number) {
  const key = inputKey.value.trim()
  if (!key) return
  if (!confirm(`Putuskan bot ${number}?`)) return
  try {
    const res = await fetch(`/api/admin/session/${number}/stop`, {
      method: 'POST',
      headers: { 'x-admin-key': key }
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || 'Gagal memutuskan sesi.')
    }
    loadSessions()
  } catch (e) {
    showError(e.message)
  }
}

btnLoad.addEventListener('click', loadSessions)
inputKey.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadSessions() })

const savedKey = sessionStorage.getItem(STORAGE_KEY)
if (savedKey) {
  inputKey.value = savedKey
  loadSessions()
}
