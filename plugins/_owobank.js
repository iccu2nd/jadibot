import { getOwo, fmtCowoncy, progressQuest } from '../lib/owo.js'

export default {
    cmd: ['owobank'],
    category: 'owo',
    run: async (m, { text, prefix, cmd }) => {
        const owo = getOwo(m.sender)
        const args = text.trim().split(/ +/).filter(Boolean)
        const sub = (args[0] || '').toLowerCase()

        if (sub === 'deposit' || sub === 'dep' || sub === 'nabung') {
            const raw = (args[1] || '').toLowerCase()
            const amount = raw === 'all' || raw === 'semua' ? owo.cowoncy : parseInt(raw, 10)
            if (!amount || amount < 1) return m.reply(`Contoh: ${prefix}${cmd} deposit 500`)
            if (owo.cowoncy < amount) return m.reply(`Saldo di tangan Anda tidak cukup. Punya ${fmtCowoncy(owo.cowoncy)}.`)

            owo.cowoncy -= amount
            owo.bank += amount
            progressQuest(m.sender, 'bankDeposit')
            return m.reply(`Berhasil menyimpan ${fmtCowoncy(amount)} ke bank.\n\nDi tangan: ${fmtCowoncy(owo.cowoncy)}\nDi bank: ${fmtCowoncy(owo.bank)}`)
        }

        if (sub === 'withdraw' || sub === 'wd' || sub === 'tarik') {
            const raw = (args[1] || '').toLowerCase()
            const amount = raw === 'all' || raw === 'semua' ? owo.bank : parseInt(raw, 10)
            if (!amount || amount < 1) return m.reply(`Contoh: ${prefix}${cmd} withdraw 500`)
            if (owo.bank < amount) return m.reply(`Saldo bank Anda tidak cukup. Punya ${fmtCowoncy(owo.bank)}.`)

            owo.bank -= amount
            owo.cowoncy += amount
            return m.reply(`Berhasil menarik ${fmtCowoncy(amount)} dari bank.\n\nDi tangan: ${fmtCowoncy(owo.cowoncy)}\nDi bank: ${fmtCowoncy(owo.bank)}`)
        }

        return m.reply(
            `*OWO BANK*\n\n` +
            `Cowoncy di bank aman dari steal PvP (${prefix}owopvp hanya mencuri dari yang di tangan, bukan bank).\n\n` +
            `Di tangan: ${fmtCowoncy(owo.cowoncy)}\nDi bank: ${fmtCowoncy(owo.bank)}\n\n` +
            `Simpan : ${prefix}${cmd} deposit <jumlah|all>\n` +
            `Tarik  : ${prefix}${cmd} withdraw <jumlah|all>`
        )
    }
}
