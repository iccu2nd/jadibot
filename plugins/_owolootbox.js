import { getOwo, fmtCowoncy, LOOTBOXES, addLootbox, openLootbox, CATCH_ITEMS, progressQuest, cooldownLeft, fmtMs, LOOTBOX_COOLDOWN } from '../lib/owo.js'

export default {
    cmd: ['owolootbox', 'owolb'],
    category: 'owo',
    run: async (m, { sock, text, prefix, cmd }) => {
        const owo = getOwo(m.sender)
        const args = text.trim().split(/ +/).filter(Boolean)
        const sub = (args[0] || '').toLowerCase()

        if (sub === 'buy') {
            const tier = (args[1] || '').toLowerCase()
            const qty = parseInt(args[2]) || 1
            const box = LOOTBOXES[tier]
            if (!box) return m.reply(`⚠️ Tier tidak ditemukan. Pilihan: ${Object.keys(LOOTBOXES).join(', ')}.`)
            if (qty < 1) return m.reply('⚠️ Jumlah tidak valid.')

            const total = box.price * qty
            if (owo.cowoncy < total) return m.reply(`💸 Saldo Anda tidak cukup. Butuh ${fmtCowoncy(total)}, saldo Anda ${fmtCowoncy(owo.cowoncy)}.`)

            owo.cowoncy -= total
            const newCount = addLootbox(m.sender, tier, qty)

            return m.reply(`✅ Berhasil beli ${qty}x ${box.emoji} *${box.name}* seharga ${fmtCowoncy(total)}.\nStok sekarang: ${newCount}x\n\nBuka pakai ${prefix}${cmd} open ${tier}`)
        }

        if (sub === 'open') {
            const tier = (args[1] || '').toLowerCase()
            const box = LOOTBOXES[tier]
            if (!box) return m.reply(`⚠️ Tier tidak ditemukan. Pilihan: ${Object.keys(LOOTBOXES).join(', ')}.`)

            const owned = owo.lootboxes[tier] || 0
            if (owned < 1) return m.reply(`⚠️ Anda tidak punya ${box.emoji} *${box.name}*. Beli dulu: ${prefix}${cmd} buy ${tier}`)

            const left = cooldownLeft(owo.lastLootbox, LOOTBOX_COOLDOWN)
            if (left > 0) return m.reply(`⏳ Tunggu ${fmtMs(left)} lagi sebelum buka lootbox lagi.`)
            owo.lastLootbox = Date.now()

            const result = openLootbox(m.sender, tier)
            if (!result.ok) return m.reply('⚠️ Gagal buka lootbox, coba lagi.')
            progressQuest(m.sender, 'openLootbox')

            let out = `${box.emoji} *${box.name}* dibuka!\n\n`
            if (result.type === 'cowoncy') out += `🦴 Anda dapat ${fmtCowoncy(result.amount)}!`
            else if (result.type === 'essence') out += `🧪 Anda dapat ${result.amount} essence!`
            else if (result.type === 'catchItem') out += `🎒 Anda dapat 1x *${CATCH_ITEMS[result.item]?.name || result.item}*!`
            else if (result.type === 'gem') out += `💎 JACKPOT! Anda dapat 1x gem *${result.gem}*!\nPakai ${prefix}owogem apply ${result.gem} untuk aktifkan bonusnya.`

            const remaining = getOwo(m.sender).lootboxes[tier] || 0
            out += `\n\nSisa ${box.emoji} ${box.name}: ${remaining}x`

            return m.reply(out)
        }

        let out = `🎁 *OWO LOOTBOX*\n\n`
        for (const [tier, box] of Object.entries(LOOTBOXES)) {
            const owned = owo.lootboxes[tier] || 0
            out += `${box.emoji} *${box.name}* (${tier})\n  Harga: ${fmtCowoncy(box.price)} | Punya: ${owned}x\n\n`
        }
        out += `Saldo Anda: ${fmtCowoncy(owo.cowoncy)}`

        const buyRows = Object.entries(LOOTBOXES).map(([tier, box]) => ({
            header: fmtCowoncy(box.price),
            title: `${box.emoji} Beli 1x ${box.name}`,
            description: `punya ${owo.lootboxes[tier] || 0}x`,
            id: `${prefix}${cmd} buy ${tier} 1`
        }))

        const openRows = Object.entries(LOOTBOXES).map(([tier, box]) => {
            const owned = owo.lootboxes[tier] || 0
            return {
                header: owned > 0 ? `punya ${owned}x` : 'kosong',
                title: `${box.emoji} Buka 1x ${box.name}`,
                description: `Tier: ${tier}`,
                id: `${prefix}${cmd} open ${tier}`
            }
        })

        return sock.sendInteractiveButton(m.from, {
            body: out,
            footer: 'pilih lewat tombol untuk beli/buka',
            buttons: [
                {
                    type: 'list',
                    label: 'Beli / Buka',
                    sections: [
                        { title: 'Beli Lootbox', rows: buyRows },
                        { title: 'Buka Lootbox', rows: openRows }
                    ]
                }
            ]
        }, { quoted: m })
    }
}
