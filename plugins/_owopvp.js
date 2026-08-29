import {
    fmtCowoncy, cooldownLeft, fmtMs, getOwo, getTeam, addAnimalExp,
    PVP_COOLDOWN, PVP_STEAL_RATE, PVP_STEAL_CAP, progressQuest,
    buildFighter, resolveDuelRound, renderHpBar, chooseUltimate,
    pendingDuels, DUEL_ROUND_MS, DUEL_FAST_ROUND_MS, DUEL_MAX_ROUNDS,
    SECRET_SKILLS, ANIMALS_BY_ID
} from '../lib/owo.js'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function ultLine(fighter) {
    if (!fighter.ult.available) return `${fighter.name}: tidak punya hewan Secret di tim (serangan biasa saja).`
    if (fighter.ult.used) return `${fighter.name}: ultimate sudah dipakai ronde ini.`
    const skill = SECRET_SKILLS[fighter.ult.animalId]
    const animalName = ANIMALS_BY_ID[fighter.ult.animalId]?.name
    const pending = fighter.ultIntent ? ' ⏳(sudah disiapkan!)' : ''
    return `${fighter.name}: ${skill.emoji} *${skill.name}* (${animalName}) siap — ketik *ult* untuk lempar!${pending}`
}

function renderRound(fA, fB, round, lines) {
    let out = `⚔️ *DUEL PVP* — Ronde ${round}/${DUEL_MAX_ROUNDS}\n\n`
    out += `${fA.name}\n${renderHpBar(fA.hp, fA.maxHp)}  ${Math.max(0, fA.hp)}/${fA.maxHp}\n\n`
    out += `${fB.name}\n${renderHpBar(fB.hp, fB.maxHp)}  ${Math.max(0, fB.hp)}/${fB.maxHp}\n\n`
    if (lines?.length) out += `📜 *Kejadian ronde lalu:*\n${lines.join('\n')}\n\n`
    out += `🎯 *Ultimate:*\n${ultLine(fA)}\n${ultLine(fB)}\n\n_Balas dengan mengetik *ult* (atau *ult <nama hewan>*) untuk melempar skill sebelum ronde jalan!_`
    return out
}

function renderFinal(fA, fB, round, lines, winner) {
    let out = `🎉🔥 *DUEL SELESAI* 🔥🎉\n\n`
    out += `${fA.name}\n${renderHpBar(fA.hp, fA.maxHp)}  ${Math.max(0, fA.hp)}/${fA.maxHp}\n\n`
    out += `${fB.name}\n${renderHpBar(fB.hp, fB.maxHp)}  ${Math.max(0, fB.hp)}/${fB.maxHp}\n\n`
    if (lines?.length) out += `📜 *Ronde penutup:*\n${lines.join('\n')}\n\n`
    out += `🏆 *${winner.name} JUARA DUEL!* (Ronde ${round})`
    return out
}

