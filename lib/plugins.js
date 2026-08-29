import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import { getCachedGroupMetadata } from './simple.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginFolder = path.join(__dirname, '../plugins')

export const plugins = new Map()
const fileCache = new Map()
const cmdIndex = new Map()
const cmdFileIndex = new Map()
let regexIndex = []
let onMessageHandlers = []
let onConnectHandlers = []
let allCommandEntries = []
let publicCommandNames = []
let allCommandNames = []

const restrictedMessage = {
    owner: 'Perintah ini hanya untuk owner bot.',
    premium: 'Fitur ini khusus member premium.',
    admin: 'Perintah ini hanya untuk admin grup.',
    botAdmin: 'Bot harus jadi admin dulu untuk menjalankan perintah ini.',
    group: 'Perintah ini hanya bisa dipakai di dalam grup.',
    private: 'Perintah ini hanya bisa dipakai di chat pribadi.'
}

function toArray(v) {
    if (v == null) return []
    return Array.isArray(v) ? v : [v]
}

function isHandlerStyle(mod) {
    return typeof mod === 'function' && (mod.command != null || Array.isArray(mod.help) || typeof mod.all === 'function')
}

export function isPremiumActive(user) {
    if (!user) return false
    if (user.premium === true) return true
    if (typeof user.premiumTime === 'number' && user.premiumTime > Date.now()) return true
    return false
}

function adaptHandlerPlugin(fn) {
    const rawCommand = toArray(fn.command)
    const cmd = rawCommand.filter(c => typeof c === 'string').map(c => c.toLowerCase())
    const regex = rawCommand.filter(c => c instanceof RegExp)
    const category = fn.owner ? 'owner' : ((Array.isArray(fn.tags) && fn.tags[0]) || 'tools')
    const hasCommand = cmd.length || regex.length

    const adapted = {
        cmd,
        category,
        __regex: regex
    }

    if (hasCommand) {
        adapted.run = async (m, ctx) => {
            if (fn.owner && !m.isOwner) return m.reply(restrictedMessage.owner)
            if (fn.group && !m.isGroup) return m.reply(restrictedMessage.group)
            if (fn.private && m.isGroup) return m.reply(restrictedMessage.private)
            if (fn.admin && !m.isOwner && !m.isAdmin) return m.reply(restrictedMessage.admin)
            if (fn.botAdmin && !m.isBotAdmin) return m.reply(restrictedMessage.botAdmin)
            if (fn.premium && !m.isOwner && !isPremiumActive(global.db?.data?.users?.[m.sender])) {
                return m.reply(restrictedMessage.premium)
            }

            const sock = ctx.sock || ctx.conn
            let participants = []
            if (m.isGroup && sock) {
                const metadata = await getCachedGroupMetadata(sock, m.from).catch(() => null)
                participants = metadata?.participants || []
            }
            const args = (ctx.text || '').split(/ +/).filter(Boolean)

            try {
                return await fn(m, {
                    ...ctx,
                    sock,
                    conn: sock,
                    participants,
                    args,
                    usedPrefix: ctx.prefix || '',
                    command: ctx.cmd
                })
            } catch (e) {
                if (typeof e === 'string') return m.reply(e)
                throw e
            }
        }
    }

    if (typeof fn.all === 'function') {
        adapted.onMessage = async (m, { sock, config }) => {
            try {
                await fn.all(m, { sock, conn: sock, config })
            } catch (e) {
                console.error(e)
            }
            return false
        }
    }

    return adapted
}

function rebuildCmdIndex() {
    cmdIndex.clear()
    cmdFileIndex.clear()
    regexIndex = []
    for (const [relativePath, plugin] of plugins.entries()) {
        for (const c of plugin.cmd || []) {
            cmdIndex.set(c, plugin)
            cmdFileIndex.set(c, relativePath)
        }
        for (const re of plugin.__regex || []) {
            regexIndex.push({ re, plugin, relativePath })
        }
    }
    onMessageHandlers = [...plugins.values()].filter(p => typeof p.onMessage === 'function')
    onConnectHandlers = [...plugins.values()].filter(p => typeof p.onConnect === 'function')
    allCommandEntries = [...cmdIndex.entries()]
        .filter(([c]) => /^[a-z0-9_]+$/i.test(c))
        .map(([c, plugin]) => ({ cmd: c, category: plugin.category }))
    allCommandNames = allCommandEntries.map(e => e.cmd)
    publicCommandNames = allCommandEntries.filter(e => e.category !== 'owner').map(e => e.cmd)
}

