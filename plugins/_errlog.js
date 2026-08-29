import { settings } from '../lib/database.js'

export default {
    cmd: ['err', 'errlog'],
    category: 'owner',
    run: async (m, { isOwner, prefix, cmd, text }) => {
        if (!isOwner) return m.reply('Fitur ini khusus untuk owner.')

        const current = settings.errorReport
        const input = text?.trim().toLowerCase()

        if (input !== 'on' && input !== 'off') {
            return m.reply(`Error Report ke Owner\n\nStatus saat ini: ${current ? 'ON' : 'OFF'}\n\nKetik ${prefix}${cmd} on atau ${prefix}${cmd} off untuk mengganti.`)
        }

        settings.errorReport = input === 'on'
        return m.reply(`Error report sekarang ${input.toUpperCase()}.${input === 'on' ? '\n\nLog error plugin akan dikirim ke owner lagi.' : '\n\nLog error plugin tidak dikirim ke owner.'}`)
    }
}
