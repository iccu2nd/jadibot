import { PETS, getRpg, hasStarted, fmtMoney, fmtMs, cooldownLeft, PET_MAX_LEVEL, PET_FEED_COOLDOWN } from '../lib/rpg.js'

function feedCost(level) { return 50 + level * 30 }

export default {
    cmd: ['pet', 'peliharaan'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const args = text.trim().toLowerCase().split(/ +/).filter(Boolean)
        const sub = args[0] || ''

        if (!sub) {
            let out = `*HEWAN PELIHARAAN*\n`
            if (rpg.pet) {
                const p = PETS[rpg.pet]
                out += `Peliharaan Anda: ${p.name}, level ${rpg.petLevel}/${PET_MAX_LEVEL}\n`
                out += `Bonus serang : +${Math.floor(p.atk * (1 + (rpg.petLevel - 1) * 0.15))}\n`
                out += `Bonus bertahan : +${Math.floor(p.def * (1 + (rpg.petLevel - 1) * 0.15))}\n\n`
                out += `Beri makan untuk menaikkan levelnya lewat ${prefix + cmd} feed`
            } else {
                out += `Anda belum punya peliharaan.\n\n*DAFTAR PELIHARAAN*\n`
                out += Object.entries(PETS).map(([id, p]) => `• ${p.name} (${id}) - bonus serang +${p.atk}, bertahan +${p.def}, harga ${fmtMoney(p.price)}`).join('\n')
                out += `\n\nAdopsi dengan ${prefix + cmd} adopt <nama peliharaan>, contoh: ${prefix + cmd} adopt serigala`
            }
            return m.reply(out)
        }

        if (sub === 'adopsi' || sub === 'adopt') {
            if (rpg.pet) return m.reply(`Anda sudah punya ${PETS[rpg.pet].name}. Satu karakter hanya bisa punya satu peliharaan aktif.`)
            const petId = args[1]
            const pet = PETS[petId]
            if (!pet) return m.reply(`Peliharaan tidak ditemukan. Ketik ${prefix + cmd} untuk melihat daftar peliharaan.`)
            if (rpg.money < pet.price) return m.reply(`Money Anda tidak cukup. Butuh ${fmtMoney(pet.price)} money.`)
            rpg.money -= pet.price
            rpg.pet = petId
            rpg.petLevel = 1
            return m.reply(`Selamat, ${pet.name} sekarang jadi peliharaan Anda dan otomatis membantu di ${prefix}hunt, ${prefix}dungeon, ${prefix}boss, ${prefix}duel, dan ${prefix}arena.\n\nJangan lupa diberi makan rutin lewat ${prefix + cmd} feed agar levelnya naik.`)
        }

        if (sub === 'beri' || sub === 'feed') {
            if (!rpg.pet) return m.reply(`Anda belum punya peliharaan. Adopsi dulu lewat ${prefix + cmd} adopt <nama peliharaan>.`)
            if (rpg.petLevel >= PET_MAX_LEVEL) return m.reply(`${PETS[rpg.pet].name} sudah mencapai level maksimal (${PET_MAX_LEVEL}).`)
            const left = cooldownLeft(rpg.lastFeed, PET_FEED_COOLDOWN)
            if (left > 0) return m.reply(`${PETS[rpg.pet].name} masih kenyang. Beri makan lagi ${fmtMs(left)} dari sekarang.`)
            const cost = feedCost(rpg.petLevel)
            if (rpg.money < cost) return m.reply(`Money Anda tidak cukup. Butuh ${fmtMoney(cost)} money untuk memberi makan.`)
            rpg.money -= cost
            rpg.lastFeed = Date.now()
            rpg.petLevel++
            return m.reply(`${PETS[rpg.pet].name} kenyang dan naik ke level ${rpg.petLevel}/${PET_MAX_LEVEL}. Bonus tarung dari peliharaan ikut bertambah.`)
        }

        if (sub === 'lepas' || sub === 'release') {
            if (!rpg.pet) return m.reply(`Anda belum punya peliharaan.`)
            const name = PETS[rpg.pet].name
            rpg.pet = null
            rpg.petLevel = 1
            return m.reply(`${name} sudah dilepas. Anda bisa adopsi peliharaan baru kapan saja lewat ${prefix + cmd} adopt.`)
        }

        return m.reply(`Perintah tidak dikenali. Gunakan ${prefix + cmd}, ${prefix + cmd} adopt <nama>, ${prefix + cmd} feed, atau ${prefix + cmd} release.`)
    }
}
