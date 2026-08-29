import { ITEMS, getRpg, hasStarted, removeItem, cooldownLeft, fmtMs, REST_COOLDOWN } from '../lib/rpg.js'

export default {
    cmd: ['heal', 'istirahat'],
    category: 'rpg',
    run: async (m, { text, prefix }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const itemId = text.trim().toLowerCase().replace(/ /g, '_')
        if (rpg.hp >= rpg.maxHp) {
            return m.reply(`HP Anda sudah penuh, tidak perlu istirahat.`)
        }
        if (itemId) {
            const item = ITEMS[itemId]
            if (!item || item.type !== 'potion') {
                return m.reply(`Item itu bukan ramuan atau tidak ditemukan. Cek ${prefix}inventory untuk melihat barang Anda.`)
            }
            if (!rpg.inventory[itemId]) {
                return m.reply(`Anda belum punya ${item.name}. Beli di ${prefix}shop.`)
            }
            removeItem(rpg, itemId, 1)
            const before = rpg.hp
            rpg.hp = Math.min(rpg.maxHp, rpg.hp + item.heal)
            return m.reply(`Anda minum ${item.name}, HP pulih dari ${before} jadi ${rpg.hp}/${rpg.maxHp}.`)
        }
        const left = cooldownLeft(rpg.lastHeal, REST_COOLDOWN)
        if (left > 0) {
            return m.reply(`Anda masih dalam masa istirahat. Tunggu ${fmtMs(left)} lagi, atau minum ramuan dengan ${prefix}heal <nama ramuan>.`)
        }
        rpg.lastHeal = Date.now()
        const before = rpg.hp
        const healAmount = Math.floor(rpg.maxHp * 0.3)
        rpg.hp = Math.min(rpg.maxHp, rpg.hp + healAmount)
        return m.reply(`Anda istirahat sebentar, HP pulih dari ${before} jadi ${rpg.hp}/${rpg.maxHp}.\nIngin pulih penuh instan? Beli ramuan di ${prefix}shop.`)
    }
}
