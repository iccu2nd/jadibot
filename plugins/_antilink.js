const LINK_REGEX = /chat\.whatsapp\.com\/[a-zA-Z0-9]+|whatsapp\.com\/channel\/[a-zA-Z0-9]+/i

export default {
    cmd: ['antilink'],
    category: 'group',
    run: async (m, { text, isAdmin }) => {
        if (!m.isGroup) return m.reply('Fitur ini hanya dapat digunakan di dalam grup.')
        if (!isAdmin) return m.reply('Hanya admin grup yang dapat menggunakan perintah ini.')

        const chat = global.db.data.chats[m.from]
        const action = text.toLowerCase().trim()

        if (action === 'on --kick') {
            chat.antiLink = true
            chat.antiLinkMode = 'kick'
            return m.reply('Anti-Link berhasil diaktifkan (mode: kick)!')
        } else if (action === 'on --delete' || action === 'on') {
            chat.antiLink = true
            chat.antiLinkMode = 'delete'
            return m.reply('Anti-Link berhasil diaktifkan (mode: delete)!')
        } else if (action === 'off') {
            chat.antiLink = false
            return m.reply('Anti-Link dinonaktifkan di grup ini.')
        } else {
            const status = chat.antiLink ? `ON (${chat.antiLinkMode || 'delete'})` : 'OFF'
            return m.reply(`Status Anti-Link di grup ini: *[ ${status} ]*\n\nGunakan\n\`.antilink on --delete\`\n\`.antilink on --kick\`\n\`.antilink off\`.`)
        }
    },

    onMessage: async (m, { sock }) => {
        if (!m || !m.isGroup || m.key.fromMe) return false

        const chat = global.db.data.chats[m.from]
        if (!chat?.antiLink) return false
        if (m.isAdmin) return false
        if (!LINK_REGEX.test(m.body || '')) return false
        if (!m.isBotAdmin) return false

        try {
            await sock.sendMessage(m.from, {
                delete: { remoteJid: m.from, fromMe: m.key.fromMe, id: m.key.id, participant: m.sender }
            })

            if (chat.antiLinkMode === 'kick') {
                await sock.groupParticipantsUpdate(m.from, [m.sender], 'remove')
                await sock.sendMessage(m.from, { text: `Link terdeteksi, @${m.sender.split('@')[0]} dikeluarkan.`, mentions: [m.sender] })
            } else {
                await sock.sendMessage(m.from, { text: `Link terdeteksi dan dihapus dari @${m.sender.split('@')[0]}`, mentions: [m.sender] })
            }
            return true
        } catch (e) {
            console.error('Gagal memproses anti-link:', e.message)
        }
        return false
    }
}
