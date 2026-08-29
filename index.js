import 'dotenv/config'
import fs from 'fs'
import dns from 'dns'
import chalk from 'chalk'
import config from './config.js'

dns.setDefaultResultOrder('ipv4first')
import { loadPlugins, reloadPlugin } from './lib/plugins.js'
import wrapSocket from './lib/simple.js'
import { createSocket } from './lib/connection.js'
import { onConnectionUpdate, onGroupsUpdate, onParticipantsUpdate, handleMessage } from './handler.js'
import { initDatabase } from './lib/database.js'
import { initSessionStore } from './lib/session-manager.js'

process.on('uncaughtException', (err) => console.error(chalk.redBright.bold('ERROR'), err))
process.on('unhandledRejection', (err) => console.error(chalk.redBright.bold('ERROR'), err))

const printBanner = () => {
    console.log()
    console.log(chalk.cyanBright.bold(config.botName.toUpperCase()))
}

const originLog = console.log
console.log = (...args) => {
    const msg = args[0]
    if (typeof msg === 'string' && msg.includes('Closing session: SessionEntry')) return
    if (typeof msg === 'string' && msg.includes('remoteIdentityKey')) return
    if (msg && typeof msg === 'object' && msg.remoteIdentityKey) return
    if (msg && typeof msg === 'object' && msg._chains) return
    originLog(...args)
}

let storesReady = false

const startBot = async () => {
    if (!storesReady) {
        console.log(chalk.whiteBright('Menyambungkan ke MongoDB...'))
        await initDatabase()
        await initSessionStore()
        storesReady = true
    }
    await loadPlugins()
    const { sock, saveCreds } = await createSocket(config)
    await wrapSocket(sock)

    sock.ev.on('connection.update', onConnectionUpdate(sock, config, startBot))
    sock.ev.on('groups.update', (event) => onGroupsUpdate(sock, event))
    sock.ev.on('group-participants.update', (event) => onParticipantsUpdate(sock, config, event))
    sock.ev.on('messages.upsert', (event) => handleMessage(sock, config, event))
}

printBanner()
startBot()

// Dashboard web jadibot jalan di proses yang sama biar sesi jadibot (Map di memori)
// nggak kebagi ke dua proses berbeda. Kalau cuma mau dashboard tanpa bot owner utama,
// jalankan `npm run dashboard` (server.js) sendirian.
import('./server.js').catch((e) => console.error(chalk.redBright('Gagal menjalankan dashboard:'), e.message))

const pluginDebounce = new Map()
fs.watch('./plugins', { recursive: true }, async (_eventType, filename) => {
    if (!filename || !filename.endsWith('.js')) return
    if (pluginDebounce.has(filename)) clearTimeout(pluginDebounce.get(filename))
    const timer = setTimeout(async () => {
        await reloadPlugin(filename)
        pluginDebounce.delete(filename)
    }, 100)
    pluginDebounce.set(filename, timer)
})