export default {
    cmd: ['owopvp'],
    category: 'owo',
    onMessage: async (m) => {
        if (!m || !m.message || m.key?.fromMe) return false
        const raw = (m.body || '').trim()
        if (!/^ult\b/i.test(raw)) return false

        const duel = pendingDuels.get(m.sender)
        if (!duel) return false

        const fighter = duel.fA.jid === m.sender ? duel.fA : duel.fB

        if (!fighter.ult.available) {
            m.reply('⚠️ Anda tidak punya hewan Secret di tim, tidak bisa pakai ultimate.')
            return true
        }
        if (fighter.ult.used) {
            m.reply('⚠️ Ultimate Anda sudah dipakai di duel ini.')
            return true
        }
        if (fighter.ultIntent) {
            m.reply('⏳ Ultimate sudah disiapkan, tunggu rondenya jalan.')
            return true
        }

        const arg = raw.slice(3).trim()
        const picked = chooseUltimate(fighter, arg)
        if (!picked) {
            const opts = fighter.ultOptions.map(id => ANIMALS_BY_ID[id]?.name).join(', ')
            m.reply(`⚠️ Hewan Secret tidak ditemukan di tim Anda. Opsi: ${opts}`)
            return true
        }

        fighter.ultIntent = true
        const skill = SECRET_SKILLS[fighter.ult.animalId]
        m.react('🔥')
        m.reply(`${skill.emoji} *${fighter.name}* menyiapkan *${skill.name}*! Akan meledak begitu ronde jalan.`)
        return true
    },
    run: async (m, { sock, prefix, cmd }) => {
        const target = m.mentionedJid?.[0] || m.quoted?.sender
        if (!target) return m.reply(`❓ Tag atau reply orang yang ingin ditantang.\nContoh: ${prefix + cmd} @orang\n\n💡 Kalau tim Anda punya hewan *Secret*, Anda bisa lempar ultimate saat duel berlangsung dengan mengetik *ult*!`)
        if (target === m.sender) return m.reply('⚠️ Tidak bisa lawan diri sendiri.')

        const owo = getOwo(m.sender)
        const myTeam = getTeam(m.sender)
        const theirTeam = getTeam(target)

        if (!myTeam.length) return m.reply(`⚠️ Tim Anda masih kosong. Atur dulu pakai ${prefix}owoteam set <id1,id2,id3>.`)
        if (!theirTeam.length) return m.reply('⚠️ Tim lawan masih kosong, tidak bisa ditantang.')

        const left = cooldownLeft(owo.lastPvp, PVP_COOLDOWN)
        if (left > 0) return m.reply(`⏳ Tim Anda masih istirahat habis PvP. Tunggu ${fmtMs(left)} lagi.`)

        if (pendingDuels.has(m.sender) || pendingDuels.has(target)) {
            return m.reply('⚠️ Salah satu dari kalian masih ada duel yang sedang berjalan.')
        }

        owo.lastPvp = Date.now()

        const fA = buildFighter(m.sender, `@${m.sender.split('@')[0]}`)
        const fB = buildFighter(target, `@${target.split('@')[0]}`)
        const duel = { fA, fB, round: 1 }

        pendingDuels.set(m.sender, duel)
        pendingDuels.set(target, duel)

        try {
            const sent = await m.reply(renderRound(fA, fB, 1, []), { mentions: [m.sender, target] })

            let winner = null
            let finalLines = []

            for (let round = 1; round <= DUEL_MAX_ROUNDS; round++) {
                duel.round = round
                const hasPendingUlt = (fA.ult.available && !fA.ult.used) || (fB.ult.available && !fB.ult.used)
                await sleep(hasPendingUlt ? DUEL_ROUND_MS : DUEL_FAST_ROUND_MS)

                const lines = resolveDuelRound(fA, fB)

                const isLast = fA.hp <= 0 || fB.hp <= 0 || round === DUEL_MAX_ROUNDS
                if (isLast) {
                    winner = fA.hp === fB.hp ? fA : (fA.hp > fB.hp ? fA : fB)
                    finalLines = lines
                    break
                }

                await sock.sendMessage(m.from, {
                    text: renderRound(fA, fB, round + 1, lines),
                    mentions: [m.sender, target],
                    edit: sent.key
                }).catch(() => {})
            }

            const winnerJid = winner.jid
            const loserJid = winnerJid === m.sender ? target : m.sender
            const winnerOwo = getOwo(winnerJid)
            const loserOwo = getOwo(loserJid)

            const steal = Math.min(PVP_STEAL_CAP, Math.floor(loserOwo.cowoncy * PVP_STEAL_RATE))
            if (steal > 0) {
                loserOwo.cowoncy -= steal
                winnerOwo.cowoncy += steal
                winnerOwo.totalEarned += steal
            }

            const winnerTeam = getTeam(winnerJid)
            const levelUps = []
            for (const id of winnerTeam) {
                const r = addAnimalExp(winnerJid, id, 15)
                if (r.leveledUp) levelUps.push(`${id} naik ke Lv.${r.level}`)
            }
            progressQuest(winnerJid, 'winBattle')

            finalLines.push(`💰 +${fmtCowoncy(steal)} direbut dari lawan`)
            if (levelUps.length) finalLines.push(`⬆️ ${levelUps.join(', ')}`)

            await sock.sendMessage(m.from, {
                text: renderFinal(fA, fB, duel.round, finalLines, winner),
                mentions: [m.sender, target],
                edit: sent.key
            }).catch(() => {})
        } finally {
            pendingDuels.delete(m.sender)
            pendingDuels.delete(target)
        }
    }
}
