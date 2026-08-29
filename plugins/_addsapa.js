import { settings } from '../lib/database.js'

export default {
    cmd: ['addsapa'],
    category: 'owner',
    description: 'Tambah user ke daftar sapa (auto disambut tiap dia chat di grup)',
    run: async (m, { sock, text }) => {
        if (!m.isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')

        const target = m.mentionedJid?.[0] || m.quoted?.sender
        if (!target) return m.reply('Tag atau reply user, lalu kasih pesan sapaannya.\nContoh: .addsapa @user Selamat datang, raja!\natau reply pesan lalu: .addsapa Selamat datang, raja!')

        const message = (m.quoted ? text : text.split(/ +/).slice(1).join(' ')).trim()
        if (!message) return m.reply('Masukan teks sapaannya.\nContoh: .addsapa @user Selamat datang, raja!')

        settings.sapaList[target] = message

        return sock.sendMessage(m.from, {
            text: `Berhasil menambahkan @${target.split('@')[0]} ke daftar sapa.\nPesan: ${message}`,
            mentions: [target]
        }, { quoted: m })
    }
}
