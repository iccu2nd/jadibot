import fs from 'fs'
import path from 'path'

export default {
  cmd: ['sf'],
  category: 'owner',
  run: async (m, { text, isOwner }) => {
    if (!isOwner) return m.reply('Owner only.')
    const base = path.resolve('./plugins')

    if (!text) return m.reply('Usage: .sf name code | reply code')
    let n, c
    if (m.quoted) {
      n = text.trim()
      const q = m.quoted
      c = q.conversation || q.extendedTextMessage?.text
      if (q.type === 'documentMessage') {
        const buffer = await m.download()
        c = buffer.toString('utf-8')
      }
      if (!c) return m.reply('Reply text or file.')
    } else {
      const i = text.search(/\s/)
      if (i === -1) return m.reply('Format: .sf name.js code')
      n = text.slice(0, i).trim()
      c = text.slice(i).trim()
    }
    if (!n.endsWith('.js')) n += '.js'
    if (!c) return m.reply('Code empty.')
    const p = path.join(base, n)
    if (!p.startsWith(base)) return m.reply('Access denied.')
    const e = fs.existsSync(p)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, c)
    return m.reply(`${e ? 'Updated' : 'Saved'}: ${n}`)
  }
}
