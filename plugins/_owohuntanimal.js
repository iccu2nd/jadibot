import { getOwo, cooldownLeft, fmtMs, pickRarity, pickAnimal, pendingSpawns, RARITIES, HUNT_ANIMAL_COOLDOWN, CATCH_WINDOW, progressQuest } from '../lib/owo.js'

export default {
    cmd: ['huntanimal', 'ha'],
    category: 'owo',
    run: async (m, { prefix }) => {
        const owo = getOwo(m.sender)

        const existing = pendingSpawns.get(m.sender)
        if (existing && existing.expiresAt > Date.now()) {
            return m.reply(`⚠️ Masih ada hewan buruan aktif! Ketik ${prefix}catch untuk menangkap, atau tunggu dia kabur.`)
        }

        const left = cooldownLeft(owo.lastHuntAnimal, HUNT_ANIMAL_COOLDOWN)
        if (left > 0) return m.reply(`⏳ Masih capek habis berburu. Tunggu ${fmtMs(left)} lagi.`)

        owo.lastHuntAnimal = Date.now()

        const rarityKey = pickRarity(m.isGroup ? m.from : null)
        const rarity = RARITIES[rarityKey]
        const animal = pickAnimal(rarityKey)

        pendingSpawns.set(m.sender, { animalId: animal.id, rarity: rarityKey, expiresAt: Date.now() + CATCH_WINDOW })

        let text = `🌿 Anda masuk semak-semak untuk berburu...\n\n`
        text += `${animal.emoji} Seekor *${animal.name}* muncul! (${rarity.label})\n\n`
        text += `Cepetan tangkap sebelum kabur!\n${prefix}catch — pakai tangan kosong\n${prefix}catch <item> — pakai item tangkap\n\n`
        text += `⏳ Kesempatan hilang dalam ${fmtMs(CATCH_WINDOW)}.`

        progressQuest(m.sender, 'huntAnimal')
        return m.reply(text)
    }
}
