import { getOwo, dailyReward, fmtCowoncy, fmtMs, cooldownLeft, DAILY_COOLDOWN, progressQuest } from '../lib/owo.js'

export default {
    cmd: ['owodaily', 'owoclaim'],
    category: 'owo',
    run: async (m) => {
        const owo = getOwo(m.sender)
        const result = dailyReward(owo, m.sender)

        if (!result.claimed) {
            return m.reply(`⏳ Anda sudah klaim hari ini. Coba lagi ${fmtMs(result.left)} lagi.\n\nStreak sekarang: *${owo.dailyStreak}* hari`)
        }

        let text = `🦴 *DAILY COWONCY*\n\n`
        text += `Anda dapat *${fmtCowoncy(result.reward)}*!\n`
        text += `🔥 Streak: *${result.streak}* hari\n\n`
        text += `Saldo sekarang: ${fmtCowoncy(owo.cowoncy)}\n\n`
        text += `> Klaim tiap hari agar streak tidak putus, bonusnya makin besar.`
        progressQuest(m.sender, 'claimDaily')
        return m.reply(text)
    }
}
