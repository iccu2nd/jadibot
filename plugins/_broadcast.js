export default {
    cmd: ['bc', 'broadcast'],
    category: 'owner',
    run: async (m, { sock, text }) => {
        if (!m.isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')
        if (!text) return m.reply('Masukan teks yang ingin di broadcast.\nContoh: .bc Halo semua!')

        const groupIds = Object.keys(global.db.data.chats).filter(jid => jid.endsWith('@g.us'))
        if (!groupIds.length) return m.reply('Belum ada grup yang tercatat.')

        await m.reply(`📢 Memulai broadcast ke ${groupIds.length} grup...`)

        let success = 0
        let failed = 0

        for (const jid of groupIds) {
            try {
                await sock.sendMessage(jid, { text: `📢 Broadcast\n\n${text}` })
                success++
            } catch {
                failed++
            }
            await new Promise(resolve => setTimeout(resolve, 1500))
        }

        return m.reply(`✅ Broadcast selesai.\n\n› Berhasil: ${success}\n› Gagal: ${failed}\n› Total grup: ${groupIds.length}`)
    }
}
