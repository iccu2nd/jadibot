export default {
    cmd: ['bank', 'nabung', 'tabungan'],
    category: 'rpg',
    description: 'Simpan money di bank agar aman dari fitur lain',
    run: async (m, { text, prefix, cmd }) => {
        const user = global.db.data.users[m.sender] ??= {}
        user.money ??= 0
        user.bank ??= 0

        const target = m.mentionedJid?.[0] || m.quoted?.sender
        if (target && target !== m.sender) {
            const other = global.db.data.users[target]
            if (!other) return m.reply('Orang tersebut belum terdaftar di database.')
            return m.reply(`*BANK* @${target.split('@')[0]}\n\nDi tangan: *${other.money || 0}*\nDi bank: *${other.bank || 0}*`, { mentions: [target] })
        }

        const args = text.replace(/@\d+/g, ' ').trim().split(/ +/).filter(Boolean)
        const sub = (args[0] || '').toLowerCase()

        if (sub === 'tarik' || sub === 'withdraw' || sub === 'wd' || sub === 'ambil') {
            const raw = (args[1] || '').toLowerCase()
            const amount = raw === 'all' || raw === 'semua' ? user.bank : parseInt(raw, 10)
            if (!amount || amount < 1) return m.reply(`Contoh: ${prefix}${cmd} tarik 10000`)
            if (user.bank < amount) return m.reply(`Money di bank tidak cukup. Saldo bank: *${user.bank}*.`)

            user.bank -= amount
            user.money += amount
            return m.reply(`Berhasil menarik *${amount}* money dari bank.\n\nDi tangan: *${user.money}*\nDi bank: *${user.bank}*`)
        }

        if (sub) {
            const amount = sub === 'all' || sub === 'semua' ? user.money : parseInt(sub, 10)
            if (!amount || amount < 1) return m.reply(`Contoh: ${prefix}${cmd} 1000\n${prefix}${cmd} all`)
            if (user.money < amount) return m.reply(`Money di tangan tidak cukup. Saldo: *${user.money}*.`)

            user.money -= amount
            user.bank += amount
            return m.reply(`Berhasil menyimpan *${amount}* money ke bank.\n\nDi tangan: *${user.money}*\nDi bank: *${user.bank}*`)
        }

        return m.reply(
            `*BANK*\n\n` +
            `Money di bank aman dari fitur lain (judi, balap kuda, duel, gift, dan sejenisnya — semua itu hanya memakai money di tangan).\n\n` +
            `Di tangan: *${user.money}*\nDi bank: *${user.bank}*\n\n` +
            `Simpan : ${prefix}${cmd} <jumlah|all>\n` +
            `Tarik : ${prefix}${cmd} tarik <jumlah|all>\n`
        )
    }
}
