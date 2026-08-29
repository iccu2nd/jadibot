export default {
    cmd: ['setmaxwarn'],
    category: 'group',
    run: async (m, { text, isAdmin }) => {
        if (!m.isGroup) return m.reply('Fitur ini hanya dapat digunakan di dalam grup.')
        if (!isAdmin) return m.reply('Hanya admin grup yang dapat menggunakan perintah ini.')

        const chat = global.db.data.chats[m.from]
        const maxWarn = chat.maxWarn || 3

        const value = parseInt(text)
        if (!value || value < 1) return m.reply(`Gunakan: .setmaxwarn <angka>\nBatas saat ini: ${maxWarn}`)
        chat.maxWarn = value
        return m.reply(`✅ Batas warn di grup ini diubah jadi ${value}.`)
    }
}
