import { CHESTS, getRpg, hasStarted, fmtMoney, openChest, cooldownLeft, fmtMs, CHEST_COOLDOWN } from '../lib/rpg.js'

export default {
    cmd: ['chest', 'peti'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const pick = text.trim().toLowerCase()

        if (!pick) {
            let out = `*PETI HARTA*\nBeli peti pakai emas, buka langsung, dan lihat apa yang Anda dapat. Makin mahal petinya, semakin besar peluang jackpot.\n\n`
            for (const [id, chest] of Object.entries(CHESTS)) {
                out += `• ${chest.name} (${id}) - ${fmtMoney(chest.price)} money\n`
            }
            out += `\nMoney Anda : ${fmtMoney(rpg.money)} money\nBuka dengan ${prefix + cmd} <nama peti>, contoh: ${prefix + cmd} perunggu`
            return m.reply(out)
        }

        const chest = CHESTS[pick]
        if (!chest) {
            return m.reply(`Peti tidak ditemukan. Ketik ${prefix + cmd} tanpa tambahan teks untuk melihat daftar peti.`)
        }
        if (rpg.money < chest.price) {
            return m.reply(`Money Anda tidak cukup. Butuh ${fmtMoney(chest.price)} money, money Anda hanya ${fmtMoney(rpg.money)}.`)
        }
        const left = cooldownLeft(rpg.lastChest, CHEST_COOLDOWN)
        if (left > 0) {
            return m.reply(`Anda harus menunggu ${fmtMs(left)} lagi sebelum bisa buka peti lagi.`)
        }
        rpg.lastChest = Date.now()
        rpg.money -= chest.price
        const result = openChest(rpg, pick)
        let text2 = `*${chest.name.toUpperCase()} DIBUKA*\n\n`
        text2 += result.jackpot ? `ANDA SANGAT BERUNTUNG!\n${result.detail}\n\n` : `${result.detail}\n\n`
        text2 += `Sisa money : ${fmtMoney(rpg.money)} money\nCoba lagi ${prefix + cmd} <nama peti> untuk adu peruntungan sekali lagi.`
        return m.reply(text2)
    }
}
