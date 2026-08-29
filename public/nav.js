// Toggle menu hamburger di header — dipakai bareng di index.html & admin.html.
(function () {
  const btn = document.getElementById('hamburger-btn')
  const nav = document.getElementById('topnav')
  if (!btn || !nav) return

  function closeNav() {
    nav.classList.remove('is-open')
    btn.setAttribute('aria-expanded', 'false')
  }

  function toggleNav() {
    const willOpen = !nav.classList.contains('is-open')
    nav.classList.toggle('is-open', willOpen)
    btn.setAttribute('aria-expanded', String(willOpen))
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleNav()
  })

  // Tutup menu kalau klik link di dalamnya, atau klik di luar area nav.
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav))
  document.addEventListener('click', (e) => {
    if (!nav.classList.contains('is-open')) return
    if (nav.contains(e.target) || btn.contains(e.target)) return
    closeNav()
  })
  window.addEventListener('resize', () => {
    if (window.innerWidth > 640) closeNav()
  })

  // Tandai link yang match halaman sekarang.
  const here = location.pathname.split('/').pop() || 'index.html'
  nav.querySelectorAll('a.topnav-link').forEach((a) => {
    const target = a.getAttribute('href').split('/').pop()
    if (target === here) a.classList.add('is-active')
  })
})()
