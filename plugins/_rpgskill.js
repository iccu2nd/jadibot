import {
    SKILLS, getRpg, hasStarted, skillsForClass, getSkill, extraReqMet, extraReqText,
    hasItems, removeItem, fmtMoney, fmtMs, cooldownLeft, ACTIVE_SKILL_WINDOW
} from '../lib/rpg.js'
import { findClosestCommands } from '../lib/didyoumean.js'

function notFoundText(skillId, mySkills, prefix, cmd) {
    const suggestions = findClosestCommands(skillId, mySkills.map(s => s.id))
    let out = `Skill "${skillId}" tidak ditemukan untuk class Anda.`
    if (suggestions.length) out += ` Mungkin maksud Anda: ${suggestions.join(', ')}?`
    out += `\nKetik ${prefix + cmd} untuk melihat daftar skill lengkap.`
    return out
}

export default {
    cmd: ['skill', 'jurus'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const args = text.trim().toLowerCase().split(/ +/).filter(Boolean)
        const sub = args[0] || ''
        const mySkills = skillsForClass(rpg.class)

        if (sub === 'pelajari' || sub === 'learn') {
            const skillId = args.slice(1).join('_')
            const skill = mySkills.find(s => s.id === skillId)
            if (!skill) return m.reply(notFoundText(skillId, mySkills, prefix, cmd))
            if (rpg.unlockedSkills.includes(skill.id)) return m.reply(`Anda sudah menguasai skill ${skill.name}.`)
            if (rpg.level < skill.levelReq) {
                return m.reply(`Skill ini baru bisa dipelajari mulai level ${skill.levelReq}. Level Anda sekarang ${rpg.level}.`)
            }
            if (!extraReqMet(rpg, skill)) {
                return m.reply(`Syarat tambahan belum terpenuhi: ${extraReqText(skill)}.`)
            }
            if (rpg.money < skill.cost.money) {
                return m.reply(`Money Anda tidak cukup. Butuh ${fmtMoney(skill.cost.money)} money untuk berguru skill ini.`)
            }
            if (!hasItems(rpg, skill.cost.mats)) {
                const matText = Object.entries(skill.cost.mats).map(([id, qty]) => `${id.replace(/_/g, ' ')} x${qty}`).join(', ')
                return m.reply(`Material belum cukup. Butuh ${matText}. Kumpulkan lewat ${prefix}dungeon atau ${prefix}boss.`)
            }
            rpg.money -= skill.cost.money
            for (const [matId, qty] of Object.entries(skill.cost.mats)) removeItem(rpg, matId, qty)
            rpg.unlockedSkills.push(skill.id)
            return m.reply(
                `*SKILL BARU DIKUASAI*\n${skill.name} berhasil dipelajari.\n\n` +
                `${skill.desc}\n\n` +
                `Aktifkan sebelum bertarung dengan ${prefix + cmd} use ${skill.id}, efeknya berlaku untuk satu kali pertarungan berikutnya (hunt, dungeon, duel, boss, atau arena).`
            )
        }

        if (sub === 'pakai' || sub === 'use') {
            const skillId = args.slice(1).join('_')
            const skill = mySkills.find(s => s.id === skillId)
            if (!skill) return m.reply(notFoundText(skillId, mySkills, prefix, cmd))
            if (!rpg.unlockedSkills.includes(skill.id)) return m.reply(`Anda belum menguasai skill ini. Pelajari dulu lewat ${prefix + cmd} learn ${skill.id}.`)
            const left = cooldownLeft(rpg.skillCooldowns?.[skill.id], skill.cooldown)
            if (left > 0) return m.reply(`${skill.name} masih dalam masa pemulihan. Tunggu ${fmtMs(left)} lagi.`)
            rpg.skillCooldowns ??= {}
            rpg.skillCooldowns[skill.id] = Date.now()
            rpg.activeSkill = { id: skill.id, expiresAt: Date.now() + ACTIVE_SKILL_WINDOW }
            const windowMin = Math.floor(ACTIVE_SKILL_WINDOW / 60000)
            const cooldownMin = Math.round(skill.cooldown / 60000)
            return m.reply(
                `*${skill.name} DIAKTIFKAN*\n${skill.desc}\n\n` +
                `Segera lakukan ${prefix}hunt, ${prefix}dungeon, ${prefix}duel, ${prefix}boss, atau ${prefix}arena dalam ${windowMin} menit agar efeknya terpakai.\n\n` +
                `Penting: masa pemulihan skill (${cooldownMin} menit) sudah mulai berjalan dari sekarang, sekalipun efeknya belum sempat Anda pakai. Jangan aktifkan kalau belum siap langsung bertarung.`
            )
        }

        if (!rpg.class) return m.reply(`Anda belum punya class.`)
        let out = `*DAFTAR SKILL - ${rpg.class.toUpperCase()}*\n\n`
        for (const skill of mySkills) {
            const owned = rpg.unlockedSkills.includes(skill.id)
            const label = owned ? `${skill.name} (dikuasai)` : `${skill.name} (terkunci)`
            out += `• ${label} - tier ${skill.tier}\n`
            out += `  ${skill.desc}\n`
            if (!owned) {
                const matText = Object.entries(skill.cost.mats).map(([id, qty]) => `${id.replace(/_/g, ' ')} x${qty}`).join(', ')
                out += `  Syarat: level ${skill.levelReq}, ${fmtMoney(skill.cost.money)} money, ${matText}`
                out += skill.extraReq ? `, ${extraReqText(skill)}\n` : `\n`
            }
            out += `\n`
        }
        out += `Pelajari skill dengan ${prefix + cmd} learn <nama>, contoh: ${prefix + cmd} learn ${mySkills[0].id}\n`
        out += `Aktifkan sebelum bertarung dengan ${prefix + cmd} use <nama>, lalu segera lanjut ke command tarung (hunt/dungeon/duel/boss/arena) agar efeknya tidak hangus.`
        return m.reply(out.trim())
    }
}
