import { getOwo, ANIMALS_BY_ID, findAnimalByQuery, zooCount, removeFromZoo, addToZoo, pickAnimal, RARITIES, FUSION_REQUIREMENTS, FUSION_SUCCESS_RATE, FUSION_COOLDOWN, FUSION_CONFIRM_WINDOW, pendingFusions, nextRarityKey, cooldownLeft, fmtMs, progressQuest } from '../lib/owo.js'

const CONFIRM_WORDS = ['confirm', 'ya', 'iya', 'y', 'yes']

function doFusion(m, animalId, prefix) {
    const owo = getOwo(m.sender)

    const left = cooldownLeft(owo.lastFusion, FUSION_COOLDOWN)
    if (left > 0) return m.reply(`⏳ Fusion masih cooldown. Tunggu ${fmtMs(left)} lagi.`)

    const animal = ANIMALS_BY_ID[animalId]
    const required = FUSION_REQUIREMENTS[animal.rarity]
    const owned = zooCount(m.sender, animal.id)

    if (owned < required) {
        return m.reply(`⚠️ Bahan Anda sudah berubah, sekarang hanya punya ${owned}x *${animal.name}*, butuh ${required}x. Ulangi lagi dari ${prefix}owofusion ${animal.id}.`)
    }

    const removed = removeFromZoo(m.sender, animal.id, required)
    if (!removed) return m.reply('⚠️ Gagal fusion, coba lagi.')

    owo.lastFusion = Date.now()

    const successRate = FUSION_SUCCESS_RATE[animal.rarity]
    const success = Math.random() < successRate

    if (!success) {
        let out = `💥 *FUSION GAGAL!*\n\n`
        out += `${required}x ${animal.emoji} *${animal.name}* habis terpakai tapi gagal melebur.\n`
        out += `Peluang sukses tier ini hanya ${Math.round(successRate * 100)}%, coba lagi lain kali.`
        return m.reply(out)
    }

    const nextRarity = nextRarityKey(animal.rarity)
    const result = pickAnimal(nextRarity)
    addToZoo(m.sender, result.id)

    progressQuest(m.sender, 'catchAny')
    if (['epic', 'mythical', 'legendary'].includes(nextRarity)) progressQuest(m.sender, 'catchEpicPlus')

    let out = `✨ *FUSION BERHASIL!*\n\n`
    out += `${required}x ${animal.emoji} *${animal.name}* melebur jadi...\n\n`
    out += `${result.emoji} *${result.name}* (${RARITIES[nextRarity].label})!\n\n`
    out += `Cek koleksi Anda di ${prefix}owozoo`

    return m.reply(out)
}

export default {
    cmd: ['owofusion', 'fusion', 'evolve'],
    category: 'owo',
    onMessage: async (m) => {
        if (!m || !m.message || m.key?.fromMe) return false
        const query = (m.body || '').trim().toLowerCase()
        if (!CONFIRM_WORDS.includes(query)) return false

        const pending = pendingFusions.get(m.sender)
        if (!pending) return false

        if (pending.expiresAt <= Date.now()) {
            pendingFusions.delete(m.sender)
            m.reply(`⏳ Konfirmasi sudah kedaluwarsa. Ketik .owofusion <nama hewan> lagi dari awal.`)
            return true
        }

        pendingFusions.delete(m.sender)
        doFusion(m, pending.animalId, '.')
        return true
    },
    run: async (m, { text, prefix, cmd }) => {
        const query = text.trim().toLowerCase()

        if (!query) {
            let out = `🧬 *OWO FUSION*\n\n`
            out += `Gabungkan beberapa hewan duplikat jadi 1 hewan tingkat lebih tinggi (acak). Ada risiko gagal, dan bahan tetap habis walau gagal!\n\n`
            out += `Kebutuhan & peluang sukses:\n`
            for (const [rarityKey, need] of Object.entries(FUSION_REQUIREMENTS)) {
                const next = nextRarityKey(rarityKey)
                const rate = Math.round(FUSION_SUCCESS_RATE[rarityKey] * 100)
                out += `• ${RARITIES[rarityKey].label} x${need} ➜ 1x ${RARITIES[next].label} (acak) | Sukses ${rate}%\n`
            }
            out += `\n⏳ Cooldown: ${fmtMs(FUSION_COOLDOWN)} tiap fusion.\n`
            out += `\nContoh: ${prefix}${cmd} ayam`
            return m.reply(out)
        }

        if (CONFIRM_WORDS.includes(query)) {
            const pending = pendingFusions.get(m.sender)
            if (!pending) return m.reply(`❓ Belum ada fusion yang menunggu konfirmasi. Ketik ${prefix}${cmd} <nama hewan> dulu.`)

            if (pending.expiresAt <= Date.now()) {
                pendingFusions.delete(m.sender)
                return m.reply(`⏳ Konfirmasi sudah kedaluwarsa. Ketik ${prefix}${cmd} <nama hewan> lagi dari awal.`)
            }

            pendingFusions.delete(m.sender)
            return doFusion(m, pending.animalId, prefix)
        }

        const animal = findAnimalByQuery(query)
        if (!animal) return m.reply(`⚠️ Hewan tidak ditemukan. Cek nama di ${prefix}owodex.`)

        const required = FUSION_REQUIREMENTS[animal.rarity]
        if (!required) {
            return m.reply(`⚠️ *${animal.name}* (${RARITIES[animal.rarity].label}) sudah rarity tertinggi yang bisa difusion, tidak bisa dinaikkan lagi.`)
        }

        const owo = getOwo(m.sender)
        const left = cooldownLeft(owo.lastFusion, FUSION_COOLDOWN)
        if (left > 0) return m.reply(`⏳ Fusion masih cooldown. Tunggu ${fmtMs(left)} lagi.`)

        const owned = zooCount(m.sender, animal.id)
        if (owned < required) {
            return m.reply(`⚠️ Anda hanya punya ${owned}x *${animal.name}*, butuh ${required}x untuk fusion.`)
        }

        const nextRarity = nextRarityKey(animal.rarity)
        const rate = FUSION_SUCCESS_RATE[animal.rarity]

        pendingFusions.set(m.sender, { animalId: animal.id, expiresAt: Date.now() + FUSION_CONFIRM_WINDOW })

        let out = `🧬 *KONFIRMASI FUSION*\n\n`
        out += `${required}x ${animal.emoji} *${animal.name}* (${RARITIES[animal.rarity].label}) akan dipakai.\n`
        out += `➜ Hasil: 1x hewan *${RARITIES[nextRarity].label}* (acak)\n`
        out += `➜ Peluang sukses: *${Math.round(rate * 100)}%*\n\n`
        out += `⚠️ Bahan tetap habis walau gagal!\n\n`
        out += `Ketik *confirm* dalam ${fmtMs(FUSION_CONFIRM_WINDOW)} untuk lanjut, atau diamkan saja untuk membatalkan.`

        return m.reply(out)
    }
}
