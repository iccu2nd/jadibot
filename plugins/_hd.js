import axios from 'axios'
import * as cheerio from 'cheerio'
import FormData from 'form-data'

export default {
    cmd: ['hd', 'hdr'],
    category: 'tools',
    run: async (m, { sock, config, prefix }) => {
        const buffer = await m.download().catch(() => null)

        if (buffer && /video/.test(buffer.mimetype)) {
            return m.reply(`Yang di-reply itu video. Pakai *${prefix}hdvid* buat upscale video ya.`)
        }

        if (!buffer || !/image/.test(buffer.mimetype)) {
            return m.reply(
                `⌗ *HD Image Upscaler*\n\n` +
                `Upscale gambar jadi lebih HD.\n\n` +
                `› *${prefix}hd* (reply gambar) - Upscale 2x\n` +
                `› *${prefix}hdr* (reply gambar) - Upscale 4x\n\n` +
                `> *${config.botName}*`
            )
        }

        await m.react('⏳')

        try {
            const scale = m.body.toLowerCase().includes('hdr') ? 4 : 2
            const result = await hdr(buffer, scale)

            await sock.sendImage(m.from, Buffer.from(result), `✅ Upscale ${scale}x selesai!`, m)
            await m.react('✅')
        } catch (e) {
            console.error('HD Error:', e)
            await m.react('❌')
            const network = isNetworkError(e)
            const friendly = network
                ? 'Server upscaler lagi susah dihubungi (semua server dicoba tapi gagal). Coba lagi beberapa saat lagi ya.'
                : e.message
            m.reply(`❌ Gagal: ${friendly}`)
            if (!network) throw e
        }
    }
}

const REQUEST_TIMEOUT = 20000
const NETWORK_ERROR_CODES = ['ETIMEDOUT', 'ECONNABORTED', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET']

function isNetworkError(e) {
    return NETWORK_ERROR_CODES.includes(e?.code) || /timeout/i.test(e?.message || '')
}

function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

async function getToken() {
    const html = await axios.get('https://www.iloveimg.com/upscale-image', { timeout: REQUEST_TIMEOUT })
    const $ = cheerio.load(html.data)
    const script = $('script').filter((i, el) => $(el).html().includes('ilovepdfConfig =')).html()
    const json = JSON.parse(script.split('ilovepdfConfig = ')[1].split(';')[0])
    const csrf = $('meta[name="csrf-token"]').attr('content')
    return { token: json.token, csrf }
}

async function uploadImage(server, headers, buffer, task) {
    const form = new FormData()
    form.append('name', 'image.jpg')
    form.append('chunk', '0')
    form.append('chunks', '1')
    form.append('task', task)
    form.append('preview', '1')
    form.append('file', buffer, 'image.jpg')

    const res = await axios.post(`https://${server}.iloveimg.com/v1/upload`, form, {
        headers: { ...headers, ...form.getHeaders() },
        timeout: REQUEST_TIMEOUT
    })
    return res.data
}

async function upscaleOnServer(server, headers, buffer, task, scale) {
    const upload = await uploadImage(server, headers, buffer, task)

    const form = new FormData()
    form.append('task', task)
    form.append('server_filename', upload.server_filename)
    form.append('scale', scale)

    const res = await axios.post(`https://${server}.iloveimg.com/v1/upscale`, form, {
        headers: { ...headers, ...form.getHeaders() },
        responseType: 'arraybuffer',
        timeout: REQUEST_TIMEOUT
    })

    return res.data
}

async function hdr(buffer, scale = 4) {
    const { token, csrf } = await getToken()
    const servers = shuffle(['api1g', 'api2g', 'api3g', 'api8g', 'api9g', 'api10g', 'api11g', 'api12g'])
    const task = 'r68zl88mq72xq94j2d5p66bn2z9lrbx20njsbw2qsAvgmzr11lvfhAx9kl87pp6yqgx7c8vg7sfbqnrr42qb16v0gj8jl5s0kq1kgp26mdyjjspd8c5A2wk8b4Adbm6vf5tpwbqlqdr8A9tfn7vbqvy28ylphlxdl379psxpd8r70nzs3sk1'

    const headers = {
        'Authorization': 'Bearer ' + token,
        'Origin': 'https://www.iloveimg.com/',
        'Cookie': '_csrf=' + csrf,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    let lastError
    for (const server of servers) {
        try {
            return await upscaleOnServer(server, headers, buffer, task, scale)
        } catch (e) {
            lastError = e
            if (!isNetworkError(e)) throw e
            console.error(`HD server ${server} gagal (${e.code || e.message}), coba server lain...`)
        }
    }
    throw lastError
}
