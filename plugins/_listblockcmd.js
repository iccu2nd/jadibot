import { settings } from '../lib/database.js'

export default {
    cmd: ['listblockcmd'],
    category: 'owner',
    description: 'Lihat daftar perintah yang diblokir',
    run: async (m, { config, prefix, isOwner }) => {
        if (!isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')

        if (!settings.blockedCmds.length) {
            return m.reply(`Belum ada perintah yang diblokir.\n\nKetik ${prefix}blockcmd <nama perintah> buat blokir.\n> *${config.botName}*`)
        }

        const lines = settings.blockedCmds.map((c, i) => `${i + 1}. ${c}`).join('\n')
        return m.reply(`*DAFTAR PERINTAH DIBLOKIR*\n\n${lines}\n\nTotal: *${settings.blockedCmds.length} perintah*\nBuka lagi pakai ${prefix}unblockcmd <nama perintah>\n> *${config.botName}*`)
    }
}
