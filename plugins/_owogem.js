import { getOwo, GEMS, GEM_CAP, applyGem, progressQuest } from '../lib/owo.js'

const EFFECT_LABEL = { atk: 'ATK', def: 'DEF', exp: 'EXP battle', catch: 'Peluang tangkap', earn: 'Cowoncy earn' }

export default {
    cmd: ['owogem'],
    category: 'owo',
    run: async (m, { sock, text, prefix, cmd }) => {
        const owo = getOwo(m.sender)
        const args = text.trim().split(/ +/).filter(Boolean)
        const sub = (args[0] || '').toLowerCase()

        if (sub === 'apply') {
            const gemId = (args[1] || '').toLowerCase()
            const gem = GEMS[gemId]
            if (!gem) return m.reply(`⚠️ Gem tidak ditemukan. Pilihan: ${Object.keys(GEMS).join(', ')}.`)

            const result = applyGem(m.sender, gemId)
            if (!result.ok) {
                const msg = {
                    notfound: '⚠️ Gem tidak dikenal.',
                    none: `⚠️ Anda tidak punya gem *${gem.name}*. Mendapatkan dari ${prefix}owolootbox.`,
                    capped: `⚠️ Bonus *${EFFECT_LABEL[gem.effect]}* dari gem sudah mentok di ${Math.round(GEM_CAP * 100)}%, gem ini tidak bisa dipakai lagi.`
                }[result.reason]
                return m.reply(msg)
            }

            progressQuest(m.sender, 'applyGem')
            return m.reply(`✅ ${gem.emoji} *${gem.name}* dipakai!\n+${Math.round(result.applied * 100)}% ${EFFECT_LABEL[gem.effect]}\n\nTotal bonus ${EFFECT_LABEL[gem.effect]} sekarang: ${Math.round(result.total * 100)}% (maks ${Math.round(GEM_CAP * 100)}%)`)
        }

        let out = `💎 *GEM OWO*\n\n`
        for (const [id, gem] of Object.entries(GEMS)) {
            const owned = owo.gems[id] || 0
            const currentBonus = owo.gemBonus[gem.effect] || 0
            out += `${gem.emoji} *${gem.name}* (${id})\n  ${gem.desc}\n  Punya: ${owned}x | Bonus terpasang: ${Math.round(currentBonus * 100)}%/${Math.round(GEM_CAP * 100)}%\n\n`
        }
        out += `Mendapatkan gem dari ${prefix}owolootbox.`

        const rows = Object.entries(GEMS).map(([id, gem]) => {
            const owned = owo.gems[id] || 0
            const currentBonus = owo.gemBonus[gem.effect] || 0
            const capped = currentBonus >= GEM_CAP
            return {
                header: capped ? 'MENTOK' : `punya ${owned}x`,
                title: `${gem.emoji} Pakai ${gem.name}`,
                description: gem.desc,
                id: `${prefix}${cmd} apply ${id}`
            }
        })

        return sock.sendInteractiveButton(m.from, {
            body: out,
            footer: 'pilih gem lewat tombol untuk langsung dipakai',
            buttons: [
                { type: 'list', label: 'Pakai Gem', sections: [{ title: 'Gem Anda', rows }] }
            ]
        }, { quoted: m })
    }
}
