import { getOwo, fmtCowoncy, progressQuest, spinSlots } from '../lib/owo.js'

const SYMBOLS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '⭐', '💎']

function rollReels(tier) {
    if (tier.matches === 3) {
        const sym = tier.symbol || SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        return [sym, sym, sym]
    }
    if (tier.matches === 2) {
        const win = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        const lose = SYMBOLS.filter(s => s !== win)[Math.floor(Math.random() * (SYMBOLS.length - 1))]
        return [win, win, lose].sort(() => Math.random() - 0.5)
    }
    let reels
    do {
        reels = [0, 0, 0].map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
    } while (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2])
    return reels
}

export default {
    cmd: ['owoslots', 'owoslot'],
    category: 'owo',
    run: async (m, { text, prefix, cmd }) => {
        const owo = getOwo(m.sender)
        const rawAmount = text.trim().toLowerCase()
        const amount = rawAmount === 'all' || rawAmount === 'semua' ? owo.cowoncy : parseInt(rawAmount, 10)

        if (!amount || amount < 1) {
            return m.reply(`🎰 *OWO SLOTS*\n\nContoh: ${prefix + cmd} 100\n\n🎲 Tiap putaran punya peluang: mega jackpot, jackpot, menang besar, menang, balik modal sebagian, atau kalah total.\n\nSaldo Anda: ${fmtCowoncy(owo.cowoncy)}`)
        }
        if (amount < 10) return m.reply('⚠️ Minimal taruhan 10 🦴.')
        if (owo.cowoncy < amount) return m.reply(`💸 Saldo Anda tidak cukup. Saldo Anda ${fmtCowoncy(owo.cowoncy)}`)

        owo.totalGambled += amount
        const { tier, prize } = spinSlots(amount)
        const reels = rollReels(tier)

        owo.cowoncy = owo.cowoncy - amount + prize
        if (prize > amount) owo.totalEarned += prize - amount

        let out = `🎰 *OWO SLOTS*\n\n[ ${reels[0]} | ${reels[1]} | ${reels[2]} ]\n\n${tier.label}\n\n`
        out += prize > 0 ? `Anda dapat: ${fmtCowoncy(prize)}` : `Anda kehilangan: ${fmtCowoncy(amount)}`
        out += `\nSaldo sekarang: ${fmtCowoncy(owo.cowoncy)}`

        progressQuest(m.sender, 'useSlots')
        return m.reply(out)
    }
}
