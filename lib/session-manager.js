import crypto from 'crypto'
import { EventEmitter } from 'events'
import makeWASocket, {
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    jidNormalizedUser
} from '@whiskeysockets/baileys'
import pino from 'pino'
import chalk from 'chalk'
import wrapSocket, { groupMetadataCache } from './simple.js'
import { handleMessage, onGroupsUpdate, onParticipantsUpdate, syncAllGroups } from '../handler.js'
import { getAllCommandEntries } from './plugins.js'
import { getDb } from './mongo.js'
import { useMongoAuthState, removeMongoAuthState } from './mongo-auth-state.js'
import config from '../config.js'

// Semua event penting dari session manager dilempar lewat sini, dipakai
// oleh dashboard web (server.js) maupun command WA (plugins/_jadibot.js).
// Event: 'pairing-code' { number, code }
//        'status'       { number, status, session }
//        'settings'     { number, settings }
export const events = new EventEmitter()
events.setMaxListeners(0)

const STATE_COLLECTION = 'bot_state'
const STATE_DOC_ID = 'jadibot'

// Disiapkan sinkron dulu (kosong), lalu di-merge in-place dari MongoDB lewat
// initSessionStore() — sama seperti pola di lib/database.js.
let jadibotDb = { sessions: {} }
let storeReady = false

export async function initSessionStore() {
    if (storeReady) return
    const db = await getDb()
    const doc = await db.collection(STATE_COLLECTION).findOne({ _id: STATE_DOC_ID })
    if (doc?.sessions) Object.assign(jadibotDb.sessions, doc.sessions)
    storeReady = true
}

function saveDb() {
    getDb()
        .then(db => db.collection(STATE_COLLECTION).replaceOne(
            { _id: STATE_DOC_ID },
            { _id: STATE_DOC_ID, sessions: jadibotDb.sessions },
            { upsert: true }
        ))
        .catch(e => console.error(chalk.redBright('Gagal menyimpan sesi jadibot ke MongoDB:'), e.message))
}

function defaultSettings() {
    return { ownerNumber: null, autoread: false, autotyping: false }
}

export const activeSessions = new Map()
const stoppingNumbers = new Set()
const linkDeadlines = new Map()
const notifiedConnected = new Set()
const notifiedTrouble = new Set()
const adsTimers = new Map()
const reconnectAttempts = new Map()

const LINK_TIMEOUT_MS = 3 * 60 * 1000
const RECONNECT_BASE_DELAY_MS = 3000
const RECONNECT_MAX_DELAY_MS = 30000
const RECONNECT_TROUBLE_NOTICE_AT = 5
const IDLE_SESSION_MS = 3 * 24 * 60 * 60 * 1000
const IDLE_CHECK_INTERVAL_MS = 30 * 60 * 1000
const RESTORE_STAGGER_MS = 4000
let restored = false

// Fallback dipakai kalau fetchLatestBaileysVersion gagal/timeout (mis. jaringan hosting yang dibatasi).
const FALLBACK_BAILEYS_VERSION = [2, 3000, 1023223821]
let cachedBaileysVersion = null

