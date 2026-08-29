export default {
    cmd: ['unblacklist', 'ubl'],
    category: 'group',
    description: 'Hapus user dari blacklist',

    run: async (m, { config, isAdmin, isBotAdmin, prefix }) => {
        if (!m.isGroup) return m.reply('Fitur ini hanya bisa digunakan di grup.')
        if (!isAdmin && !m.isOwner) return m.reply('Hanya admin yang bisa menggunakan perintah ini.')
        if (!isBotAdmin) return m.reply('Bot harus jadi admin dulu agar bisa hapus pesan.')

        const chat = global.db.data.chats[m.from]
        if (!chat.blacklist) chat.blacklist = []

        const mentioned = m.mentionedJid?.[0] || m.quoted?.sender
        if (!mentioned) return m.reply(`Tag atau reply pesan user yang mau di-unblacklist!\nContoh: *${prefix}ubl @user*`)

        const numOnly = mentioned.split('@')[0]

        const before = chat.blacklist.length
        chat.blacklist = chat.blacklist.filter(j => j.split('@')[0] !== numOnly)
        if (chat.blacklist.length === before) return m.reply(`@${numOnly} tidak ada di blacklist.`)

        return m.reply(`✅ *@${numOnly} dihapus dari blacklist!*\n\nPesan mereka tidak akan dihapus lagi.\n\n> *${config.botName}*`)
    }
}
