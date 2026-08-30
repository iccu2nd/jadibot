// app.js — khusus landing page (index.html): statistik realtime (total
// fitur, bot aktif) + link WA tombol upgrade. Alur sambungkan/atur bot ada
// di bot.js (halaman /bot, publik — nggak butuh daftar/login).
const el = (id) => document.getElementById(id)
const STATS_INTERVAL_MS = 15000

async function loadStats() {
  try {
    const res = await fetch('/api/stats')
    if (!res.ok) return
    const data = await res.json()
    const statFeatures = el('stat-features')
    const statBots = el('stat-bots')
    const stageSession = el('stage-session')
    const planPrice = el('plan-price')
    const btnUpgrade = el('btn-upgrade')
    if (statFeatures && typeof data.totalFeatures === 'number') statFeatures.textContent = `${data.totalFeatures}+`
    if (statBots && typeof data.totalBots === 'number') statBots.textContent = data.totalBots
    if (stageSession && typeof data.totalBots === 'number') stageSession.textContent = data.totalBots
    if (btnUpgrade && data.contactNumber) {
      const text = encodeURIComponent('Halo, saya mau upgrade ke paket Premium jadibot.')
      btnUpgrade.href = `https://wa.me/${data.contactNumber}?text=${text}`
    }
    if (planPrice && data.premiumPriceLabel) planPrice.textContent = data.premiumPriceLabel
  } catch {}
}
loadStats()
// Statistik disegarkan berkala biar angka di landing page selalu mencerminkan
// kondisi server saat ini, bukan cuma nilai sesaat waktu halaman dibuka.
setInterval(loadStats, STATS_INTERVAL_MS)
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadStats() })
