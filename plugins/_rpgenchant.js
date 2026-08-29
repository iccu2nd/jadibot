import { ITEMS, getRpg, hasStarted, hasItems, removeItem, fmtMoney, fmtMs, cooldownLeft, ENCHANT_COOLDOWN } from '../lib/rpg.js'

const MAX_REFINE = 10

function matNeeded(level) {
    if (level < 3) return { besi_tua: 2 }
    if (level < 7) return { kristal_sihir: 1 }
    return { inti_iblis: 1 }
}
function moneyNeeded(level) { return (level + 1) * 150 }

export default {
    cmd: ['enchant', 'asah'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const slotArg = text.trim().toLowerCase()
        let itemId
        if (slotArg === 'senjata' || slotArg === 'weapon' || !slotArg) itemId = rpg.equippedWeapon
        if (slotArg === 'zirah' || slotArg === 'armor') itemId = rpg.equippedArmor
        if (!itemId && slotArg && ITEMS[slotArg.replace(/ /g, '_')]) itemId = slotArg.replace(/ /g, '_')

        if (!slotArg) {
            const wLevel = rpg.refine?.[rpg.equippedWeapon] || 0
            const aLevel = rpg.refine?.[rpg.equippedArmor] || 0
            let out = `*ASAH PERLENGKAPAN*\nTingkatkan senjata/zirah yang sedang dipasang, maksimal +${MAX_REFINE}.\n\n`
            out += `Senjata terpasang : ${rpg.equippedWeapon ? `${ITEMS[rpg.equippedWeapon].name} +${wLevel}` : 'Tidak ada'}\n`
            out += `Zirah terpasang : ${rpg.equippedArmor ? `${ITEMS[rpg.equippedArmor].name} +${aLevel}` : 'Tidak ada'}\n\n`
            out += `Ketik ${prefix + cmd} senjata atau ${prefix + cmd} zirah untuk mengasah item yang sedang dipasang.`
            return m.reply(out)
        }
        if (!itemId) {
            return m.reply(`Pasang dulu senjata/zirah yang ingin diasah lewat ${prefix}equip, lalu ketik ${prefix + cmd} senjata atau ${prefix + cmd} zirah.`)
        }
        const item = ITEMS[itemId]
        if (!item || (item.type !== 'weapon' && item.type !== 'armor')) {
            return m.reply(`Item itu tidak bisa diasah.`)
        }
        rpg.refine ??= {}
        const level = rpg.refine[itemId] || 0
        if (level >= MAX_REFINE) {
            return m.reply(`${item.name} sudah mencapai batas asah tertinggi (+${MAX_REFINE}).`)
        }
        const left = cooldownLeft(rpg.lastEnchant, ENCHANT_COOLDOWN)
        if (left > 0) return m.reply(`Meja asah masih dipakai. Tunggu ${fmtMs(left)} lagi.`)
        const money = moneyNeeded(level)
        const mats = matNeeded(level)
        const matText = Object.entries(mats).map(([id, qty]) => `${ITEMS[id].name} x${qty}`).join(', ')
        if (rpg.money < money) {
            return m.reply(`Money Anda tidak cukup. Butuh ${fmtMoney(money)} money untuk mengasah ke level +${level + 1}.`)
        }
        if (!hasItems(rpg, mats)) {
            return m.reply(`Material belum cukup. Butuh ${matText}. Cari lewat ${prefix}dungeon.`)
        }
        rpg.lastEnchant = Date.now()
        rpg.money -= money
        for (const [matId, qty] of Object.entries(mats)) removeItem(rpg, matId, qty)
        rpg.refine[itemId] = level + 1
        const bonus = item.type === 'weapon' ? 3 : 2
        return m.reply(
            `*ASAH BERHASIL*\n${item.name} naik ke level +${rpg.refine[itemId]}.\n` +
            `${item.type === 'weapon' ? 'Serang' : 'Bertahan'} tambahan dari asahan sekarang +${rpg.refine[itemId] * bonus}.\n\n` +
            `Cek total statistik terbaru lewat ${prefix}profile.`
        )
    }
}