async function resolveBaileysVersion() {
    if (cachedBaileysVersion) return cachedBaileysVersion
    try {
        const { version, isLatest } = await Promise.race([
            fetchLatestBaileysVersion(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ambil versi Baileys')), 10000))
        ])
        cachedBaileysVersion = version
        if (!isLatest) console.log(chalk.yellowBright('Versi Baileys yang dipakai bukan versi terbaru, tapi tetap dilanjutkan.'))
    } catch (e) {
        console.error(chalk.yellowBright('Gagal ambil versi Baileys terbaru, pakai versi fallback:'), e.message)
        cachedBaileysVersion = FALLBACK_BAILEYS_VERSION
    }
    return cachedBaileysVersion
}

const ADS_CHANNEL_URL = config.channelUrl
const ADS_GROUP_URL = config.groupUrl
const ADS_INTERVAL_MS = 8 * 60 * 60 * 1000
const ADS_TEXTS = [`Bot ini dibuat pakai *${config.botName}*.`]
const ADS_SEND_DELAY_MS = 1500

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function clearAdsTimer(number) {
    const t = adsTimers.get(number)
    if (t) { clearTimeout(t); adsTimers.delete(number) }
}

async function sendAdsOnce(number) {
    const entry = activeSessions.get(number)
    if (!entry || entry.status !== 'connected' || !entry.sock) return 0
    try {
        const groups = await entry.sock.groupFetchAllParticipating()
        const groupIds = Object.keys(groups || {})
        if (!groupIds.length) return 0
        let sentCount = 0
        for (const targetId of groupIds) {
            const text = ADS_TEXTS[Math.floor(Math.random() * ADS_TEXTS.length)]
            const ok = await entry.sock.sendInteractiveButton(targetId, {
                body: text,
                footer: config.botName,
                buttons: [
                    { type: 'url', label: '📢 Saluran WhatsApp', url: ADS_CHANNEL_URL },
                    { type: 'url', label: '👥 Grup WhatsApp', url: ADS_GROUP_URL }
                ]
            }).then(() => true).catch(() => false)
            if (ok) sentCount++
            await sleep(ADS_SEND_DELAY_MS)
        }
        return sentCount
    } catch (e) {
        return 0
    }
}

function scheduleAds(number) {
    clearAdsTimer(number)
    const t = setTimeout(async () => {
        adsTimers.delete(number)
        const entry = activeSessions.get(number)
        if (!entry || entry.status !== 'connected') return
        await sendAdsOnce(number)
        scheduleAds(number)
    }, ADS_INTERVAL_MS)
    adsTimers.set(number, t)
}

function clearLinkDeadline(number) {
    const t = linkDeadlines.get(number)
    if (t) { clearTimeout(t); linkDeadlines.delete(number) }
}

function scheduleLinkDeadline(number, requesterJid, mainSock) {
    clearLinkDeadline(number)
    const t = setTimeout(async () => {
        linkDeadlines.delete(number)
        const current = activeSessions.get(number)
        if (current && current.status === 'connected') return

        stoppingNumbers.add(number)
        notifiedConnected.delete(number)
        if (current?.sock) { try { current.sock.end?.(new Error('link timeout')) } catch (e) {} }
        activeSessions.delete(number)
        delete jadibotDb.sessions[number]
        saveDb()
        removeMongoAuthState(`jadibot:${number}`).catch(() => {})
        events.emit('status', { number, status: 'expired' })

        if (mainSock && requesterJid) {
            mainSock.sendMessage(requesterJid, { text: `Sesi jadibot ${number} dihapus otomatis karena tidak ditautkan dalam 3 menit.` }).catch(() => {})
        }
    }, LINK_TIMEOUT_MS)
    linkDeadlines.set(number, t)
}

export function formatNumber(raw) {
    if (!raw) return null
    let digits = String(raw).replace(/[^0-9]/g, '')
    if (!digits) return null
    if (digits.startsWith('0')) digits = '62' + digits.slice(1)
    if (digits.length < 8 || digits.length > 15) return null
    return digits
}

function extractQuickText(message) {
    if (!message) return ''
    return message.conversation
        || message.extendedTextMessage?.text
        || message.imageMessage?.caption
        || message.videoMessage?.caption
        || message.buttonsResponseMessage?.selectedButtonId
        || message.listResponseMessage?.singleSelectReply?.selectedRowId
        || ''
}

const HARD_BLOCKED_CMDS = new Set([
    'jadibot', 'jb',
    'backup', 'grep', 'grepplugin', 'gh', 'gp', 'sf', 'sf2',
    'restart', 'eval', 'exec', 'shell', 'sh', 'update', 'debug'
])

function isBlockedForChild(text) {
    const trimmed = text.trim()
    if (!trimmed) return false
    if (/^(=>|>|\$)/.test(trimmed)) return true
    const prefixes = ['.', '/', '#', '!']
    const p = prefixes.find(pr => trimmed.startsWith(pr))
    const body = p ? trimmed.slice(p.length).trim() : trimmed
    const cmd = body.split(/ +/)[0]?.toLowerCase()
    if (!cmd) return false
    if (HARD_BLOCKED_CMDS.has(cmd)) return true
    const ownerCmds = getAllCommandEntries().filter(e => e.category === 'owner').map(e => e.cmd)
    return ownerCmds.includes(cmd)
}

async function guardedHandle(childSock, event) {
    const entry = activeSessions.get(childSock.jadibotNumber)
    if (entry) entry.lastActivity = Date.now()
    try {
        const raw = event?.messages?.[0]
        if (raw?.message && !raw.key?.fromMe) {
            const text = extractQuickText(raw.message)
            if (text && isBlockedForChild(text)) return
        }
    } catch (e) {}
    return handleMessage(childSock, config, event)
}

async function createChildSocket(number) {
    const { state, saveCreds } = await useMongoAuthState(`jadibot:${number}`)
    const version = await resolveBaileysVersion()
    const silentLogger = pino({ level: 'silent' })

    const childSock = makeWASocket({
        version,
        logger: silentLogger,
        printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, silentLogger) },
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: false,
        cachedGroupMetadata: async (jid) => groupMetadataCache.get(jid),
        syncFullHistory: false,
    })

    childSock.isJadibotSession = true
    childSock.jadibotNumber = number
    // Referensi object yang sama dipakai di jadibotDb.sessions[number].settings,
    // jadi perubahan lewat updateSessionSettings() langsung kepakai tanpa perlu rewire socket.
    childSock.jadibotSettings = jadibotDb.sessions[number]?.settings || defaultSettings()

    return { childSock, saveCreds }
}

