export default {
    cmd: ['ban'],
    category: 'owner',
    run: async (m, { sock, text }) => {
        if (!m.isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')

        const target = m.mentionedJid?.[0] || m.quoted?.sender || (text?.replace(/[^0-9]/g, '').length >= 10 ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null)
        if (!target) return m.reply('Tag, reply, atau masukan nomor.\nContoh: .ban @user\natau: .ban 628xxxx')

        if (!global.db.data.users[target]) global.db.data.users[target] = {}
        const user = global.db.data.users[target]

        if (user.banned) return m.reply(`@${target.split('@')[0]} sudah di-ban.`, { mentions: [target] })
        user.banned = true
        return sock.sendMessage(m.from, { text: `✅ @${target.split('@')[0]} telah di-ban, bot tidak akan merespon dia lagi.`, mentions: [target] }, { quoted: m })
    }
}
