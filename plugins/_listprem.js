export default {
    cmd: ['listprem'],
    category: 'owner',
    description: 'Lihat daftar user premium',
    run: async (m, { config, isOwner }) => {
        if (!isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')

        const now = Date.now()
        const users = global.db.data.users || {}
        const list = Object.entries(users)
            .filter(([, u]) => u.premium && u.premiumTime > now)
            .sort((a, b) => a[1].premiumTime - b[1].premiumTime)

        if (!list.length) return m.reply(`Belum ada user premium saat ini.\n\n> *${config.botName}*`)

        const lines = list.map(([jid, u], i) => {
            const expire = new Date(u.premiumTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            return `${i + 1}. @${jid.split('@')[0]} — hingga ${expire}`
        }).join('\n')

        return m.reply(`💎 *DAFTAR USER PREMIUM*\n\n${lines}\n\nTotal: *${list.length} user*\n> *${config.botName}*`, {
            mentions: list.map(([jid]) => jid)
        })
    }
}
