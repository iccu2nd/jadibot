export default {
    cmd: ['goodbye'],
    category: 'group',
    run: async (m, { text, isAdmin }) => {
        if (!m.isGroup) return m.reply('Khusus Grup!')
        if (!isAdmin) return m.reply('Khusus Admin Grup!')

        const chat = global.db.data.chats[m.from]
        const action = text.split(' ')[0]?.toLowerCase()

        if (action === 'on') {
            chat.goodbye = true
            return m.reply('Goodbye Message berhasil diaktifkan!')
        } else if (action === 'off') {
            chat.goodbye = false
            return m.reply('Goodbye Message berhasil dimatikan!')
        } else if (action === 'set') {
            const newText = text.slice(3).trim()
            if (!newText) return m.reply('Masukan teks goodbye nya!')
            chat.goodbyeText = newText
            return m.reply('Teks Goodbye berhasil diubah!')
        } else {
            const status = chat.goodbye ? 'ON' : 'OFF'
            return m.reply(
                `⌗ *Goodbye System*\n\nStatus: *[ ${status} ]*\n\n› .goodbye on\n› .goodbye off\n› .goodbye set <teks>\n\n*Variables:*\n@pushname, @gcname, @desc, @date, @jam`
            )
        }
    }
}
