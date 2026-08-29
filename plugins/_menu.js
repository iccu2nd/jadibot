import { prepareWAMessageMedia } from '@whiskeysockets/baileys'
import { plugins } from '../lib/plugins.js'
import { convertToOpus } from '../lib/simple.js'
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

async function buildThumbnails(sock, url) {
    const buffer = Buffer.from(await (await fetch(url)).arrayBuffer())
    const small = await sharp(buffer).resize(320, 180, { fit: 'cover' }).jpeg({ quality: 60 }).toBuffer()
    const large = await sharp(buffer).resize(768, 432, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer()

    const { imageMessage } = await prepareWAMessageMedia(
        { image: large },
        { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }
    )
    imageMessage.width = 768
    imageMessage.height = 432

    return { small, imageMessage }
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

        const [{ small, imageMessage }, audioBuffer] = await Promise.all([
            buildThumbnails(sock, config.thumbnail),
            convertToOpus(MENU_AUDIO_URLS[Math.floor(Math.random() * MENU_AUDIO_URLS.length)]).catch((e) => { console.error(e); return null })
        ])

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

        if (audioBuffer) {
            await sock.sendMessage(m.from, {
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
            }, { quoted: m })
        }
    }
}
