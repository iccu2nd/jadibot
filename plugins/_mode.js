import { settings } from '../lib/database.js'

export default {
    cmd: ['mode', 'setmode'],
    category: 'owner',
    run: async (m, { isOwner, prefix, cmd }) => {
        if (!isOwner) return m.reply('Fitur ini khusus untuk owner.')

        const current = settings.mode

        if (!m.text) {
            return m.reply(
                `*⚙️ Mode Bot*\n\n` +
                `› Mode saat ini : *${current === 'public' ? '🌐 Public' : '🔒 Self'}*\n\n` +
                `Ketik *${prefix}${cmd} public* atau *${prefix}${cmd} self* untuk mengganti.`
            )
        }

        const input = m.text.trim().toLowerCase()

        if (input !== 'public' && input !== 'self') {
            return m.reply(`Mode tidak valid.\nGunakan: \`${prefix}${cmd} public\` atau \`${prefix}${cmd} self\``)
        }

        if (input === current) {
            return m.reply(`Bot sudah dalam mode *${current}*.`)
        }

        settings.mode = input

        return m.reply(
            `✅ Mode berhasil diubah!\n\n` +
            `› Sebelumnya : *${current === 'public' ? '🌐 Public' : '🔒 Self'}*\n` +
            `› Sekarang   : *${input === 'public' ? '🌐 Public' : '🔒 Self'}*\n\n` +
            `_Mode tersimpan, tidak akan berubah saat restart._`
        )
    }
}
