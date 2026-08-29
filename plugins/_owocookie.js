import { getOwo, fmtCowoncy, fmtMs, COOKIE_PRICE, COOKIE_BUFF_MS, COOKIE_BUFF_MULT, COOKIE_MAX_STACK_MS, isCookieBuffActive } from '../lib/owo.js'

export default {
    cmd: ['owocookie', 'owokue'],
    category: 'owo',
    run: async (m, { text, prefix, cmd }) => {
        const owo = getOwo(m.sender)
        const sub = text.trim().toLowerCase()

        if (sub === 'buy' || sub === 'beli') {
            if (owo.cowoncy < COOKIE_PRICE) return m.reply(`💸 Saldo Anda tidak cukup. Butuh ${fmtCowoncy(COOKIE_PRICE)}.`)
            owo.cowoncy -= COOKIE_PRICE
            owo.cookies += 1
            return m.reply(`✅ Berhasil beli 1x 🍪 Cookie seharga ${fmtCowoncy(COOKIE_PRICE)}.\nStok cookie: ${owo.cookies}x\n\nMakan pakai ${prefix}${cmd} eat`)
        }

        if (sub === 'eat' || sub === 'makan') {
            if (owo.cookies < 1) return m.reply(`⚠️ Anda tidak punya cookie. Beli dulu: ${prefix}${cmd} buy`)

            owo.cookies -= 1
            const now = Date.now()
            const base = Math.max(now, owo.cookieBuffUntil || 0)
            const capped = Math.min(base + COOKIE_BUFF_MS, now + COOKIE_MAX_STACK_MS)
            owo.cookieBuffUntil = capped

            return m.reply(`🍪 Nom nom, enak! Buff *+${Math.round(COOKIE_BUFF_MULT * 100)}% cowoncy* dari daily & boss aktif selama ${fmtMs(owo.cookieBuffUntil - now)} lagi.`)
        }

        let out = `🍪 *OWO COOKIE*\n\n`
        out += isCookieBuffActive(owo)
            ? `Status: 🟢 Aktif, sisa ${fmtMs(owo.cookieBuffUntil - Date.now())}\n\n`
            : `Status: ⚪ Tidak aktif\n\n`
        out += `Efek: +${Math.round(COOKIE_BUFF_MULT * 100)}% cowoncy dari daily & menang boss selama ${fmtMs(COOKIE_BUFF_MS)}.\n`
        out += `Harga: ${fmtCowoncy(COOKIE_PRICE)} | Stok Anda: ${owo.cookies}x\n\n`
        out += `Beli  : ${prefix}${cmd} buy\nMakan : ${prefix}${cmd} eat`

        return m.reply(out)
    }
}
