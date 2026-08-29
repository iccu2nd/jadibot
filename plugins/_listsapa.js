import { settings } from '../lib/database.js'

export default {
    cmd: ['listsapa'],
    category: 'owner',
    description: 'Lihat daftar user sapa',
    run: async (m, { config, isOwner }) => {
        if (!isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')

        const list = Object.entries(settings.sapaList)
        if (!list.length) return m.reply(`Belum ada user di daftar sapa.\n\n> *${config.botName}*`)

        const lines = list.map(([jid, msg], i) => `${i + 1}. @${jid.split('@')[0]} — ${msg}`).join('\n')

        return m.reply(`👋 *DAFTAR SAPA*\n\n${lines}\n\nTotal: *${list.length} user*\n> *${config.botName}*`, {
            mentions: list.map(([jid]) => jid)
        })
    }
}
