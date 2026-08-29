import chalk from 'chalk'
import { updateStreak, checkBrokenStreaks as checkBrokenStreaks_ } from './streak.js'
import { bindRpgCurrency } from './rpg.js'
import { getDb } from './mongo.js'

const STATE_COLLECTION = 'bot_state'
const STATE_DOC_ID = 'main'

const defaultSettings = {
    mode: 'public',
    noprefix: false,
    autoread: false,
    autotyping: false,
    errorReport: true,
    scheduledLeaves: {},
    extraOwners: [],
    blockedCmds: [],

    gconly: false,
    gconlyPremiumBypass: false,
    sapaList: {}
}

// Object ini disiapkan SINKRON dengan default kosong dulu, supaya semua plugin
// yang akses global.db.data.* langsung (nggak nunggu promise) tetap aman dipakai.
// Data asli dari MongoDB di-merge ke object yang SAMA (bukan di-replace) lewat
// initDatabase(), jadi referensi `gd` dan `settings` di bawah tetap valid.
global.db = {
    data: {
        users: {},
        chats: {},
        contacts: {},
        lid_mapping: {},
        msgs: {},
        global_settings: { ...defaultSettings }
    }
}

const gd = global.db.data
export const settings = gd.global_settings

let dbReady = false

/** Wajib di-await sekali di awal (index.js), sebelum bot mulai nerima pesan. */
export async function initDatabase() {
    if (dbReady) return
    dbReady = true
    const db = await getDb()
    const doc = await db.collection(STATE_COLLECTION).findOne({ _id: STATE_DOC_ID })

    if (doc) {
        for (const key of ['users', 'chats', 'contacts', 'lid_mapping', 'msgs']) {
            if (doc[key]) Object.assign(gd[key], doc[key])
        }
        if (doc.global_settings) Object.assign(gd.global_settings, doc.global_settings)
    }

    for (const jid of Object.keys(gd.users)) {
        if (gd.users[jid]?.rpg) bindRpgCurrency(jid)
    }

    setInterval(() => { saveDatabase().catch(() => {}) }, 30000)

    const flushAndExit = () => { saveDatabase().finally(() => process.exit(0)) }
    process.on('SIGINT', flushAndExit)
    process.on('SIGTERM', flushAndExit)
}

export async function saveDatabase() {
    try {
        const db = await getDb()
        await db.collection(STATE_COLLECTION).replaceOne(
            { _id: STATE_DOC_ID },
            { _id: STATE_DOC_ID, ...gd },
            { upsert: true }
        )
    } catch (e) {
        console.error(chalk.redBright('Gagal menyimpan database ke MongoDB:'), e.message)
    }
}

export default function loadUser(m) {
    let streakUpdated = false

    if (m.sender?.endsWith('@s.whatsapp.net') || m.sender?.endsWith('@lid')) {
        const user = gd.users[m.sender] ??= {}
        user.name = m.pushName || m.sender.split('@')[0] || user.name
        user.afk ??= -1
        user.afkReason ??= ''
        user.afkName ??= ''
        user.money ??= 0
        user.bank ??= 0
        user.banned ??= false
        user.warn ??= 0
        user.premium ??= false
        user.premiumTime ??= 0
        user.registered ??= false
        user.regStep ??= ''
        user.regName ??= ''
        user.lastclaim ??= 0
        user.streak ??= 0
        user.lastStreakDate ??= ''
        user.streakNotif ??= true
        user.lastSapa ??= 0

        streakUpdated = updateStreak(user).updated
    }

    if (m.isGroup && m.from) {
        const chat = gd.chats[m.from] ??= {}
        chat.welcome ??= true
        chat.welcomeText ??= 'Hai @pushname, Selamat datang di @gcname!'
        chat.goodbye ??= true
        chat.goodbyeText ??= 'Selamat tinggal @pushname, semoga tenang disana.'
        chat.antiLink ??= false
        chat.antilottie ??= false
        chat.antiSpam ??= false
        chat.antiSpamLimit ??= 8
        chat.worldEvent ??= true
        chat.blacklist ??= []
        chat.isBanned ??= false
        chat.rpgOff ??= false
        chat.owoBoost ??= 1
        chat.owoBoostExpiry ??= 0
    }

    return {
        streakUpdated,
        streak: gd.users[m.sender]?.streak
    }
}

export function checkBrokenStreaks() {
    return checkBrokenStreaks_(gd.users)
}

export function saveContact(jid, lid, pushName) {
    if (!jid || !jid.endsWith('@s.whatsapp.net')) return
    const existing = gd.contacts[jid]
    let finalName = pushName
    if (pushName === 'Unknown' || !pushName) {
        finalName = (existing?.pushname && existing.pushname !== 'null') ? existing.pushname : 'null'
    }
    const finalLid = lid || existing?.lid || 'null'
    if (!existing || existing.pushname !== finalName || existing.lid !== finalLid) {
        gd.contacts[jid] = { jid, lid: finalLid, pushname: finalName }
    }
    if (lid?.endsWith('@lid')) gd.lid_mapping[lid] = jid
}

export function getContact(jid) {
    return gd.contacts[jid]
}

export function getChatData(jid) {
    gd.chats[jid] ??= {}
    return gd.chats[jid]
}

export function getLidMapping(lid) {
    return gd.lid_mapping[lid] || null
}

export function saveMetadata(jid, name, desc, participants = []) {
    if (!jid || (!jid.endsWith('@g.us') && !jid.endsWith('@newsletter'))) return
    gd.chats[jid] ??= {}
    gd.chats[jid].jid = jid
    gd.chats[jid].name = name || 'null'
    gd.chats[jid].description = desc || 'null'
    gd.chats[jid].members = JSON.stringify(participants)
}

export function syncGroupParticipants(jid, participants = []) {
    if (!jid || !participants.length) return
    for (const p of participants) {
        const userJid = p.phoneNumber || (p.id?.endsWith('@s.whatsapp.net') ? p.id : null)
        const userLid = p.id?.endsWith('@lid') ? p.id : null
        if (userJid) saveContact(userJid, userLid, 'Unknown')
    }
}

export async function getGroupSettings(jid) {
    const c = gd.chats[jid] || {}
    return {
        welcome: c.welcome !== false,
        goodbye: c.goodbye !== false,
        welcomeText: c.welcomeText || 'Hai @pushname, Selamat datang di @gcname!',
        goodbyeText: c.goodbyeText || 'Selamat tinggal @pushname, semoga tenang disana.',
    }
}
