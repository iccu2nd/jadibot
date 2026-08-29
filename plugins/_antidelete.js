export default {
    cmd: ['antidelete', 'adelete'],
    category: 'group',
    run: async (m, { text, isAdmin }) => {
        if (!m.isGroup) return m.reply('Khusus Grup!')
        if (!isAdmin) return m.reply('Khusus Admin Grup!')

        const chat = global.db.data.chats[m.from]
        const action = text.split(' ')[0]?.toLowerCase()

        if (action === 'on') {
            chat.antidelete = true
            return m.reply('Antidelete berhasil diaktifkan!')
        } else if (action === 'off') {
            chat.antidelete = false
            return m.reply('Antidelete berhasil dimatikan!')
        } else {
            const status = chat.antidelete ? 'ON' : 'OFF'
            return m.reply(`⌗ *Antidelete System*\n\nStatus: *[ ${status} ]*\n\n› .antidelete on\n› .antidelete off`)
        }
    }
}
