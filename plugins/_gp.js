import fs from 'fs'
import path from 'path'

const getFiles = (dir, base = dir) => {
  let r = []
  if (!fs.existsSync(dir)) return r
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) r = r.concat(getFiles(p, base))
    else if (f.endsWith('.js')) r.push(path.relative(base, p).replace(/\\/g, '/'))
  }
  return r
}

export default {
  cmd: ['gp'],
  category: 'owner',
  run: async (m, { text, isOwner }) => {
    if (!isOwner) return m.reply('Owner only.')
    const base = path.resolve('./plugins')

    if (!text) {
      const f = getFiles('./plugins')
      return m.reply(`Plugins (${f.length}):\n\n${f.map((v, i) => `${i + 1}. ${v}`).join('\n')}`)
    }

    const n = text.trim().replace(/\.js$/, '') + '.js'
    const p = path.join(base, n)
    if (!p.startsWith(base)) return m.reply('Access denied.')
    if (!fs.existsSync(p)) return m.reply(`Not found: ${n}`)
    return m.reply(`${fs.readFileSync(p, 'utf-8')}`)
  }
}
