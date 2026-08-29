import { settings } from '../lib/database.js'

export default {
    cmd: ['autoread'],
    category: 'owner',
    run: async (m, { isOwner, prefix, cmd, text }) => {
        if (!isOwner) return m.reply('Fitur ini khusus untuk owner.')

        const current = settings.autoread
        const input = text?.trim().toLowerCase()

        if (input !== 'on' && input !== 'off') {
            return m.reply(`*Auto Read*\n\nStatus saat ini: *${current ? 'ON' : 'OFF'}*\n\nKetik *${prefix}${cmd} on* atau *${prefix}${cmd} off* untuk mengganti.`)
        }

        settings.autoread = input === 'on'
        return m.reply(`✅ Auto read sekarang *${input.toUpperCase()}*.${input === 'on' ? `\n\nSemua pesan masuk bakal otomatis dibaca (centang biru).` : `\n\nPesan masuk tidak otomatis dibaca lagi.`}`)
    }
}