function getAllFiles(dir, files = []) {
    for (const file of fs.readdirSync(dir).sort()) {
        const fullPath = path.join(dir, file)
        if (fs.statSync(fullPath).isDirectory()) getAllFiles(fullPath, files)
        else if (file.endsWith('.js')) files.push(fullPath)
    }
    return files
}

export async function loadPlugins() {
    plugins.clear()
    fileCache.clear()

    console.log(chalk.cyanBright.bold('\nLoading plugins...'))

    const start = Date.now()
    let success = 0, failed = 0
    const errors = []

    for (const fullPath of getAllFiles(pluginFolder)) {
        const relativePath = path.relative(pluginFolder, fullPath)
        try {
            fileCache.set(relativePath, fs.readFileSync(fullPath, 'utf-8'))
            const mod = await import(`../plugins/${relativePath.replace(/\\/g, '/')}?update=${Date.now()}`)
            const rawPlugin = mod.default || mod
            if (rawPlugin?.disabled) continue
            const plugin = isHandlerStyle(rawPlugin) ? adaptHandlerPlugin(rawPlugin) : rawPlugin
            if (plugin?.cmd?.length || plugin?.__regex?.length || plugin?.onMessage || plugin?.onConnect) {
                plugins.set(relativePath, plugin)
                success++
            }
        } catch (e) {
            failed++
            errors.push({ file: relativePath, error: e.message.split('\n')[0] })
        }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(2)

    console.log(
        chalk.greenBright(`  ✓ ${success} plugin${success > 1 ? 's' : ''} loaded`),
        chalk.whiteBright(`(${elapsed}s)`)
    )

    if (failed > 0) {
        console.log(chalk.redBright(`  ✗ ${failed} plugin${failed > 1 ? 's' : ''} failed`))
        for (const err of errors) {
            console.log(chalk.redBright(`    ${err.file}: ${err.error}`))
        }
    } else {
        console.log(chalk.greenBright.bold(`  ✦ All plugins loaded`))
    }

    rebuildCmdIndex()
}

export function unloadPlugin(relativePath) {
    if (!plugins.has(relativePath)) return false
    plugins.delete(relativePath)
    fileCache.delete(relativePath)
    rebuildCmdIndex()
    return true
}

export async function reloadPlugin(relativePath) {
    const fullPath = path.join(pluginFolder, relativePath)
    if (!fs.existsSync(fullPath)) {
        if (unloadPlugin(relativePath)) {
            console.log(chalk.yellowBright(`  Unloaded ${relativePath} (deleted)`))
        }
        return
    }
    try {
        const oldContent = fileCache.get(relativePath) || ''
        const newContent = fs.readFileSync(fullPath, 'utf-8')
        fileCache.set(relativePath, newContent)

        const added = newContent.split('\n').filter(x => !oldContent.split('\n').includes(x)).length
        const removed = oldContent.split('\n').filter(x => !newContent.split('\n').includes(x)).length

        const mod = await import(`../plugins/${relativePath.replace(/\\/g, '/')}?update=${Date.now()}`)
        const rawPlugin = mod.default || mod
        if (rawPlugin?.disabled) {
            if (unloadPlugin(relativePath)) {
                console.log(chalk.yellowBright(`  Unloaded ${relativePath} (disabled)`))
            }
            return
        }
        const plugin = isHandlerStyle(rawPlugin) ? adaptHandlerPlugin(rawPlugin) : rawPlugin
        if (plugin?.cmd?.length || plugin?.__regex?.length || plugin?.onMessage || plugin?.onConnect) {
            plugins.set(relativePath, plugin)
            rebuildCmdIndex()
            console.log(
                chalk.greenBright(`  Reloaded ${relativePath}`),
                chalk.whiteBright(`+${added} -${removed}`)
            )
        }
    } catch (e) {
        console.error(chalk.redBright(`  Failed to reload ${relativePath}: ${e.message}`))
    }
}

export function getPlugin(command) {
    const direct = cmdIndex.get(command)
    if (direct) return direct
    for (const { re, plugin } of regexIndex) {
        if (re.test(command)) return plugin
    }
    return null
}

export function getPluginFile(command) {
    const direct = cmdFileIndex.get(command)
    if (direct) return direct
    for (const { re, relativePath } of regexIndex) {
        if (re.test(command)) return relativePath
    }
    return null
}

export function getOnMessageHandlers() {
    return onMessageHandlers
}

export function getOnConnectHandlers() {
    return onConnectHandlers
}

export function getAllCommandEntries() {
    return allCommandEntries
}

export function getCommandNames(includeOwner) {
    return includeOwner ? allCommandNames : publicCommandNames
}
