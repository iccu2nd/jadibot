import { getOwo, fmtCowoncy, progressQuest } from '../lib/owo.js'

const SIDES = {
    kepala: 'kepala', k: 'kepala', head: 'kepala', heads: 'kepala', h: 'kepala',
    ekor: 'ekor', e: 'ekor', tail: 'ekor', tails: 'ekor', t: 'ekor'
}

export default {
    cmd: ['owoflip', 'owocoinflip', 'owocf'],
    category: 'owo',
    run: async (m, { text, prefix, cmd }) => {
        const owo = getOwo(m.sender)
        const args = text.trim().split(/ +/)
        const rawAmount = args[0]?.toLowerCase()
        const rawSide = SIDES[args[1]?.toLowerCase()]

        const amount = rawAmount === 'all' || rawAmount === 'semua' ? owo.cowoncy : parseInt(rawAmount, 10)

        if (!amount || amount < 1 || !rawSide) {
            return m.reply(`🪙 *COINFLIP*\n\nTebak sisi koin, menang uangnya digandakan.\n\nContoh: ${prefix + cmd} 100 kepala\n${prefix + cmd} 50 ekor\n\nSaldo Anda: ${fmtCowoncy(owo.cowoncy)}`)
        }
        if (amount < 10) return m.reply('⚠️ Minimal taruhan 10 🦴.')
        if (owo.cowoncy < amount) return m.reply(`💸 Saldo Anda tidak cukup. Saldo Anda ${fmtCowoncy(owo.cowoncy)}`)

        const result = Math.random() < 0.5 ? 'kepala' : 'ekor'
        const win = result === rawSide
        owo.totalGambled += amount

        let text2 = `🪙 Koin menunjukkan: *${result === 'kepala' ? 'KEPALA' : 'EKOR'}*\n\n`
        if (win) {
            owo.cowoncy += amount
            owo.totalEarned += amount
            text2 += `🎉 Anda menang! +${fmtCowoncy(amount)}`
        } else {
            owo.cowoncy -= amount
            text2 += `❌ Anda kalah. -${fmtCowoncy(amount)}`
        }
        text2 += `\n\nSaldo sekarang: ${fmtCowoncy(owo.cowoncy)}`
        progressQuest(m.sender, 'coinflip')
        return m.reply(text2)
    }
}
