import { settings } from '../lib/database.js'

export default {
    cmd: ['join'],
    category: 'owner',
    run: async (m, { sock, isOwner, prefix, cmd, text }) => {
        if (!isOwner) return m.reply('Fitur ini khusus untuk owner.')

        const [link, daysRaw] = text.trim().split(/\s+/)
        if (!link) return m.reply(`Format: ${prefix}${cmd} <link_grup> <hari>\nContoh: ${prefix}${cmd} https://chat.whatsapp.com/xxxxx 1`)

        const match = link.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/)
        if (!match) return m.reply('Link grup tidak valid.')

        const days = parseFloat(daysRaw) || 1

        try {
            const res = await sock.groupAcceptInvite(match[1])
            settings.scheduledLeaves[res] = Date.now() + days * 24 * 60 * 60 * 1000
            return m.reply(`✅ Berhasil join grup.\n\nBot akan keluar otomatis dalam *${days} hari*.`)
        } catch (e) {
            console.error(e)
            m.reply('Gagal join grup. Link mungkin expired atau bot sudah jadi member.')
            throw e
        }
    }
}
