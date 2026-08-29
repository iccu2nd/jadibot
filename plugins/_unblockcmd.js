import { settings } from '../lib/database.js'
import { getPlugin } from '../lib/plugins.js'

export default {
    cmd: ['unblockcmd'],
    category: 'owner',
    run: async (m, { text, prefix, cmd }) => {
        if (!m.isOwner) return m.reply('Fitur ini khusus untuk owner.')
        const target = text.trim().toLowerCase()
        if (!target) return m.reply(`Mau buka blokir perintah apa? Contoh: ${prefix + cmd} hunt`)
        const plugin = getPlugin(target)
        const canonical = plugin ? plugin.cmd[0] : target
        if (!settings.blockedCmds.includes(canonical)) return m.reply(`Perintah *${canonical}* memang lagi tidak diblokir.`)
        settings.blockedCmds = settings.blockedCmds.filter(c => c !== canonical)
        return m.reply(`Perintah *${canonical}* telah dibuka.`)
    }
}
