import { settings } from '../lib/database.js'

export default {
    cmd: ['delsapa'],
    category: 'owner',
    description: 'Hapus user dari daftar sapa',
    run: async (m, { sock, text }) => {
        if (!m.isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')

        let target = m.mentionedJid?.[0] || m.quoted?.sender

        if (!target && text.trim()) {
            const list = Object.keys(settings.sapaList)
            const idx = parseInt(text.trim()) - 1
            if (list[idx]) target = list[idx]
        }

        if (!target) return m.reply('Tag, reply, atau masukan nomor urut dari .listsapa.\nContoh: .delsapa @user\natau: .delsapa 2')
        if (!settings.sapaList[target]) return m.reply('User tersebut tidak ada di daftar sapa.')

        delete settings.sapaList[target]

        return sock.sendMessage(m.from, {
            text: `Berhasil menghapus @${target.split('@')[0]} dari daftar sapa.`,
            mentions: [target]
        }, { quoted: m })
    }
}
