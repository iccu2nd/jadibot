export default {
    cmd: ['antilottie'],
    category: 'group',
    run: async (m, { text, isAdmin }) => {
        if (!m.isGroup) return m.reply('Fitur ini hanya dapat digunakan di dalam grup.')
        if (!isAdmin) return m.reply('Hanya admin grup yang dapat menggunakan perintah ini.')

        const chat = global.db.data.chats[m.from]
        const action = text.toLowerCase().trim()

        if (action === 'on') {
            chat.antilottie = true
            return m.reply('Anti-Lottie Sticker berhasil diaktifkan di grup ini!')
        } else if (action === 'off') {
            chat.antilottie = false
            return m.reply('Anti-Lottie Sticker dinonaktifkan di grup ini.')
        } else {
            const status = chat.antilottie ? 'ON' : 'OFF'
            return m.reply(`Status Anti-Lottie di grup ini: *[ ${status} ]*\n\nGunakan \`!antilottie on\` untuk menyalakan atau \`!antilottie off\` untuk mematikan.`)
        }
    },

    onMessage: async (m, { sock }) => {
        if (!m || !m.isGroup || m.key.fromMe) return false

        const chat = global.db.data.chats[m.from]
        if (!chat?.antilottie) return false

        if (m.type === 'lottieStickerMessage' || m.message?.lottieStickerMessage) {
            if (!m.isBotAdmin) return false
            try {
                await sock.sendMessage(m.from, {
                    delete: { remoteJid: m.from, fromMe: m.key.fromMe, id: m.key.id, participant: m.sender }
                })
                return true
            } catch (e) {
                console.error('Gagal menghapus Lottie sticker:', e.message)
            }
        }
        return false
    }
}
