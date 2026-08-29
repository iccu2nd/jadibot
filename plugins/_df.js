import fs from 'fs'
import path from 'path'
import { unloadPlugin } from '../lib/plugins.js'

export default {
  cmd: ['df'],
  category: 'owner',
  run: async (m, { text, isOwner }) => {
    if (!isOwner) return m.reply('Owner only.')
    const base = path.resolve('./plugins')

    if (!text) return m.reply('Usage: .df name')
    const n = text.trim().replace(/\.js$/, '') + '.js'
    const p = path.join(base, n)
    if (!p.startsWith(base)) return m.reply('Access denied.')
    if (!fs.existsSync(p)) return m.reply(`Not found: ${n}`)
    fs.unlinkSync(p)
    unloadPlugin(n)
    return m.reply(`Deleted: ${n}`)
  }
}
