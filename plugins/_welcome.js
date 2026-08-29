export default {
    cmd: ['welcome'],
    category: 'group',
    run: async (m, { text, isAdmin }) => {
        if (!m.isGroup) return m.reply('Khusus Grup!')
        if (!isAdmin) return m.reply('Khusus Admin Grup!')

        const chat = global.db.data.chats[m.from]
        const action = text.split(' ')[0]?.toLowerCase()

        if (action === 'on') {
            chat.welcome = true
            return m.reply('Welcome Message berhasil diaktifkan!')
        } else if (action === 'off') {
            chat.welcome = false
            return m.reply('Welcome Message berhasil dimatikan!')
        } else if (action === 'set') {
            const newText = text.slice(3).trim()
            if (!newText) return m.reply('Masukan teks welcome nya!')
            chat.welcomeText = newText
            return m.reply('Teks Welcome berhasil diubah!')
        } else {
            const status = chat.welcome ? 'ON' : 'OFF'
            return m.reply(
                `⌗ *Welcome System*\n\nStatus: *[ ${status} ]*\n\n› .welcome on\n› .welcome off\n› .welcome set <teks>\n\n*Variables:*\n@pushname, @gcname, @desc, @date, @jam`
            )
        }
    }
}
