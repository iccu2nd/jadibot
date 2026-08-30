// Drawer menu penuh (hamburger) + backdrop + toggle tema terang/gelap.
// Dipakai bareng di index.html & admin.html.
(function () {
  const btn = document.getElementById('hamburger-btn')
  const nav = document.getElementById('topnav')
  const backdrop = document.getElementById('nav-backdrop')
  const closeBtn = document.getElementById('nav-close')
  if (!btn || !nav) return

  function closeNav() {
    nav.classList.remove('is-open')
    if (backdrop) backdrop.classList.remove('is-open')
    btn.setAttribute('aria-expanded', 'false')
    document.body.style.overflow = ''
  }

  function openNav() {
    nav.classList.add('is-open')
    if (backdrop) backdrop.classList.add('is-open')
    btn.setAttribute('aria-expanded', 'true')
    document.body.style.overflow = 'hidden'
  }

  function toggleNav() {
    if (nav.classList.contains('is-open')) closeNav()
    else openNav()
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleNav()
  })
  if (closeBtn) closeBtn.addEventListener('click', closeNav)
  if (backdrop) backdrop.addEventListener('click', closeNav)

  // Tutup menu kalau klik link di dalamnya.
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav))

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav()
  })
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeNav()
  })

  // Tandai link yang match halaman sekarang.
  const here = location.pathname.replace(/\/+$/, '') || '/'
  nav.querySelectorAll('a.topnav-link, a.topbar-admin').forEach((a) => {
    const target = a.getAttribute('href').replace(/\/+$/, '')
    if (target && target === here) a.classList.add('is-active')
  })
})()

// ---------------- Toggle tema terang / gelap ----------------
;(function () {
  const THEME_KEY = 'jadibot_theme'
  const root = document.documentElement
  const topbarToggle = document.getElementById('theme-toggle')
  const navChip = document.getElementById('nav-theme-chip')
  const navLabel = document.getElementById('nav-theme-label')

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  }

  function applyLabel() {
    if (navLabel) navLabel.textContent = currentTheme() === 'dark' ? 'Terang' : 'Gelap'
    if (navChip) {
      const icon = navChip.querySelector('i')
      if (icon) icon.className = currentTheme() === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'
    }
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme)
    try { localStorage.setItem(THEME_KEY, theme) } catch (e) {}
    applyLabel()
  }

  function toggleTheme() {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark')
  }

  if (topbarToggle) topbarToggle.addEventListener('click', toggleTheme)
  if (navChip) navChip.addEventListener('click', toggleTheme)
  applyLabel()
})()

// ---------------- Status login: kartu akun di drawer + tombol get started/masuk/keluar ----------------
;(function () {
  const navUser = document.getElementById('nav-user')
  const avatarEl = document.getElementById('nav-user-avatar')
  const nameEl = document.getElementById('nav-user-name')
  const emailEl = document.getElementById('nav-user-email')
  const getStartedBtn = document.getElementById('nav-get-started')
  const accountBtn = document.getElementById('nav-account-btn')
  const logoutBtn = document.getElementById('nav-logout-btn')
  const navGroupUtama = document.getElementById('nav-group-utama')

  function bindLogout(btn) {
    btn.addEventListener('click', async (e) => {
      if (btn.tagName === 'A') e.preventDefault()
      try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
      window.location.href = '/'
    })
  }

  async function applyAuthState() {
    let user = null
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      user = data.user
    } catch {}

    if (user && navUser) {
      navUser.hidden = false
      if (nameEl) nameEl.textContent = user.name || 'Pengguna'
      if (emailEl) emailEl.textContent = user.email || ''
      if (avatarEl) {
        avatarEl.innerHTML = user.avatar
          ? `<img src="${user.avatar}" alt="">`
          : (user.name || '?').trim().charAt(0).toUpperCase()
      }
    }

    // Sudah login → link "Utama" (Beranda/Fitur Bot/Cara Pakai/Tanya Jawab) tidak
    // relevan lagi di drawer, disembunyikan agar menu fokus ke Dashboard/Bot/Admin.
    if (navGroupUtama) navGroupUtama.hidden = !!user

    // Landing page: swap "Mulai Sekarang" + "Masuk" jadi "Dashboard" + "Keluar" kalau udah login.
    if (getStartedBtn && accountBtn) {
      if (user) {
        getStartedBtn.href = '/dashboard'
        getStartedBtn.innerHTML = '<i class="fa-solid fa-gauge"></i> Dashboard'
        accountBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Keluar'
        accountBtn.removeAttribute('href')
        accountBtn.style.cursor = 'pointer'
        bindLogout(accountBtn)
      } else {
        getStartedBtn.href = '/login'
        getStartedBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Mulai Sekarang'
        accountBtn.href = '/login'
        accountBtn.innerHTML = '<i class="fa-solid fa-user"></i> Masuk'
      }
    }

    // Halaman dashboard/bot: tombol Keluar berdiri sendiri.
    if (logoutBtn) bindLogout(logoutBtn)
  }

  applyAuthState()
})()

