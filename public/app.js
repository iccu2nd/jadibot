// app.js — khusus landing page (index.html): hanya statistik ringan
// (total fitur, bot aktif) + link WA tombol upgrade. Alur sambungkan/atur
// bot sekarang ada di bot.js (halaman /bot, wajib login).
const el = (id) => document.getElementById(id)

async function loadStats() {
  try {
    const res = await fetch('/api/stats')
    if (!res.ok) return
    const data = await res.json()
    const statFeatures = el('stat-features')
    const statBots = el('stat-bots')
    const planPrice = el('plan-price')
    const btnUpgrade = el('btn-upgrade')
    if (statFeatures && typeof data.totalFeatures === 'number') statFeatures.textContent = `${data.totalFeatures}+`
    if (statBots && typeof data.totalBots === 'number') statBots.textContent = data.totalBots
    if (btnUpgrade && data.contactNumber) {
      const text = encodeURIComponent('Halo, saya mau upgrade ke paket Premium jadibot.')
      btnUpgrade.href = `https://wa.me/${data.contactNumber}?text=${text}`
    }
    if (planPrice && data.premiumPriceLabel) planPrice.textContent = data.premiumPriceLabel
  } catch {}
}
loadStats()
