import { ITEMS, getRpg, hasStarted, addItem, fmtMoney } from '../lib/rpg.js'

const SHOP_SECTIONS = [
    { type: 'weapon', label: '⚔️ Senjata', stat: item => `serang +${item.atk}` },
    { type: 'armor', label: '🛡️ Zirah', stat: item => `bertahan +${item.def}` },
    { type: 'potion', label: '🧪 Ramuan', stat: item => `pulih ${item.heal} HP` }
]

export default {
    cmd: ['shop', 'buy', 'toko', 'beli'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const isBuy = cmd === 'buy' || cmd === 'beli'
        if (!isBuy) {
            let out = `🏪 *TOKO PERLENGKAPAN*\nMoney Anda: *${fmtMoney(rpg.money)}* money\n`

            for (const section of SHOP_SECTIONS) {
                const entries = Object.entries(ITEMS).filter(([, item]) => item.type === section.type && item.price > 0)
                if (!entries.length) continue
                out += `\n${section.label}\n`
                for (const [id, item] of entries) {
                    out += `• *${item.name}* (${id})\n   ${section.stat(item)} • ${fmtMoney(item.price)} money\n`
                }
            }

            out += `\n📌 Cara beli: ${prefix}buy <nama item>\n   contoh: ${prefix}buy pedang_karat\n`
            out += `\n🐟 Hasil ${prefix}fish / ${prefix}dungeon (ikan, besi tua, dll) dijual lewat ${prefix}sell, bukan di sini.\n`
            out += `✨ Ingin lebih kuat? Racik perlengkapan langka lewat ${prefix}craft pakai material dungeon!`
            return m.reply(out)
        }
        const itemId = text.trim().toLowerCase().replace(/ /g, '_')
        const item = ITEMS[itemId]
        const isShopItem = item && SHOP_SECTIONS.some(s => s.type === item.type) && item.price > 0
        if (!isShopItem) return m.reply(`Barang tidak ditemukan di toko. Ketik ${prefix}shop untuk melihat daftar barang.`)
        if (rpg.money < item.price) {
            return m.reply(`Money Anda tidak cukup. Butuh ${fmtMoney(item.price)} money, money Anda ${fmtMoney(rpg.money)}.`)
        }
        rpg.money -= item.price
        addItem(rpg, itemId, 1)
        return m.reply(`Berhasil membeli ${item.name}. Sisa money ${fmtMoney(rpg.money)} money.\nPasang dulu dengan ${prefix}equip ${itemId} agar efeknya terpakai (kecuali ramuan, langsung diminum dengan ${prefix}heal ${itemId}).`)
    }
}
