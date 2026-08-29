import yts from 'yt-search'
import axios from 'axios'
import crypto from 'crypto'
import { prepareWAMessageMedia } from '@whiskeysockets/baileys'
import sharp from 'sharp'

const TIMEOUT = 30000

const extractVideoId = (url) => {
    if (!url) return null
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
    ]
    for (const p of patterns) {
        const match = url.match(p)
        if (match) return match[1]
    }
    return null
}

const fmtDuration = (secs) => {
    if (!secs) return '0:00'
    const h = Math.floor(secs / 3600)
    const min = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${min}:${String(min).padStart(2, '0')}`
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const buildThumbnails = async (sock, url) => {
    try {
        const buffer = Buffer.from(await (await fetch(url)).arrayBuffer())
        const small = await sharp(buffer).resize(320, 180, { fit: 'cover' }).jpeg({ quality: 60 }).toBuffer()
        const large = await sharp(buffer).resize(768, 432, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer()
        const { imageMessage } = await prepareWAMessageMedia({ image: large }, { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' })
        imageMessage.width = 768
        imageMessage.height = 432
        return { small, imageMessage }
    } catch {
        return { small: null, imageMessage: null }
    }
}

const getSavetubeCdn = async () => {
    const { data } = await axios.get('https://media.savetube.vip/api/random-cdn', { timeout: TIMEOUT })
    return data.cdn
}

const decryptSavetube = (base64) => {
    const CRYPTO_KEY = 'C5D58EF67A7584E4A29F6C35BBC4EB12'
    const raw = Buffer.from(base64, 'base64')
    const iv = raw.subarray(0, 16)
    const encrypted = raw.subarray(16)
    const key = Buffer.from(CRYPTO_KEY, 'hex')
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return JSON.parse(decrypted.toString('utf-8'))
}

const savetubeDownload = async (videoUrl, quality = '128') => {
    const cdn = await getSavetubeCdn()
    const { data } = await axios.post(`https://${cdn}/v2/info`, { url: videoUrl }, { timeout: TIMEOUT })
    if (!data.status) throw new Error(data.message || 'Gagal ambil info video')

    const info = decryptSavetube(data.data)
    const { data: dl } = await axios.post(
        `https://${cdn}/download`,
        { downloadType: 'audio', quality, key: info.key },
        { timeout: TIMEOUT }
    )

    return {
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.durationLabel,
        downloadUrl: dl.data?.downloadUrl || ''
    }
}

const downloadAudio = async (ytUrl, quality = '128') => {
    const videoId = extractVideoId(ytUrl)
    if (!videoId) throw new Error('URL YouTube tidak valid')

    try {
        const result = await Promise.race([
            savetubeDownload(ytUrl, quality),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('savetube timeout')), 15000)
            )
        ])

        if (result.downloadUrl) {
            return {
                title: result.title || 'YouTube Audio',
                duration: result.duration,
                thumbnail: result.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                url: result.downloadUrl,
                source: 'savetube'
            }
        }
        throw new Error('savetube tidak mengembalikan link download')
    } catch (err) {
        throw new Error(`savetube: ${err.message}`)
    }
}

export default {
    cmd: ['play', 'musik', 'music', 'lagu'],
    category: 'downloader',
    run: async (m, { sock, text }) => {
        if (!text) return m.reply(
            '🎵 *YouTube Music Downloader*\n\n' +
            'Cara penggunaan:\n' +
            '.play [judul/link] [kualitas]\n\n' +
            'Contoh:\n' +
            '.play multo 128\n' +
            '.play https://youtu.be/xxx 320\n\n' +
            'Kualitas: 64, 128, 192, 256, 320'
        )
        await m.react('🕐')

        let quality = '128'
        let searchText = text
        const qualityMatch = text.match(/\b(64|128|192|256|320)\b/)
        if (qualityMatch) {
            quality = qualityMatch[1]
            searchText = text.replace(/\b(64|128|192|256|320)\b/, '').trim()
        }

        if (!searchText) return m.reply('Masukkan judul atau link YouTube')

        let videoId = extractVideoId(searchText)
        let video = null

        if (videoId) {
            try {
                video = await yts({ videoId })
            } catch {
                video = null
            }
        }

        if (!video) {
            const search = await yts(searchText).catch(() => null)
            video = search?.videos?.[0]
            if (!video) return m.reply('❌ Lagu tidak ditemukan')
            videoId = video.videoId
        }

        const ytUrl = `https://www.youtube.com/watch?v=${videoId}`

        let result = null
        let lastError = null

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                result = await downloadAudio(ytUrl, quality)
                break
            } catch (error) {
                lastError = error
                if (attempt < 3) await sleep(2000)
            }
        }

        if (!result?.url) {
            await m.react('❌')
            return m.reply(
                `❌ Gagal download audio.\n\n` +
                `Error: ${lastError?.message || 'Unknown error'}\n\n` +
                `Coba lagi nanti atau gunakan link lain.`
            )
        }

        const title = result.title || video.title || 'Unknown'
        const author = video.author?.name || video.author || 'YouTube'
        const durSecs = video.seconds || 0
        const duration = result.duration || fmtDuration(durSecs)
        const views = video.views ? Number(video.views).toLocaleString('id-ID') : '?'
        const thumbnail = result.thumbnail || video.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

        const previewText =
`${ytUrl}🎵 *${title}*
👤 ${author}
⏱️ ${duration}
👁️ ${views} views

_Audio sedang dikirim, mohon tunggu sebentar..._`

        const { small, imageMessage } = await buildThumbnails(sock, thumbnail).catch(() => ({ small: null, imageMessage: null }))

        try {
            await sock.sendMessage(m.from, {
                text: previewText.trim(),
                linkPreview: {
                    'matched-text': ytUrl,
                    title,
                    description: author,
                    jpegThumbnail: small,
                    highQualityThumbnail: imageMessage
                }
            }, { quoted: m })
        } catch {
            await sock.sendMessage(m.from, { text: previewText }, { quoted: m })
        }

        const audioMsg = await sock.sendAudio(m.from, result.url, true, m, {
            seconds: durSecs,
            ptt: false
        }).catch(() => null)

        if (!audioMsg) {
            await m.react('❌')
            return m.reply('❌ Gagal kirim audio, coba lagi.')
        }

        await m.react('✅')
    }
}

export { downloadAudio, savetubeDownload }
