export default {
    cmd: ['delprem'],
    category: 'owner',
    run: async (m, { sock }) => {
        if (!m.isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')

        const target = m.mentionedJid?.[0] || m.quoted?.sender
        if (!target) return m.reply('Tag atau reply user.\nContoh: .delprem @user\natau reply pesan lalu: .delprem')

        const user = global.db.data.users[target]
        if (!user) return m.reply('User tidak ditemukan di database.')
        if (!user.premium) return m.reply('User tersebut bukan member premium.')

        user.premium = false
        user.premiumTime = 0

        await sock.sendMessage(m.from, {
            text: `Status premium @${target.split('@')[0]} telah dihapus.`,
            mentions: [target]
        }, { quoted: m })
    }
}
