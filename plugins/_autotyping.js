import { settings } from '../lib/database.js'

export default {
    cmd: ['autotyping'],
    category: 'owner',
    run: async (m, { isOwner, prefix, cmd, text }) => {
        if (!isOwner) return m.reply('Fitur ini khusus untuk owner.')

        const current = settings.autotyping
        const input = text?.trim().toLowerCase()

        if (input !== 'on' && input !== 'off') {
            return m.reply(`*Auto Typing*\n\nStatus saat ini: *${current ? 'ON' : 'OFF'}*\n\nKetik *${prefix}${cmd} on* atau *${prefix}${cmd} off* untuk mengganti.`)
        }

        settings.autotyping = input === 'on'
        return m.reply(`✅ Auto typing sekarang *${input.toUpperCase()}*.${input === 'on' ? `\n\nBot akan memberi status "mengetik..." saat memproses command.` : `\n\nStatus "mengetik..." tidak ditampilin lagi.`}`)
    }
}
