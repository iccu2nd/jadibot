import { ITEMS, getRpg, hasStarted, removeItem, sellPrice, isSellable, fmtMoney } from '../lib/rpg.js'

const BULK_TYPES = ['fish', 'junk', 'material']

export default {
    cmd: ['sell'],
    category: 'rpg',
    run: async (m, { text, prefix }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const args = text.trim().toLowerCase().split(/ +/).filter(Boolean)

        if (!args.length) {
            const entries = Object.entries(rpg.inventory || {}).filter(([id]) => isSellable(ITEMS[id]))
            if (!entries.length) {
                return m.reply(`Tidak ada barang di tas yang bisa dijual. Kumpulkan bahan lewat ${prefix}dungeon atau ${prefix}fish dulu.`)
            }
            let out = `*JUAL BARANG*\nGunakan ${prefix}sell <nama barang> untuk menjual, atau ${prefix}sell all untuk menjual semua ikan/sampah/material sekaligus.\n\n`
            out += entries.map(([id, qty]) => `• ${ITEMS[id].name} x${qty} - ${fmtMoney(sellPrice(ITEMS[id]))} money/pcs`).join('\n')
            return m.reply(out)
        }

        if (args[0] === 'all') {
            let total = 0
            const sold = []
            for (const [id, qty] of Object.entries(rpg.inventory || {})) {
                const item = ITEMS[id]
                if (!item || !BULK_TYPES.includes(item.type) || !isSellable(item)) continue
                const price = sellPrice(item) * qty
                total += price
                sold.push(`• ${item.name} x${qty} = ${fmtMoney(price)} money`)
                delete rpg.inventory[id]
            }
            if (!sold.length) {
                return m.reply(`Tidak ada ikan, sampah, atau material yang bisa dijual sekarang. Coba ${prefix}fish atau ${prefix}dungeon dulu.`)
            }
            rpg.money += total
            return m.reply(`*BARANG TERJUAL*\n\n${sold.join('\n')}\n\n- *Total didapat:* ${fmtMoney(total)} money\n- *Money sekarang:* ${fmtMoney(rpg.money)} money`)
        }

        let qty = null
        let nameParts = args
        const lastArg = args[args.length - 1]
        if (/^\d+$/.test(lastArg) && args.length > 1) {
            qty = parseInt(lastArg, 10)
            nameParts = args.slice(0, -1)
        }
        const itemId = nameParts.join('_')
        const item = ITEMS[itemId]
        if (!item) return m.reply(`Barang tidak ditemukan. Ketik ${prefix}sell untuk lihat daftar barang yang bisa dijual.`)
        if (!isSellable(item)) return m.reply(`${item.name} tidak bisa dijual.`)
        const owned = rpg.inventory[itemId] || 0
        if (owned <= 0) return m.reply(`Anda tidak punya ${item.name}.`)
        if (rpg.equippedWeapon === itemId || rpg.equippedArmor === itemId) {
            return m.reply(`${item.name} sedang dipasang. Lepas dulu dengan memasang barang lain lewat ${prefix}equip sebelum menjualnya.`)
        }
        qty = Math.min(qty ?? owned, owned)
        const price = sellPrice(item) * qty
        removeItem(rpg, itemId, qty)
        rpg.money += price
        return m.reply(`*BERHASIL MENJUAL*\n${item.name} x${qty} terjual seharga ${fmtMoney(price)} money.\nMoney sekarang: ${fmtMoney(rpg.money)} money.`)
    }
}
