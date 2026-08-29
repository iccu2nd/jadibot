import { ITEMS, getRpg, hasStarted } from '../lib/rpg.js'

export default {
    cmd: ['equip', 'pasang'],
    category: 'rpg',
    run: async (m, { text, prefix }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const itemId = text.trim().toLowerCase().replace(/ /g, '_')
        if (!itemId) return m.reply(`Item apa yang ingin dipasang? Contoh: ${prefix}equip pedang_karat`)
        const item = ITEMS[itemId]
        if (!item || (item.type !== 'weapon' && item.type !== 'armor')) {
            return m.reply(`Item itu tidak bisa dipasang. Cek ${prefix}inventory untuk melihat barang Anda.`)
        }
        if (!rpg.inventory[itemId]) {
            return m.reply(`Anda belum punya ${item.name}. Beli di ${prefix}shop atau racik lewat ${prefix}craft.`)
        }
        const refine = rpg.refine?.[itemId] || 0
        if (item.type === 'weapon') {
            rpg.equippedWeapon = itemId
            return m.reply(`*${item.name}* berhasil dipasang.\nSerang total Anda sekarang ${rpg.atk + item.atk + refine * 3}.\n\nAsah senjata ini agar semakin kuat lewat ${prefix}enchant.`)
        }
        rpg.equippedArmor = itemId
        return m.reply(`*${item.name}* berhasil dipasang.\nBertahan total Anda sekarang ${rpg.def + item.def + refine * 2}.\n\nAsah zirah ini agar semakin kuat lewat ${prefix}enchant.`)
    }
}
