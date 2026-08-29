import { getOwo, fmtCowoncy } from '../lib/owo.js'

export default {
    cmd: ['owobalance', 'owobal', 'cowoncy'],
    category: 'owo',
    run: async (m) => {
        const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const owo = getOwo(target)

        let text = `🦴 *DOMPET OWO*\n\n`
        if (target !== m.sender) text += `Punya @${target.split('@')[0]}\n\n`
        text += `Cowoncy: ${fmtCowoncy(owo.cowoncy)}\n`
        text += `🏦 Bank: ${fmtCowoncy(owo.bank)}\n`
        text += `📈 Total didapat: ${fmtCowoncy(owo.totalEarned)}\n`
        text += `🎲 Total dipertaruhkan: ${fmtCowoncy(owo.totalGambled)}`

        return m.reply(text, { mentions: [target] })
    }
}
