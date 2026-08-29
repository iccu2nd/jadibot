import { CLASSES, getRpg, hasStarted } from '../lib/rpg.js'

export default {
    cmd: ['start', 'rpgstart'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        const pick = text.trim().toLowerCase()
        if (hasStarted(m.sender) && pick !== 'reset') {
            return m.reply(`Anda sudah punya karakter. Ketik ${prefix}profile untuk melihat statusnya.\n\nIngin membuat ulang dari awal? Ketik ${prefix + cmd} reset (semua progres lama akan hilang).`)
        }
        if (pick === 'reset') {
            if (!hasStarted(m.sender)) return m.reply(`Anda belum punya karakter, langsung saja pilih class.`)
            delete global.db.data.users[m.sender].rpg
            return m.reply(`Karakter lama berhasil dihapus. Pilih class baru dengan ${prefix + cmd} <nama class>.`)
        }
        const keys = Object.keys(CLASSES)
        if (!keys.includes(pick)) {
            let text = `*PILIH CLASS ANDA*\nTentukan class dulu sebelum mulai petualangan.\n\n`
            text += keys.map(k => {
                const c = CLASSES[k]
                return `• *${c.name}* (${k})\n  HP ${c.hp} | Serang ${c.atk} | Bertahan ${c.def}\n  ${c.desc}`
            }).join('\n\n')
            text += `\n\nKetik ${prefix + cmd} <nama class>, contoh: ${prefix + cmd} petarung`
            return m.reply(text)
        }
        const rpg = getRpg(m.sender)
        const c = CLASSES[pick]
        rpg.class = pick
        rpg.maxHp = c.hp
        rpg.hp = c.hp
        rpg.atk = c.atk
        rpg.def = c.def
        rpg.level = 1
        rpg.exp = 0

        const u = global.db.data.users[m.sender]
        if (!u.money) u.money = 50
        return m.reply(
            `*KARAKTER BERHASIL DIBUAT*\n` +
            `Class terpilih: ${c.name}\n\n` +
            `HP : ${rpg.hp}\n` +
            `Serang : ${rpg.atk}\n` +
            `Bertahan : ${rpg.def}\n` +
            `Money : ${rpg.money} (money yang sama dipakai di seluruh fitur bot)\n\n` +
            `*LANGKAH SELANJUTNYA*\n` +
            `${prefix}hunt - berburu monster untuk naik level dan cari uang\n` +
            `${prefix}shop - belanja senjata, zirah, dan ramuan\n` +
            `${prefix}profile - cek status karakter kapan saja\n\n` +
            `Bingung mulai dari mana? Ketik ${prefix}tutorial untuk panduan langkah demi langkah.`
        )
    }
}
