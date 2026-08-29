const getUser = (jid) => {
    if (!global.db.data.users[jid]) global.db.data.users[jid] = { warn: 0 }
    if (!global.db.data.users[jid].warn) global.db.data.users[jid].warn = 0
    return global.db.data.users[jid]
}

export default {
    cmd: ['cekwarn'],
    category: 'group',
    run: async (m) => {
        if (!m.isGroup) return m.reply('Fitur ini hanya dapat digunakan di dalam grup.')

        const chat = global.db.data.chats[m.from]
        const maxWarn = chat.maxWarn || 3

        const jid = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const warn = getUser(jid).warn
        return m.reply(`⚠️ @${jid.split('@')[0]} punya ${warn}/${maxWarn} warn.`, { mentions: [jid] })
    }
}
