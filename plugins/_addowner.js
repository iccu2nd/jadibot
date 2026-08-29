import { settings } from '../lib/database.js'

export default {
    cmd: ['addowner', 'delowner'],
    category: 'owner',
    run: async (m, { sock, text, cmd }) => {
        if (!m.isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')

        const target = m.mentionedJid?.[0] || m.quoted?.sender || (text?.replace(/[^0-9]/g, '').length >= 10 ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null)
        if (!target) return m.reply(`Tag, reply, atau masukan nomor.\nContoh: .${cmd} @user\natau: .${cmd} 628xxxx`)

        if (cmd === 'addowner') {
            if (settings.extraOwners.includes(target)) return m.reply(`@${target.split('@')[0]} sudah menjadi owner.`)
            settings.extraOwners.push(target)
            return sock.sendMessage(m.from, { text: `✅ @${target.split('@')[0]} berhasil ditambahkan sebagai owner.`, mentions: [target] }, { quoted: m })
        }

        if (!settings.extraOwners.includes(target)) return m.reply('User tersebut bukan owner tambahan.')
        settings.extraOwners = settings.extraOwners.filter(j => j !== target)
        return sock.sendMessage(m.from, { text: `✅ @${target.split('@')[0]} telah dihapus dari daftar owner.`, mentions: [target] }, { quoted: m })
    }
}
