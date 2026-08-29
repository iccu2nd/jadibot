import { ITEMS, getRpg, hasStarted, addItem, hasItems, removeItem, fmtMoney, fmtMs, cooldownLeft, CRAFT_COOLDOWN } from '../lib/rpg.js'

const RECIPES = Object.entries(ITEMS).filter(([, item]) => item.craft)

function formatMats(mats) {
    return Object.entries(mats).map(([id, qty]) => `${ITEMS[id].name} x${qty}`).join(', ')
}

export default {
    cmd: ['craft', 'racik'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const pick = text.trim().toLowerCase().replace(/ /g, '_')
        if (!pick) {
            let out = `*RACIK PERLENGKAPAN LEGENDARIS*\nTukar material hasil ${prefix}dungeon jadi perlengkapan tertinggi yang tidak dijual di toko.\n\n`
            for (const [id, item] of RECIPES) {
                const own = rpg.inventory[id] ? ' (sudah Anda miliki)' : ''
                out += `• ${item.name} (${id})${own}\n  Bahan: ${fmtMoney(item.craft.money)} money + ${formatMats(item.craft.mats)}\n`
            }
            out += `\nRacik dengan ${prefix + cmd} <nama item>, contoh: ${prefix + cmd} pedang_legenda`
            return m.reply(out)
        }
        const item = ITEMS[pick]
        if (!item || !item.craft) {
            return m.reply(`Resep tidak ditemukan. Ketik ${prefix + cmd} tanpa tambahan teks untuk melihat daftar resep.`)
        }
        const left = cooldownLeft(rpg.lastCraft, CRAFT_COOLDOWN)
        if (left > 0) return m.reply(`Alat racik masih dipakai. Tunggu ${fmtMs(left)} lagi.`)
        if (rpg.money < item.craft.money) {
            return m.reply(`Money Anda tidak cukup. Butuh ${fmtMoney(item.craft.money)} money, money Anda ${fmtMoney(rpg.money)}.`)
        }
        if (!hasItems(rpg, item.craft.mats)) {
            return m.reply(`Material Anda belum cukup. Butuh ${formatMats(item.craft.mats)}. Cari materialnya lewat ${prefix}dungeon.`)
        }
        rpg.lastCraft = Date.now()
        rpg.money -= item.craft.money
        for (const [matId, qty] of Object.entries(item.craft.mats)) removeItem(rpg, matId, qty)
        addItem(rpg, pick, 1)
        return m.reply(
            `*RACIKAN BERHASIL*\n${item.name} selesai dibuat dan masuk ke tas Anda.\n\n` +
            `Pasang sekarang dengan ${prefix}equip ${pick}, lalu tingkatkan lagi lewat ${prefix}enchant.`
        )
    }
}
