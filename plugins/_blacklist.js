export default {
    cmd: ['blacklist', 'bl'],
    category: 'group',
    description: 'Blacklist user - pesan otomatis dihapus',

    run: async (m, { sock, config, isAdmin, isBotAdmin, prefix }) => {
        if (!m.isGroup) return m.reply('Fitur ini hanya bisa digunakan di grup.')
        if (!isAdmin && !m.isOwner) return m.reply('Hanya admin yang bisa menggunakan perintah ini.')
        if (!isBotAdmin) return m.reply('Bot harus jadi admin dulu agar bisa hapus pesan.')

        const chat = global.db.data.chats[m.from]
        if (!chat.blacklist) chat.blacklist = []

        const mentioned = m.mentionedJid?.[0] || m.quoted?.sender
        if (!mentioned) return m.reply(`Tag atau reply pesan user yang mau di-blacklist!\nContoh: *${prefix}bl @user*`)

        if (mentioned === m.sender) return m.reply('Tidak bisa blacklist diri sendiri.')

        const botJid = sock.user?.id?.replace(/:\d+@.+/, '') + '@s.whatsapp.net'
        if (mentioned === botJid) return m.reply('Tidak bisa blacklist bot sendiri.')

        const numOnly = mentioned.split('@')[0]
        if (chat.blacklist.some(j => j.split('@')[0] === numOnly)) return m.reply(`@${numOnly} sudah ada di blacklist.`)

        chat.blacklist.push(mentioned)

        return m.reply(
            `✅ *@${numOnly} di-blacklist!*\n\n` +
            `Semua pesan yang dikirim di grup ini akan otomatis dihapus.\n` +
            `Gunakan *${prefix}ubl @user* untuk hapus dari blacklist.\n\n` +
            `> *${config.botName}*`
        )
    },

    onMessage: async (m, { sock }) => {
        if (!m || !m.isGroup || m.key.fromMe) return false

        const chat = global.db.data.chats[m.from]
        const list = chat?.blacklist || []
        const numOnly = m.sender?.split('@')[0]
        if (!list.some(j => j.split('@')[0] === numOnly)) return false

        if (!m.isBotAdmin) return false

        try {
            await sock.sendMessage(m.from, {
                delete: { remoteJid: m.from, fromMe: false, id: m.key.id, participant: m.sender }
            })
            return true
        } catch {}
        return false
    }
}
