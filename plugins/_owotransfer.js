import { getOwo, fmtCowoncy, calcTransferTax, hasOwo, progressQuest } from '../lib/owo.js'

export default {
    cmd: ['owotransfer', 'owogive'],
    category: 'owo',
    run: async (m, { text, prefix, cmd }) => {
        const target = m.mentionedJid?.[0] || m.quoted?.sender
        if (!target) return m.reply(`❓ Tag atau reply orang yang ingin diberikan cowoncy, sertakan jumlahnya.\nContoh: ${prefix + cmd} @orang 100`)
        if (target === m.sender) return m.reply('⚠️ Tidak bisa transfer ke diri sendiri.')

        let amountText = text
        if (m.mentionedJid?.length) {
            for (const jid of m.mentionedJid) amountText = amountText.split('@' + jid.split('@')[0]).join(' ')
        }
        const amount = parseInt(amountText.trim(), 10)
        if (!amount || amount < 1) return m.reply(`❓ Masukan jumlah cowoncy yang ingin dikirim.\nContoh: ${prefix + cmd} @orang 100`)

        if (!hasOwo(target)) return m.reply('⚠️ Orang itu belum pernah main OwO, suruh dia ketik .owodaily dulu.')

        const sender = getOwo(m.sender)
        if (sender.cowoncy < amount) return m.reply(`💸 Saldo Anda tidak cukup. Saldo Anda ${fmtCowoncy(sender.cowoncy)}`)

        const tax = calcTransferTax(amount)
        const received = amount - tax
        const receiver = getOwo(target)

        sender.cowoncy -= amount
        receiver.cowoncy += received
        receiver.totalEarned += received

        let out = `✅ Berhasil transfer ${fmtCowoncy(amount)} ke @${target.split('@')[0]}.\n`
        if (tax > 0) out += `📉 Pajak (3%): ${fmtCowoncy(tax)}\n📦 Diterima: ${fmtCowoncy(received)}\n`
        out += `\nSaldo Anda sekarang: ${fmtCowoncy(sender.cowoncy)}`

        progressQuest(m.sender, 'transfer')
        return m.reply(out, { mentions: [target] })
    }
}
