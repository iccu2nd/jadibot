const judiLock = new Set()

export default {
    cmd: ['judi'],
    category: 'games',
    run: async (m, { text, prefix, cmd }) => {
        if (judiLock.has(m.chat)) {
            return m.reply('Masih ada perjudian berlangsung di sini, silakan tunggu hingga selesai.')
        }
        const user = global.db.data.users[m.sender]
        const raw = text.trim().toLowerCase()

        if (!raw) return m.reply(`Masukkan jumlah taruhan.\n${prefix + cmd} 1000\n\nMoney Anda: *${user?.money || 0}*`)

        const count = raw === 'all' || raw === 'semua' ? (user?.money || 0) : parseInt(raw, 10)
        if (!count || count < 1) return m.reply(`Jumlah tidak valid.\n${prefix + cmd} 1000`)
        if ((user?.money || 0) < count) return m.reply(`Money Anda tidak cukup untuk taruhan sebesar ${count}.\nMoney Anda: *${user?.money || 0}*`)

        judiLock.add(m.chat)
        try {
            const rollBandar = Math.floor(Math.random() * 101)
            const rollAnda = Math.floor(Math.random() * 81)

            user.money -= count
            let out = `Roll bandar: ${rollBandar}\nRoll Anda: ${rollAnda}\n\n`

            if (rollBandar > rollAnda) {
                out += `Anda *KALAH*, kehilangan ${count}.`
            } else if (rollBandar < rollAnda) {
                const prize = count * 2
                user.money += prize
                out += `Anda *MENANG*, mendapatkan ${prize}.`
            } else {
                user.money += count
                out += `Hasil *SERI*, taruhan Anda dikembalikan sebesar ${count}.`
            }
            out += `\n\nMoney sekarang: *${user.money}*`
            return m.reply(out)
        } finally {
            judiLock.delete(m.chat)
        }
    }
}
