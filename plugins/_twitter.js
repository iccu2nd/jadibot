import axios from 'axios'
import * as cheerio from 'cheerio'

const SSSX_BASE = 'https://sssx.io'
const SSSX_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
}

const sssx = async (url, locale = 'en') => {
    const { data: home } = await axios.get(SSSX_BASE, { headers: SSSX_HEADERS })

    const includeVals =
        home.match(/include-vals="([^"]+)"/)?.[1] ||
        cheerio.load(home)('form').attr('include-vals') ||
        ''

    const tt = includeVals.match(/tt['"]?\s*:\s*['"]([a-f0-9]{32})/i)?.[1]
    const ts = includeVals.match(/ts\s*:\s*(\d+)/)?.[1]

    if (!tt || !ts) throw new Error('Gagal mengambil token dari sssx.io')

    const body = new URLSearchParams({ id: url, locale, tt, ts, source: 'form' })

    const { data } = await axios.post(SSSX_BASE, body.toString(), {
        headers: {
            ...SSSX_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'HX-Request': 'true',
            'HX-Target': 'target',
            'HX-Current-URL': SSSX_BASE + '/',
            Origin: SSSX_BASE,
            Referer: SSSX_BASE + '/'
        }
    })

    const $ = cheerio.load(data)
    const downloads = $('a.download_link.download-btn').map((_, el) => ({
        quality: $(el).text().replace(/Download/i, '').trim(),
        url: $(el).attr('href'),
        directUrl: $(el).attr('data-directurl') || null
    })).get()

    return { success: downloads.length > 0, downloads }
}

export default {
    cmd: ['twitter', 'twt', 'x', 'xdl'],
    category: 'downloader',
    description: 'Download video dari Twitter/X',

    run: async (m, { sock, text, config }) => {
        if (!text) return m.reply('Masukkan URL Twitter/X yang valid!')
        if (!/twitter\.com|x\.com/.test(text)) return m.reply('Link tidak valid!')

        await m.react('⏳')

        try {
            const res = await sssx(text)
            if (!res.success) {
                await m.react('❌')
                return m.reply('Gagal mendapatkan link download.')
            }

            const video = res.downloads.find(v => /hd/i.test(v.quality)) || res.downloads[0]
            const videoUrl = video.directUrl || video.url

            const { data: stream } = await axios.get(videoUrl, {
                headers: SSSX_HEADERS,
                responseType: 'stream'
            })

            let caption = `⌗ *Twitter Downloader*\n\n`
            caption += `› *Kualitas:* ${video.quality || 'Default'}\n\n`
            caption += `> *${config.botName}*`

            await sock.sendMessage(m.from, {
                video: { stream },
                caption
            }, { quoted: m })

            await m.react('✅')
        } catch (e) {
            console.error(e)
            await m.react('❌')
            m.reply('Terjadi kesalahan saat mengunduh video Twitter.')
            throw e
        }
    }
}
