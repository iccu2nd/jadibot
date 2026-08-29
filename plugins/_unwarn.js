const getUser = (jid) => {
    if (!global.db.data.users[jid]) global.db.data.users[jid] = { warn: 0 }
    if (!global.db.data.users[jid].warn) global.db.data.users[jid].warn = 0
    return global.db.data.users[jid]
}

export default {
    cmd: ['delwarn', 'unwarn'],
    category: 'group',
    run: async (m, { cmd, isAdmin }) => {
        if (!m.isGroup) return m.reply('Fitur ini hanya dapat digunakan di dalam grup.')
        if (!isAdmin) return m.reply('Hanya admin grup yang dapat menggunakan perintah ini.')

        const chat = global.db.data.chats[m.from]
        const maxWarn = chat.maxWarn || 3

        const jid = m.mentionedJid?.[0] || m.quoted?.sender
        if (!jid) return m.reply(`Tag atau reply orangnya dulu.\nContoh: .${cmd} @user`)

        const user = getUser(jid)
        user.warn = Math.max(0, user.warn - 1)
        return m.reply(`✅ 1 warn dihapus dari @${jid.split('@')[0]} (sisa ${user.warn}/${maxWarn})`, { mentions: [jid] })
    }
}
