import { getOwo, fmtCowoncy, WEAPONS } from '../lib/owo.js'

export default {
    cmd: ['owoweapon', 'owocraft'],
    category: 'owo',
    run: async (m, { text, prefix, cmd }) => {
        const owo = getOwo(m.sender)
        const key = text.trim().toLowerCase()

        if (cmd === 'owoweapon' || !key) {
            let out = `🗡️ *SENJATA OWO*\n\n`
            for (const [id, w] of Object.entries(WEAPONS)) {
                const equipped = owo.weapon === id ? ' (terpasang)' : ''
                out += `• *${w.name}*${equipped} (${id})\n  Butuh: ${w.essence} essence + ${fmtCowoncy(w.price)}\n  Bonus: +${w.atk} ATK, +${w.def} DEF\n\n`
            }
            out += `🧪 Essence Anda: ${owo.essence}\nSaldo: ${fmtCowoncy(owo.cowoncy)}\n\n`
            out += `Untuk/pasang: ${prefix}owocraft <id>\nContoh: ${prefix}owocraft besi`
            return m.reply(out)
        }

        const weapon = WEAPONS[key]
        if (!weapon) return m.reply(`⚠️ Senjata tidak ditemukan. Ketik ${prefix}owoweapon untuk lihat daftar.`)
        if (owo.weapon === key) return m.reply(`⚠️ *${weapon.name}* sudah terpasang.`)
        if (owo.essence < weapon.essence) return m.reply(`⚠️ Essence Anda kurang. Butuh ${weapon.essence}, punya ${owo.essence}.\nDapetin essence dari ${prefix}owosell <hewan> <jumlah> --essence`)
        if (owo.cowoncy < weapon.price) return m.reply(`💸 Saldo Anda kurang. Butuh ${fmtCowoncy(weapon.price)}, saldo Anda ${fmtCowoncy(owo.cowoncy)}.`)

        owo.essence -= weapon.essence
        owo.cowoncy -= weapon.price
        owo.weapon = key

        return m.reply(`✅ *${weapon.name}* berhasil dibuat dan langsung dipasang!\n+${weapon.atk} ATK, +${weapon.def} DEF untuk seluruh tim.\n\n🧪 Sisa essence: ${owo.essence}\nSisa saldo: ${fmtCowoncy(owo.cowoncy)}`)
    }
}