async function stopSession(number) {
    clearLinkDeadline(number)
    clearAdsTimer(number)
    notifiedConnected.delete(number)
    notifiedTrouble.delete(number)
    reconnectAttempts.delete(number)
    stoppingNumbers.add(number)
    const entry = activeSessions.get(number)
    if (entry?.sock) {
        try {
            if (entry.status === 'connected') await entry.sock.logout()
            else entry.sock.end?.(new Error('stopped'))
        } catch (e) {}
    }
    activeSessions.delete(number)
    delete jadibotDb.sessions[number]
    saveDb()
    await removeMongoAuthState(`jadibot:${number}`).catch(() => {})
    events.emit('status', { number, status: 'stopped' })
}

async function checkIdleSessions() {
    const now = Date.now()
    for (const [number, entry] of [...activeSessions]) {
        if (entry.status !== 'connected') continue
        const last = entry.lastActivity || entry.connectedAt || now
        if (now - last < IDLE_SESSION_MS) continue

        const requesterJid = entry.requesterJid
        const mainSock = entry.mainSock
        await stopSession(number)
        if (mainSock && requesterJid) {
            mainSock.sendMessage(requesterJid, { text: `Sesi jadibot ${number} dihapus otomatis karena tidak ada aktivitas sama sekali selama ${Math.round(IDLE_SESSION_MS / 86400000)} hari.` }).catch(() => {})
        }
    }
}
setInterval(() => { checkIdleSessions().catch(() => {}) }, IDLE_CHECK_INTERVAL_MS)

/**
 * Mulai (atau lanjutkan) sesi jadibot untuk sebuah nomor.
 * requesterJid + mainSock opsional — dipakai kalau sesi dibuat dari command WA
 * supaya bisa dikirimi notifikasi. Untuk sesi yang dibuat dari dashboard web,
 * keduanya boleh null; kode pairing & status diambil lewat events/getSession().
 */
