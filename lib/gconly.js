import { jidNormalizedUser } from '@whiskeysockets/baileys'
import config from '../config.js'
import { getCachedGroupMetadata } from './simple.js'

const gd = global.db.data

const membershipCache = new Map()
const CACHE_TTL_MS = 60 * 1000

function isMemberOfRequiredGroup(sock, jid) {
    return getCachedGroupMetadata(sock, config.groupId)
        .then(meta => {
            if (!meta?.participants) return false
            return meta.participants.some(p => {
                const pid = p.phoneNumber ? jidNormalizedUser(p.phoneNumber) : jidNormalizedUser(p.id)
                return pid === jid
            })
        })
        .catch(() => false)
}

export async function checkGconlyAccess(sock, jid) {
    const cached = membershipCache.get(jid)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.allowed

    const allowed = await isMemberOfRequiredGroup(sock, jid)
    membershipCache.set(jid, { allowed, ts: Date.now() })
    return allowed
}

export function clearGconlyCache(jid) {
    membershipCache.delete(jid)
}

export async function notifyGconlyOnce(sock, m) {
    const user = gd.users[m.sender]
    if (user?.gconlyNotified) return

    const text = `🔒 *Akses bot dibatasi*\n\nBuat bisa pakai bot ini di private chat, Silahkan kamu wajib:\n\n1. Join grup resmi\n2. Follow saluran resmi\n\nSetelah join & follow, langsung coba kirim pesan lagi ke bot.`

    try {
        await sock.sendInteractiveButton(m.from, {
            body: text,
            footer: 'Akses private chat dibatasi',
            buttons: [
                { type: 'url', label: '👥 Join Grup', url: config.groupUrl },
                { type: 'url', label: '📢 Follow Saluran', url: config.channelUrl }
            ]
        })
    } catch (e) {
        await sock.sendMessage(m.from, {
            text: `${text}\n\nGrup: ${config.groupUrl}\nSaluran: ${config.channelUrl}`
        }).catch(() => {})
    }

    if (user) {
        user.gconlyNotified = true
    }
}
