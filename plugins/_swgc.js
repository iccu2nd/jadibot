import { convertToOpus } from '../lib/simple.js'

export default {
    cmd: ['swgc'],
    category: 'tools',
    run: async (m, { sock, isAdmin }) => {
        if (!m.isGroup) return m.reply("Khusus di dalam grup!")
        if (!isAdmin) return m.reply("Hanya admin grup yang bisa menggunakan perintah ini!")

        const colorMap = { 'biru': '0xff26c4dc', 'merah': '0xffff0000', 'hijau': '0xff00ff00', 'kuning': '0xffffff00', 'hitam': '0xff000000' }
        let bgColor = colorMap['biru']
        let text = m.text.trim()

        if (text.includes('--color:')) {
            let col = text.split('--color:')[1].trim().split(' ')[0]
            bgColor = colorMap[col] || `0xff${col.replace('#', '')}`
            text = text.replace(`--color:${col}`, '').replace('--color:', '').trim()
        }

        try {
            let content = { contextInfo: { isGroupStatus: true, remoteJid: m.from } }

            const buffer = await m.download().catch(() => null)
            if (buffer && /image|video|audio/.test(buffer.mimetype)) {
                if (/audio/.test(buffer.mimetype)) {
                    content.audio = await convertToOpus(buffer)
                    content.ptt = true
                    content.mimetype = 'audio/ogg; codecs=opus'
                    content.waveform = new Uint8Array(64).fill(10)
                } else if (/video/.test(buffer.mimetype)) {
                    content.video = buffer
                    content.caption = text || undefined
                } else {
                    content.image = buffer
                    content.caption = text || undefined
                }
            } else {
                if (!text) return m.reply("Teksnya mana?")
                content.text = text
            }

            await sock.sendMessage(m.from, content, { backgroundColor: bgColor })
            return m.reply("Status Grup Berhasil Dikirim!")
        } catch (e) {
            console.error(e)
            m.reply("Terjadi kesalahan.")
            throw e
        }
    }
}