async function startChildSession(number, requesterJid = null, mainSock = null) {
    if (activeSessions.has(number)) return activeSessions.get(number)

    const existingSettings = jadibotDb.sessions[number]?.settings || defaultSettings()

    const { childSock, saveCreds } = await createChildSocket(number)
    await wrapSocket(childSock)

    const entry = { sock: childSock, number, requesterJid, mainSock, status: 'connecting', connectedAt: null, lastActivity: Date.now() }
    activeSessions.set(number, entry)

    jadibotDb.sessions[number] = {
        number,
        ownerJid: requesterJid,
        status: 'connecting',
        connectedAt: jadibotDb.sessions[number]?.connectedAt || null,
        notified: jadibotDb.sessions[number]?.notified === true,
        accessToken: jadibotDb.sessions[number]?.accessToken || crypto.randomBytes(24).toString('hex'),
        pairingCode: null,
        settings: existingSettings
    }
    saveDb()
    events.emit('status', { number, status: 'connecting' })

    if (!childSock.authState.creds.registered) {
        try {
            await new Promise(r => setTimeout(r, 1500))
            let code
            try {
                code = await childSock.requestPairingCode(number)
            } catch (e) {
                await new Promise(r => setTimeout(r, 3000))
                code = await childSock.requestPairingCode(number)
            }

            jadibotDb.sessions[number].pairingCode = code
            saveDb()
            events.emit('pairing-code', { number, code })

            if (mainSock && requesterJid) {
                await mainSock.sendInteractiveButton(requesterJid, {
                    body: `Kode pairing untuk ${number}:\n\n*${code}*\n\nBuka WhatsApp di HP nomor ${number} > Perangkat Tertaut > Tautkan dengan nomor telepon, lalu masukan kode ini dalam 60 detik.\n\nJika tidak ditautkan dalam 3 menit, sesi ini otomatis dihapus.`,
                    footer: 'Jadibot Pairing',
                    buttons: [{ type: 'copy', label: '📋 Copy Kode Pairing', code }]
                }).catch(() => {
                    mainSock.sendMessage(requesterJid, { text: `Kode pairing untuk ${number}:\n\n*${code}*\n\nBuka WhatsApp di HP nomor ${number} > Perangkat Tertaut > Tautkan dengan nomor telepon, lalu masukan kode ini dalam 60 detik.\n\nJika tidak ditautkan dalam 3 menit, sesi ini otomatis dihapus.` }).catch(() => {})
                })
            }
        } catch (e) {
            activeSessions.delete(number)
            delete jadibotDb.sessions[number]
            saveDb()
            events.emit('status', { number, status: 'error', error: e.message })
            if (mainSock && requesterJid) {
                mainSock.sendMessage(requesterJid, { text: `Gagal request pairing code untuk ${number}: ${e.message}` }).catch(() => {})
            }
            throw e
        }
    }

    scheduleLinkDeadline(number, requesterJid, mainSock)
    childSock.ev.on('creds.update', saveCreds)

    childSock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'open') {
            clearLinkDeadline(number)
            reconnectAttempts.delete(number)
            notifiedTrouble.delete(number)
            entry.status = 'connected'
            entry.connectedAt = Date.now()
            entry.lastActivity = Date.now()

            const alreadyNotified = jadibotDb.sessions[number]?.notified === true || notifiedConnected.has(number)
            jadibotDb.sessions[number] = {
                ...jadibotDb.sessions[number],
                number, ownerJid: requesterJid, status: 'connected',
                connectedAt: entry.connectedAt, notified: alreadyNotified, pairingCode: null
            }
            saveDb()
            events.emit('status', { number, status: 'connected' })
            syncAllGroups(childSock).catch(() => {})
            scheduleAds(number)
            if (!alreadyNotified) {
                notifiedConnected.add(number)
                jadibotDb.sessions[number].notified = true
                saveDb()
                if (mainSock && requesterJid) {
                    mainSock.sendMessage(requesterJid, { text: `Nomor ${number} berhasil terhubung sebagai jadibot.` }).catch(() => {})
                }
            }
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            const wasManualStop = stoppingNumbers.has(number)
            activeSessions.delete(number)
            clearAdsTimer(number)

            const permanentReasons = [
                DisconnectReason.loggedOut,
                DisconnectReason.connectionReplaced,
                DisconnectReason.badSession,
                DisconnectReason.multideviceMismatch
            ]

            if (wasManualStop || permanentReasons.includes(reason)) {
                clearLinkDeadline(number)
                notifiedConnected.delete(number)
                notifiedTrouble.delete(number)
                stoppingNumbers.delete(number)
                reconnectAttempts.delete(number)
                delete jadibotDb.sessions[number]
                saveDb()
                removeMongoAuthState(`jadibot:${number}`).catch(() => {})
                events.emit('status', { number, status: 'disconnected' })

                if (mainSock && requesterJid && !wasManualStop) {
                    const reasonText = reason === DisconnectReason.connectionReplaced
                        ? 'nomor ditautkan ulang / dipakai di perangkat lain'
                        : reason === DisconnectReason.badSession
                            ? 'sesi rusak, perlu tautkan ulang'
                            : reason === DisconnectReason.multideviceMismatch
                                ? 'versi multi-device tidak cocok, perlu tautkan ulang'
                                : 'logout dari WhatsApp'
                    mainSock.sendMessage(requesterJid, { text: `Sesi jadibot ${number} terputus permanen (${reasonText}).` }).catch(() => {})
                }
            } else {
                const attempts = (reconnectAttempts.get(number) || 0) + 1
                reconnectAttempts.set(number, attempts)
                events.emit('status', { number, status: 'reconnecting' })

                if (attempts === RECONNECT_TROUBLE_NOTICE_AT && !notifiedTrouble.has(number)) {
                    notifiedTrouble.add(number)
                    if (mainSock && requesterJid) {
                        mainSock.sendMessage(requesterJid, { text: `Sesi jadibot ${number} lagi susah konek (${attempts}x gagal berturut-turut), tapi sesi tidak dihapus dan bot akan terus mencoba menyambung ulang di latar belakang.` }).catch(() => {})
                    }
                }

                const delay = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * Math.min(attempts, 10))
                setTimeout(() => { startChildSession(number, requesterJid, mainSock).catch(() => {}) }, delay)
            }
        }
    })

    childSock.ev.on('groups.update', (event) => onGroupsUpdate(childSock, event))
    childSock.ev.on('group-participants.update', (event) => onParticipantsUpdate(childSock, config, event))
    childSock.ev.on('messages.upsert', (event) => guardedHandle(childSock, event))

    return entry
}

