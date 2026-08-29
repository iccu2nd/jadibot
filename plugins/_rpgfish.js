import { ITEMS, getRpg, hasStarted, fmtMs, cooldownLeft, FISH_COOLDOWN, catchFish, checkNewTitles, titleNotifText } from '../lib/rpg.js'

export default {
    cmd: ['fish', 'mancing', 'memancing'],
    category: 'rpg',
    run: async (m, { prefix }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)

        const left = cooldownLeft(rpg.lastFish, FISH_COOLDOWN)
        if (left > 0) {
            return m.reply(`Kail masih dilempar, tunggu ${fmtMs(left)} lagi untuk memancing berikutnya.`)
        }
        rpg.lastFish = Date.now()
        const caught = catchFish()
        const item = ITEMS[caught]
        rpg.inventory[caught] = (rpg.inventory[caught] || 0) + 1
        const isJunk = item.type === 'junk'
        if (!isJunk) rpg.fishCaught = (rpg.fishCaught || 0) + 1

        let text2 = `*MANCING*\n\n`
        text2 += isJunk
            ? `Yah, kail hanya menyangkut ${item.name}. Coba lagi nanti.`
            : `Dapat tangkapan! *${item.name}*`
        text2 += `\n\n- *Total ikan ditangkap:* ${rpg.fishCaught || 0}`
        if (!isJunk && rpg.fishCaught && rpg.fishCaught % 10 === 0) {
            rpg.inventory.besi_tua = (rpg.inventory.besi_tua || 0) + 1
            text2 += `\n- *Bonus 10 tangkapan:* Besi Tua x1`
        }
        text2 += `\n\nRacik hasil tangkapan jadi hidangan buff lewat ${prefix}cook, atau jual langsung untuk money lewat ${prefix}sell all.`
        const gained = checkNewTitles(rpg)
        text2 += titleNotifText(gained, prefix)
        return m.reply(text2)
    }
}
