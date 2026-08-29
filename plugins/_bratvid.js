import axios from 'axios'

export default {
    cmd: ['bratvid', 'bratv'],
    category: 'tools',
    run: async (m, { sock, text, prefix, cmd }) => {
        if (!text) return m.reply(`Masukkan teks.\nContoh: *${prefix}${cmd} mruy sangat*`)

        await m.react('🕐')

        try {
            const url = `https://skyzxu-brat.hf.space/brat-animated?text=${encodeURIComponent(text)}`
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
            const buf = Buffer.from(res.data)

            await sock.sendSticker(m.from, buf, m, {
                packname: 'Nerd Bot',
                author: 'bratvid',
                isAnimated: true
            })

            await m.react('✅')
        } catch (e) {
            await m.react('❌')
            m.reply(`❌ Gagal: ${e.message}`)
            throw e
        }
    }
}
