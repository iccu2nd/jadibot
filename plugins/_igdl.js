import axios from 'axios'

async function getInstagramInfo(url) {
    const encoded = encodeURIComponent(url)
    const apiUrl = `https://igdl.net/api/public/ig-info?url=${encoded}`
    const response = await axios.get(apiUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
            'Referer': 'https://igdl.net/'
        }
    })
    return response.data
}

export default {
    cmd: ['ig', 'igdl', 'instagramdl'],
    category: 'downloader',
    run: async (m, { sock, text, prefix, cmd}) => {
        if (!text) return m.reply(`Masukkan URL Instagram\nContoh: ${prefix + cmd} https://www.instagram.com/reel/...`)
        const url = text.trim()
        if (!url.includes('instagram.com')) return m.reply('URL harus Instagram')

        await m.reply('Sedang memproses...')
        try {
            const info = await getInstagramInfo(url)
            if (!info || !info.kind) throw new Error('Gagal mendapatkan informasi')

            const { kind, videos, images, caption, author, handle } = info
            let mediaUrl = null
            if (kind === 'video' && videos && videos.length > 0) {
                mediaUrl = videos[0].url
            } else if (images && images.length > 0) {
                const sorted = images.sort((a, b) => (b.width || 0) - (a.width || 0))
                mediaUrl = sorted[0].url
            }
            if (!mediaUrl) throw new Error('Tidak ada media ditemukan')

            const mediaRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 30000 })
            const buffer = Buffer.from(mediaRes.data)

            let captionText = ''
            if (author || handle) {
                captionText += `*${author || handle}*`
                if (handle) captionText += ` (@${handle})`
                captionText += '\n'
            }
            if (caption) captionText += `${caption}\n`
            captionText += `\n${url}`

            if (kind === 'video') {
                await sock.sendMessage(m.chat, { video: buffer, caption: captionText }, { quoted: m })
            } else {
                await sock.sendMessage(m.chat, { image: buffer, caption: captionText }, { quoted: m })
            }
        } catch (e) {
            m.reply(`Error: ${e.message}`)
            throw e
        }
    }
}
