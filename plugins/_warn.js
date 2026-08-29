const getUser = (jid) => {
    if (!global.db.data.users[jid]) global.db.data.users[jid] = { warn: 0 }
    if (!global.db.data.users[jid].warn) global.db.data.users[jid].warn = 0
    return global.db.data.users[jid]
}

export default {
    cmd: ['warn'],
    category: 'group',
    run: async (m, { sock, text, cmd, isAdmin }) => {
        if (!m.isGroup) return m.reply('Fitur ini hanya dapat digunakan di dalam grup.')
        if (!isAdmin) return m.reply('Hanya admin grup yang dapat menggunakan perintah ini.')

        const chat = global.db.data.chats[m.from]
        const maxWarn = chat.maxWarn || 3

        const jid = m.mentionedJid?.[0] || m.quoted?.sender
        if (!jid) return m.reply(`Tag atau reply orangnya dulu.\nContoh: .${cmd} @user`)

        const user = getUser(jid)
        user.warn += 1

        if (user.warn >= maxWarn) {
            user.warn = 0
            if (!m.isBotAdmin) return m.reply(`⚠️ @${jid.split('@')[0]} kena limit warn tapi bot bukan admin, kick manual ya.`, { mentions: [jid] })
            await sock.groupParticipantsUpdate(m.from, [jid], 'remove')
            return m.reply(`⚠️ @${jid.split('@')[0]} kena limit warn (${maxWarn}/${maxWarn}), otomatis dikeluarkan.`, { mentions: [jid] })
        }

        return m.reply(`⚠️ @${jid.split('@')[0]} mendapat warn (${user.warn}/${maxWarn})${text ? `\nAlasan: ${text}` : ''}`, { mentions: [jid] })
    }
}
