export default {
    cmd: ['listban'],
    category: 'owner',
    description: 'Lihat daftar user yang di-ban',
    run: async (m, { config, isOwner }) => {
        if (!isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')

        const users = global.db.data.users || {}
        const list = Object.entries(users).filter(([, u]) => u.banned)

        if (!list.length) return m.reply(`Tidak ada user yang di-ban saat ini.\n\n> *${config.botName}*`)

        const lines = list.map(([jid], i) => `${i + 1}. @${jid.split('@')[0]}`).join('\n')

        return m.reply(`🚫 *DAFTAR USER BANNED*\n\n${lines}\n\nTotal: *${list.length} user*\nBuka ban dengan .unban <nomor/tag>\n> *${config.botName}*`, {
            mentions: list.map(([jid]) => jid)
        })
    }
}
