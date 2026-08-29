import { settings } from '../lib/database.js'
import { getPlugin } from '../lib/plugins.js'

export default {
    cmd: ['blockcmd'],
    category: 'owner',
    run: async (m, { text, prefix, cmd }) => {
        if (!m.isOwner) return m.reply('Fitur ini khusus untuk owner.')
        const target = text.trim().toLowerCase()
        if (!target) {
            if (!settings.blockedCmds.length) return m.reply(`Belum ada fitur yang diblokir.\n\nKetik ${prefix + cmd} <nama perintah> buat blokir.`)
            return m.reply(`Fitur yang lagi diblokir:\n\n${settings.blockedCmds.map(c => `- ${c}`).join('\n')}\n\nBuka lagi pakai ${prefix}unblockcmd <nama perintah>`)
        }
        const plugin = getPlugin(target)
        if (!plugin) return m.reply(`Perintah *${target}* tidak ditemukan.`)
        const canonical = plugin.cmd[0]
        if (settings.blockedCmds.includes(canonical)) return m.reply(`Perintah *${canonical}* telah diblokir sebelumnya.`)
        settings.blockedCmds.push(canonical)
        return m.reply(`[ ! ] Perintah *${canonical}* diblokir sementara.\n\nBuka lagi dengan ${prefix}unblockcmd ${canonical}`)
    }
}
