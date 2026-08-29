import { getOwo, findAnimalByQuery, RARITIES, SECRET_SKILLS, zooCount } from '../lib/owo.js'

export default {
    cmd: ['owochar', 'owostat', 'charinfo'],
    category: 'owo',
    run: async (m, { text, prefix, cmd }) => {
        const query = text.trim().toLowerCase()

        if (!query) {
            return m.reply(`❓ Masukkan key hewannya.\n\nContoh: ${prefix}${cmd} roh_semesta\n\nCek daftar key lengkap di ${prefix}owodex`)
        }

        const animal = findAnimalByQuery(query)
        if (!animal) return m.reply(`⚠️ Hewan tidak ditemukan. Cek nama/key di ${prefix}owodex.`)

        const rarity = RARITIES[animal.rarity]
        const owned = zooCount(m.sender, animal.id)
        const skill = SECRET_SKILLS[animal.id]

        let out = `${animal.emoji} *${animal.name}*\n`
        out += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`
        out += `🏷️ Key : ${animal.id}\n`
        out += `🎖️ Rarity : *${rarity.label}*\n`
        out += `🎯 Peluang tangkap dasar : ${Math.round(rarity.catchBase * 100)}%\n`
        out += `📦 Dimiliki : ${owned}x\n\n`

        out += `*📊 STATISTIK TEMPUR*\n`
        out += `❤️ HP : ${animal.hp}\n`
        out += `⚔️ ATK : ${animal.atk}\n`
        out += `🛡️ DEF : ${animal.def}\n\n`

        out += `*💰 NILAI*\n`
        out += `🪙 Harga jual : ${rarity.sellPrice}\n`
        out += `✨ Essence fusion : ${rarity.essence}\n`

        if (skill) {
            out += `\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`
            out += `💠 *ULTIMATE (Secret)*\n`
            out += `${skill.emoji} *${skill.name}*\n`
            out += `${skill.desc}\n\n`
            out += `Aktif 1x pakai kalau ${animal.name} dibawa masuk tim (${prefix}owoteam set ...) — ketik *ult* pas ${prefix}owopvp untuk melempar ultimate.`
        }

        return m.reply(out)
    }
}
