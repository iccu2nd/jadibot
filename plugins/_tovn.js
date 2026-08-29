import { convertToOpus } from '../lib/simple.js'

export default {
    cmd: ['tovn'],
    category: 'tools',
    run: async (m, { sock }) => {
        if (!m.quoted) return m.reply('Reply ke pesan video atau audio terlebih dahulu.')

        const buffer = await m.download().catch(() => null)
        if (!buffer || !/audio|video/.test(buffer.mimetype)) {
            return m.reply('Hanya bisa digunakan pada pesan video atau audio.')
        }

        await m.react('⏳')

        try {
            const opus = await convertToOpus(buffer)
            await sock.sendMessage(m.from, {
                audio: opus,
                ptt: true,
                mimetype: 'audio/ogg; codecs=opus'
            }, { quoted: m })

            await m.react('✅')
        } catch (e) {
            console.error(e)
            await m.react('❌')
            m.reply('Gagal mengkonversi media.')
            throw e
        }
    }
}
