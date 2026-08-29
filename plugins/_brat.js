import axios from 'axios'

export default {
    cmd: ['brat'],
    category: 'tools',
    run: async (m, { sock, text, config, prefix, cmd }) => {
        if (!text) return m.reply(`Masukkan teks.\nContoh: *${prefix + cmd} teks isi sendiri*`)

        await m.react('🕐')

        try {
            const url = `https://aqul-brat.hf.space/api/brat?text=${encodeURIComponent(text)}`
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 })
            const buf = Buffer.from(res.data)

            await sock.sendSticker(m.from, buf, m, {
                packname: config.packname,
                author: config.author,
                isAnimated: false
            })

            await m.react('✅')
        } catch (e) {
            await m.react('❌')
            m.reply(`❌ Gagal: ${e.message}`)
            throw e
        }
    }
}
