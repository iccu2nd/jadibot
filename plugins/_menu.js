import { prepareWAMessageMedia } from '@whiskeysockets/baileys'
import { plugins } from '../lib/plugins.js'
import { convertToOpus } from '../lib/simple.js'
import axios from 'axios'
import sharp from 'sharp'

const fmt = { timeZone: 'Asia/Jakarta' }
const MENU_AUDIO_URLS = ['https://u.pone.rs/iufkcojw.mpeg', 'https://u.pone.rs/pyobvjww.mpeg', 'https://u.pone.rs/ksojqhtv.mpeg', 'https://u.pone.rs/ofuewsnv.mpeg', 'https://u.pone.rs/bffdhlgx.mpeg', 'https://u.pone.rs/hbisizuc.mpeg', 'https://u.pone.rs/dfyjmdeo.mpeg', 'https://u.pone.rs/izcqpaxe.mpeg', 'https://u.pone.rs/huqaojnk.mpeg', 'https://u.pone.rs/idjzwnmy.mpeg', "https://u.pone.rs/qwrtfpuc.mpeg", "https://u.pone.rs/iqlhhcim.mpeg"]

function getGreeting() {
    const hour = parseInt(new Intl.DateTimeFormat('id-ID', { ...fmt, hour: 'numeric', hour12: false }).format(new Date()))
    if (hour < 11) return 'Pagi !'
    if (hour < 15) return 'Siang !'
    if (hour < 18) return 'Sore !'
    return 'Malam !'
}

function getDate() {
    return new Intl.DateTimeFormat('id-ID', { ...fmt, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
}

function getRuntime() {
    const s = Math.floor(process.uptime())
    return `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m ${s % 60}s`
}

function groupByCategory() {
    const categories = {}
    for (const [, plugin] of plugins) {
        if (!plugin.cmd || !plugin.cmd.length) continue
        const name = plugin.category || 'others'
        categories[name] = categories[name] || []
        categories[name].push(plugin)
    }
    return categories
}

function buildBoxList(items) {
    return items.map((item, i) => {
        const edge = i === 0 ? '┌' : (i === items.length - 1 ? '└' : '│')
        return `${edge}  ◦  ${item}`
    }).join('\n')
}

// Cache thumbnail per URL selama 1 jam. Sebelumnya thumbnail didownload +
// di-resize ulang SETIAP kali .menu dipanggil -> ini penyumbang utama delay.
const THUMB_TTL_MS = 60 * 60 * 1000
const thumbCache = new Map()

async function buildThumbnails(sock, url) {
    const cached = thumbCache.get(url)
    if (cached && Date.now() - cached.fetchedAt < THUMB_TTL_MS) return cached

    const buffer = Buffer.from(await (await fetch(url)).arrayBuffer())
    const small = await sharp(buffer).resize(320, 180, { fit: 'cover' }).jpeg({ quality: 60 }).toBuffer()
    const large = await sharp(buffer).resize(768, 432, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer()

    const { imageMessage } = await prepareWAMessageMedia(
        { image: large },
        { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }
    )
    imageMessage.width = 768
    imageMessage.height = 432

    const result = { small, imageMessage, fetchedAt: Date.now() }
    thumbCache.set(url, result)
    return result
}

async function fetchAudioBuffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 6000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
        }
    })
    const buffer = Buffer.from(res.data)
    const contentType = String(res.headers['content-type'] || '')
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
        throw new Error(`bukan file audio (content-type: ${contentType})`)
    }
    if (buffer.length < 5000) throw new Error(`file terlalu kecil (${buffer.length} bytes)`)
    return buffer
}

// Dulu: coba sampe 4 URL berurutan, masing-masing timeout 15 detik ->
// worst case bisa nunggu ~60 detik SEBELUM pesan menu utama kekirim, karena
// ini di-await bareng buildThumbnails() sebelum sendMessage pertama.
// Sekarang: cuma 1 percobaan cepat, dan dipanggil SETELAH menu utama
// terkirim (lihat run()), jadi kalau gagal/lambat, itu gak nunda balasan.
async function getMenuAudioOpus() {
    const url = MENU_AUDIO_URLS[Math.floor(Math.random() * MENU_AUDIO_URLS.length)]
    try {
        const buffer = await fetchAudioBuffer(url)
        return await convertToOpus(buffer)
    } catch (e) {
        console.error(`menu audio gagal (${url}):`, e.message)
        return null
    }
}

export default {
    cmd: ['menu', 'allmenu', 'help'],
    category: 'main',
    run: async (m, { sock, config, text, cmd }) => {
        const greeting = getGreeting()
        const categories = groupByCategory()
        const categoryNames = Object.keys(categories).sort()
        const totalCommands = Object.values(categories).flat().length
        const sender = m.sender.split('@')[0]

        if (cmd === 'allmenu' || text.toLowerCase() === 'all') {
            let list = `*DAFTAR SEMUA MENU*\n\nHi, @${sender}\nSelamat ${greeting}\n\nTotal ${totalCommands} perintah.\n\n`
            list += categoryNames.map(name =>
                `*${name.toUpperCase()}*\n` + buildBoxList(categories[name].map(p => `.${p.cmd[0]}`))
            ).join('\n\n')
            return m.reply(list, { mentions: [m.sender] })
        }

        const selected = text.toLowerCase()
        if (text && categories[selected]) {
            const list = `*Kategori: ${selected.charAt(0).toUpperCase() + selected.slice(1)}*\n\nHi, @${sender}\nSelamat ${greeting}\n\n` +
                buildBoxList(categories[selected].map(p => `.${p.cmd[0]}`))
            return m.reply(list, { mentions: [m.sender] })
        }

        const caption = `Hi, @${sender}\nSelamat ${greeting}\n\n` +
            `➤ *Tanggal:* ${getDate()}\n` +
            `➤ *Runtime:* ${getRuntime()}\n` +
            `➤ *Total Fitur:* ${totalCommands}\n` +
            `➤ *Total Kategori:* ${categoryNames.length}\n` +
            `➤ *Prefix:* [ ., /, #, ! ]\n\n` +
            `*Daftar Menu:*\n• .menu all\n` +
            categoryNames.map(name => `• .menu ${name}`).join('\n')

        const { small, imageMessage } = await buildThumbnails(sock, config.thumbnail)

        await sock.sendMessage(m.from, {
            text: `${config.groupUrl}\n${caption}\n`,
            mentions: [m.sender],
            linkPreview: {
                'matched-text': config.groupUrl,
                title: config.title,
                description: '',
                jpegThumbnail: small,
                highQualityThumbnail: imageMessage
            }
        }, { quoted: m })

        // Voice note dikirim belakangan, gak di-await -> gagal/lambat di sini
        // gak akan pernah bikin balasan .menu ketunda.
        getMenuAudioOpus().then(audioBuffer => {
            if (!audioBuffer) return
            sock.sendMessage(m.from, {
                audio: audioBuffer,
                ptt: true,
                mimetype: 'audio/ogg; codecs=opus',
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.idch,
                        newsletterName: config.body,
                        serverMessageId: 1
                    }
                }
            }, { quoted: m }).catch(() => {})
        }).catch(() => {})
    }
}