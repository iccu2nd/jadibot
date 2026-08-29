import { pendingSpawns, ANIMALS_BY_ID, RARITIES, CATCH_ITEMS, rollCatch, addToZoo, useCatchItem, zooCount, progressQuest } from '../lib/owo.js'

export default {
    cmd: ['catch', 'tangkap'],
    category: 'owo',
    run: async (m, { text, prefix }) => {
        const pending = pendingSpawns.get(m.sender)
        if (!pending) return m.reply(`❓ Belum ada hewan buruan. Ketik ${prefix}huntanimal dulu untuk cari hewan.`)

        if (pending.expiresAt <= Date.now()) {
            pendingSpawns.delete(m.sender)
            return m.reply(`💨 Hewan buruannya sudah kabur lebih dahulu. Coba lagi ${prefix}huntanimal.`)
        }

        const itemKey = (text.trim().toLowerCase() || 'tangan')
        const item = CATCH_ITEMS[itemKey]
        if (!item) return m.reply(`⚠️ Item tidak dikenal. Pilihan: ${Object.keys(CATCH_ITEMS).join(', ')}.`)

        if (itemKey !== 'tangan') {
            const used = useCatchItem(m.sender, itemKey)
            if (!used) return m.reply(`⚠️ Anda tidak punya *${item.name}*. Beli dulu di ${prefix}owoshop.`)
        }

        const animal = ANIMALS_BY_ID[pending.animalId]
        const rarity = RARITIES[pending.rarity]
        const success = rollCatch(pending.rarity, itemKey, m.sender)

        pendingSpawns.delete(m.sender)

        if (!success) {
            let fail = `💨 Yah, *${animal.name}* ${animal.emoji} berhasil kabur!\n`
            fail += itemKey !== 'tangan' ? `${item.name} terpakai tapi gagal menangkap.` : `Coba pakai item tangkap agar peluangnya lebih besar.`
            return m.reply(fail)
        }

        addToZoo(m.sender, animal.id)
        const owned = zooCount(m.sender, animal.id)

        progressQuest(m.sender, 'catchAny')
        if (['epic', 'mythical', 'legendary', 'rahasia'].includes(pending.rarity)) progressQuest(m.sender, 'catchEpicPlus')

        let out = `🎉 *BERHASIL DITANGKAP!*\n\n`
        out += `${animal.emoji} *${animal.name}* (${rarity.label}) masuk ke kandang Anda!\n`
        const isBigCatch = pending.rarity === 'legendary' || pending.rarity === 'rahasia'
        if (pending.rarity === 'rahasia') out += `\n🌌 GILAAA ini hewan paling langka yang ada di OwO, jarang sangat ada yang berhasil mendapatkan ini!\n`
        else if (pending.rarity === 'legendary') out += `\n🏆 Tangkapan Legendary! Salah satu hewan terkuat di OwO berhasil masuk kandang @${m.sender.split('@')[0]}.\n`
        out += `📦 Total dimiliki: ${owned}x\n\n`
        out += `Cek koleksi Anda di ${prefix}owozoo`

        return m.reply(out, isBigCatch ? { mentions: [m.sender] } : undefined)
    }
}
