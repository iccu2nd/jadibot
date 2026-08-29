export default {
    cmd: ['listblacklist'],
    category: 'group',
    description: 'Lihat daftar blacklist grup',

    run: async (m, { config }) => {
        if (!m.isGroup) return m.reply('Fitur ini hanya bisa digunakan di grup.')

        const chat = global.db.data.chats[m.from]
        const list = chat?.blacklist || []
        if (!list.length) return m.reply('Blacklist grup ini kosong.')

        const names = list.map((jid, i) => `${i + 1}. @${jid.split('@')[0]}`).join('\n')
        return m.reply(`*BLACKLIST GRUP*\n\n${names}\n\nTotal: *${list.length} user*\n> *${config.botName}*`)
    }
}
