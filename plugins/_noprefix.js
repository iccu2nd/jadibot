import { settings } from '../lib/database.js'

export default {
    cmd: ['noprefix'],
    category: 'owner',
    run: async (m, { isOwner, prefix, cmd, text }) => {
        if (!isOwner) return m.reply('Fitur ini khusus untuk owner.')

        const current = settings.noprefix
        const input = text?.trim().toLowerCase()

        if (input !== 'on' && input !== 'off') {
            return m.reply(`*⚙️ No Prefix*\n\nStatus saat ini: *${current ? 'ON' : 'OFF'}*\n\nKetik *${prefix}${cmd} on* atau *${prefix}${cmd} off* untuk mengganti.`)
        }

        settings.noprefix = input === 'on'
        return m.reply(`✅ No prefix sekarang *${input.toUpperCase()}*.${input === 'off' ? `\n\nSemua command wajib pakai prefix lagi.` : `\n\nCommand bisa dipanggil tanpa prefix, contoh: *tt <link>*`}`)
    }
}