/** Dipanggil dari dashboard web: mulai sesi tanpa requester WA, kembalikan accessToken untuk otorisasi endpoint selanjutnya. */
async function startWebSession(number) {
    await startChildSession(number, null, null)
    return jadibotDb.sessions[number]
}

function publicView(session) {
    if (!session) return null
    return {
        number: session.number,
        status: session.status,
        pairingCode: session.pairingCode || null,
        connectedAt: session.connectedAt || null,
        settings: session.settings || defaultSettings()
    }
}

function getSession(number) {
    return jadibotDb.sessions[number] || null
}

function listSessions() {
    return Object.values(jadibotDb.sessions).map(publicView)
}

function updateSessionSettings(number, patch = {}) {
    const session = jadibotDb.sessions[number]
    if (!session) return null
    session.settings ??= defaultSettings()

    if (patch.ownerNumber !== undefined) {
        session.settings.ownerNumber = patch.ownerNumber ? formatNumber(patch.ownerNumber) : null
    }
    if (patch.autoread !== undefined) session.settings.autoread = !!patch.autoread
    if (patch.autotyping !== undefined) session.settings.autotyping = !!patch.autotyping

    saveDb()

    // childSock.jadibotSettings menunjuk ke object session.settings yang sama,
    // jadi socket yang lagi aktif otomatis lihat nilai baru tanpa langkah tambahan.
    const entry = activeSessions.get(number)
    if (entry?.sock) entry.sock.jadibotSettings = session.settings

    events.emit('settings', { number, settings: session.settings })
    return session
}

function restoreAllSessions(mainSock = null) {
    if (restored) return
    restored = true

    const numbers = Object.keys(jadibotDb.sessions)
    numbers.forEach((number, i) => {
        setTimeout(() => {
            startChildSession(number, jadibotDb.sessions[number].ownerJid, mainSock).catch((e) => {
                console.error(chalk.redBright(`Gagal restore jadibot ${number}:`), e.message)
            })
        }, i * RESTORE_STAGGER_MS)
    })
}

export {
    startChildSession,
    startWebSession,
    stopSession,
    sendAdsOnce,
    getSession,
    listSessions,
    updateSessionSettings,
    publicView,
    restoreAllSessions
}
