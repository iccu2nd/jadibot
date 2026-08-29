import { getOwo, ANIMALS_BY_ID, getTeam, setTeam, animalStats, teamPower, teamSlotLimit, WEAPONS } from '../lib/owo.js'

export default {
    cmd: ['owoteam', 'owotim'],
    category: 'owo',
    run: async (m, { text, prefix, cmd }) => {
        const owo = getOwo(m.sender)
        const arg = text.trim()
        const limit = teamSlotLimit(m.sender)

        if (arg.toLowerCase().startsWith('set ')) {
            const rawIds = arg.slice(4).split(/[,\s]+/).map(s => s.toLowerCase()).filter(Boolean)
            if (!rawIds.length) return m.reply(`❓ Contoh: ${prefix + cmd} set ayam,rubah,elang`)
            if (rawIds.length > limit) return m.reply(`⚠️ Tim maksimal ${limit} hewan. Tambah slot lewat ${prefix}owobuy teamslot.`)

            for (const id of rawIds) {
                const animal = ANIMALS_BY_ID[id]
                if (!animal) return m.reply(`⚠️ Hewan *${id}* tidak dikenal. Cek ${prefix}owodex.`)
                if (!owo.zoo[id]) return m.reply(`⚠️ Anda belum punya *${animal.name}*.`)
            }

            setTeam(m.sender, rawIds)
            return m.reply(`✅ Tim berhasil diatur: ${rawIds.map(id => `${ANIMALS_BY_ID[id].emoji} ${ANIMALS_BY_ID[id].name}`).join(', ')}`)
        }

        const team = getTeam(m.sender)
        if (!team.length) {
            const owned = Object.keys(owo.zoo)
            let out = `⚔️ Tim Anda masih kosong.\n\n`
            if (owned.length) {
                out += `Hewan yang Anda punya:\n${owned.map(id => `• ${ANIMALS_BY_ID[id]?.emoji || ''} ${ANIMALS_BY_ID[id]?.name || id} (${id})`).join('\n')}\n\n`
            } else {
                out += `Anda belum punya hewan. Berburu dulu pakai ${prefix}huntanimal.\n\n`
            }
            out += `Atur tim: ${prefix + cmd} set <id1,id2,id3>`
            return m.reply(out)
        }

        let out = `⚔️ *TIM AKTIF*\n\n`
        for (const id of team) {
            const animal = ANIMALS_BY_ID[id]
            const s = animalStats(m.sender, id)
            out += `${animal.emoji} *${animal.name}* — Lv.${s.level}\n  HP ${s.hp} | ATK ${s.atk} | DEF ${s.def}\n`
        }
        const weapon = owo.weapon ? WEAPONS[owo.weapon] : null
        out += `\n🗡️ Senjata: ${weapon ? `${weapon.name} (+${weapon.atk} ATK, +${weapon.def} DEF)` : 'Belum ada'}\n`
        const power = teamPower(m.sender)
        out += `\n📊 Total kekuatan tim: HP ${power.hp} | ATK ${power.atk} | DEF ${power.def}\n\n`
        out += `Ganti tim: ${prefix + cmd} set <id1,id2,id3>`

        return m.reply(out)
    }
}
