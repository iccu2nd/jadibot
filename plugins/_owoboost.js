import { getChatData } from '../lib/database.js'
import { OWOBOOST_ALLOWED, getOwoBoostStatus, fmtMs } from '../lib/owo.js'

const DURATION_UNITS = {
    detik: 1000,
    menit: 60 * 1000,
    jam: 60 * 60 * 1000,
    hari: 24 * 60 * 60 * 1000
}

function parseDuration(str) {
    if (!str) return null
    const match = str.trim().toLowerCase().match(/^(\d+)\s*(detik|menit|jam|hari)$/)
    if (!match) return null
    const [, num, unit] = match
    const ms = parseInt(num) * DURATION_UNITS[unit]
    return ms > 0 ? ms : null
}

async function hidetagAnnounce(sock, m, text) {
    if (!m.isGroup) return m.reply(text)

    const metadata = await sock.groupMetadata(m.from)
    const participants = metadata.participants.map(p => p.id)

    const fakeQuoted = {
        key: {
            participant: '0@s.whatsapp.net',
            remoteJid: 'status@broadcast',
            fromMe: false,
            id: 'Halo'
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        }
    }

    return sock.sendMessage(m.from, { text, mentions: participants }, { quoted: fakeQuoted })
}

export default {
    cmd: ['owoboost'],
    category: 'owo',
    run: async (m, { text, sock, isOwner, prefix, cmd }) => {
        if (!isOwner) return m.reply('Fitur ini khusus untuk owner bot.')
        if (!m.isGroup) return m.reply('⚠️ Boost hanya bisa diaktifkan di dalam grup, karena efeknya khusus untuk grup itu saja.')

        const chat = getChatData(m.from)
        chat.owoBoost ??= 1
        chat.owoBoostExpiry ??= 0

        const parts = text.trim().split(/\s+/).filter(Boolean)
        const sub = (parts[0] || '').toLowerCase()

        if (!sub) {
            const { active, multiplier, expiresAt } = getOwoBoostStatus(m.from)
            let out = `*🚀 OwO Boost (grup ini)*\n\n`
            out += `› Status : *${active ? `${multiplier}x AKTIF` : 'OFF (1x, normal)'}*\n`
            if (active && expiresAt) out += `› Berakhir dalam : ${fmtMs(expiresAt - Date.now())}\n`
            else if (active) out += `› Durasi : Permanen (sampai dimatikan manual)\n`
            out += `› Berlaku untuk : rare, epic, mythical, legendary, secret\n`
            out += `› Cakupan : hanya grup ini\n\n`
            out += `Gunakan:\n`
            out += `\`${prefix}${cmd} 2x/4x/8x 0\` — aktifkan boost permanen (0 = tidak ada batas waktu)\n`
            out += `\`${prefix}${cmd} 2x/4x/8x 5 menit\` — aktifkan boost pakai durasi (detik/menit/jam/hari)\n`
            out += `\`${prefix}${cmd} off\` — matikan boost`
            return m.reply(out)
        }

        if (sub === 'off') {
            if (chat.owoBoost === 1) return m.reply('Boost di grup ini memang lagi mati (1x, normal).')
            chat.owoBoost = 1
            chat.owoBoostExpiry = 0
            return hidetagAnnounce(sock, m, `⛔ *OWO BOOST DIMATIKAN*\n\nPeluang mendapatkan hewan langka di grup ini balik normal lagi.`)
        }

        const value = parseInt(sub.replace('x', ''))
        if (!OWOBOOST_ALLOWED.includes(value) || value === 1) {
            return m.reply(`⚠️ Pilihan tidak valid. Hanya bisa: 2x, 4x, 8x, atau off.\n\nContoh:\n\`${prefix}${cmd} 4x 0\` (permanen)\n\`${prefix}${cmd} 4x 1 jam\`\n\`${prefix}${cmd} off\``)
        }

        const durationStr = parts.slice(1).join(' ')
        const isPermanent = !durationStr || durationStr === '0'
        const durationMs = isPermanent ? null : parseDuration(durationStr)

        if (!isPermanent && durationMs === null) {
            return m.reply(`⚠️ Format durasi tidak dikenal. Contoh: 1 detik, 5 menit, 1 jam, 2 hari, atau 0 untuk permanen.`)
        }

        chat.owoBoost = value
        chat.owoBoostExpiry = durationMs ? Date.now() + durationMs : 0

        let announce = `🚀 *OWO BOOST AKTIF: ${value}x!*\n\n`
        announce += `Peluang mendapatkan hewan rare, epic, mythical, legendary, dan secret naik *${value}x* untuk grup ini!\n`
        announce += durationMs ? `⏳ Berlangsung selama *${fmtMs(durationMs)}*.\n` : `⏳ Berlangsung *permanen* sampai dimatikan owner.\n`
        announce += `\nSegera gunakan ${prefix}huntanimal! 🌿`

        if (durationMs) {
            setTimeout(async () => {
                if (chat.owoBoost === value && chat.owoBoostExpiry) {
                    chat.owoBoost = 1
                    chat.owoBoostExpiry = 0
                    try {
                        await hidetagAnnounce(sock, m, `⌛ *OWO BOOST ${value}x BERAKHIR*\n\nPeluang mendapatkan hewan langka di grup ini balik normal lagi.`)
                    } catch {}
                }
            }, durationMs)
        }

        return hidetagAnnounce(sock, m, announce)
    }
}