// ---------------- Modal "Semua Fitur" (dari hamburger) ----------------
;(function () {
  const trigger = document.getElementById('nav-all-features')
  if (!trigger) return

  const CATEGORY_LABEL = {
    info: 'Info', tools: 'Tools', group: 'Group Management', owner: 'Owner',
    ai: 'AI', fun: 'Entertainment', downloader: 'Downloader', sticker: 'Sticker',
    game: 'Game', rpg: 'RPG', economy: 'Economy', premium: 'Premium'
  }
  const labelFor = (c) => CATEGORY_LABEL[c] || (c.charAt(0).toUpperCase() + c.slice(1))

  let modal, listEl, countEl, closeNav
  let loaded = false

  function buildModal() {
    modal = document.createElement('div')
    modal.className = 'features-modal'
    modal.hidden = true
    modal.innerHTML = `
      <div class="features-modal-backdrop" id="features-modal-backdrop"></div>
      <div class="features-modal-card" role="dialog" aria-modal="true" aria-label="Semua fitur bot">
        <div class="features-modal-head">
          <div><h3>Semua Fitur Bot</h3><p id="features-modal-count">Memuat daftar fitur…</p></div>
          <button class="nav-close" type="button" id="features-modal-close" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="features-modal-body" id="features-modal-list"></div>
      </div>`
    document.body.appendChild(modal)
    listEl = modal.querySelector('#features-modal-list')
    countEl = modal.querySelector('#features-modal-count')
    modal.querySelector('#features-modal-backdrop').addEventListener('click', closeModal)
    modal.querySelector('#features-modal-close').addEventListener('click', closeModal)
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal() })
  }

  function openModal() {
    if (!modal) buildModal()
    modal.hidden = false
    document.body.style.overflow = 'hidden'
    if (!loaded) loadFeatures()
  }

  function closeModal() {
    if (!modal) return
    modal.hidden = true
    document.body.style.overflow = ''
  }

  async function loadFeatures() {
    try {
      const res = await fetch('/api/features')
      const data = await res.json()
      loaded = true
      const categories = data.categories || {}
      const cats = Object.keys(categories).sort()
      if (!cats.length) {
        countEl.textContent = 'Daftar fitur belum tersedia.'
        return
      }
      countEl.textContent = `${data.total || 0} command aktif di ${cats.length} kategori.`
      listEl.innerHTML = cats.map((cat) => `
        <div class="features-cat">
          <div class="features-cat-title">${labelFor(cat)}<span>${categories[cat].length}</span></div>
          <div class="features-cmds">${categories[cat].map((c) => `<code>.${c}</code>`).join('')}</div>
        </div>`).join('')
    } catch (e) {
      countEl.textContent = 'Gagal memuat daftar fitur. Coba lagi nanti.'
    }
  }

  trigger.addEventListener('click', () => {
    // Drawer hamburger mungkin masih terbuka — tutup dulu biar nggak dobel di atas modal.
    const drawer = document.getElementById('topnav')
    const backdrop = document.getElementById('nav-backdrop')
    const btn = document.getElementById('hamburger-btn')
    if (drawer) drawer.classList.remove('is-open')
    if (backdrop) backdrop.classList.remove('is-open')
    if (btn) btn.setAttribute('aria-expanded', 'false')
    openModal()
  })
})()
