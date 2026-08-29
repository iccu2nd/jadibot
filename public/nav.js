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
  const here = location.pathname.replace(/\/+$/, '') || '/dashboard'
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
