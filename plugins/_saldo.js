import { ITEMS, getRpg, hasStarted, isSellable, sellPrice, fmtMoney } from '../lib/rpg.js'

export default {
    cmd: ['saldo', 'dompet', 'money', 'balance'],
    category: 'rpg',
    description: 'Cek money lengkap beserta nilai barang di tas',
    run: async (m, { prefix }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const bank = global.db.data.users[m.sender]?.bank || 0

        const sellables = Object.entries(rpg.inventory || {}).filter(([id, qty]) => qty > 0 && isSellable(ITEMS[id]))
        const inventoryValue = sellables.reduce((sum, [id, qty]) => sum + sellPrice(ITEMS[id]) * qty, 0)

        let out = `*MONEY ANDA*\n\n`
        out += `- *Di tangan:* ${fmtMoney(rpg.money)}\n`
        out += `- *Di bank:* ${fmtMoney(bank)}\n`
        out += `- *Barang di tas:* ${sellables.length} jenis, estimasi ${fmtMoney(inventoryValue)} money\n`
        out += `- *Total kekayaan:* ${fmtMoney(rpg.money + bank + inventoryValue)} money\n`

        if (sellables.length) {
            out += `\n*Rincian barang:*\n`
            out += sellables
                .slice(0, 8)
                .map(([id, qty]) => `• ${ITEMS[id].name} x${qty} → ${fmtMoney(sellPrice(ITEMS[id]) * qty)} money`)
                .join('\n')
            if (sellables.length > 8) out += `\n...dan ${sellables.length - 8} jenis lainnya`
            out += `\n\nJual semua sekaligus lewat ${prefix}sell all`
        } else {
            out += `\nTas Anda masih kosong dari barang jualan. Coba ${prefix}fish atau ${prefix}dungeon buat mengumpulkan barang!`
        }

        return m.reply(out)
    }
}
