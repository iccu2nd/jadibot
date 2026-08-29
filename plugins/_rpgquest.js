import { getRpg, hasStarted, addExp, addItem, ITEMS, fmtMoney, checkNewTitles, titleNotifText } from '../lib/rpg.js'

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
function weekStr() {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
    return `${d.getFullYear()}-W${week}`
}

export default {
    cmd: ['quest', 'misi'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const sub = text.trim().toLowerCase()

        if (sub === 'mingguan' || sub === 'weekly') {
            const week = weekStr()
            if (rpg.lastWeeklyQuest === week) {
                return m.reply(`Misi mingguan Anda sudah diambil minggu ini. Kembali lagi minggu depan untuk hadiah yang lebih besar.`)
            }
            rpg.lastWeeklyQuest = week
            const money = 300 + Math.floor(60 * Math.sqrt(rpg.level))
            const exp = 150 + rpg.level * 10
            const material = rpg.level >= 25 ? 'pecahan_abyss' : rpg.level >= 12 ? 'inti_iblis' : 'kristal_sihir'
            rpg.money += money
            addItem(rpg, material, 2)
            const levelUps = addExp(rpg, exp)
            let out = `*MISI MINGGUAN SELESAI*\n\n`
            out += `- *Money didapat:* ${fmtMoney(money)}\n`
            out += `- *EXP didapat:* ${exp}\n`
            out += `- *Material didapat:* ${ITEMS[material].name} x2\n`
            if (levelUps.length) out += `- *Level naik jadi:* ${levelUps[levelUps.length - 1].level}\n`
            out += `\nMisi mingguan reset tiap Senin. Ketik ${prefix + cmd} untuk mengambil misi harian juga.`
            const gained = checkNewTitles(rpg)
            out += titleNotifText(gained, prefix)
            return m.reply(out)
        }

        const today = todayStr()
        if (rpg.lastQuest === today) {
            return m.reply(`Misi harian Anda sudah diambil hari ini. Kembali lagi besok.\n\nSudah cek misi mingguan? Ketik ${prefix + cmd} mingguan.`)
        }
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
        rpg.questStreak = rpg.lastQuest === yesterday ? (rpg.questStreak || 0) + 1 : 1
        rpg.lastQuest = today
        const money = 40 + Math.floor(15 * Math.sqrt(rpg.level)) + Math.min(rpg.questStreak, 10) * 5
        const exp = 20 + rpg.level * 3
        rpg.money += money
        const levelUps = addExp(rpg, exp)
        let text2 = `*MISI HARIAN SELESAI*\n\n`
        text2 += `- *Money didapat:* ${fmtMoney(money)}\n`
        text2 += `- *EXP didapat:* ${exp}\n`
        text2 += `- *Streak misi:* ${rpg.questStreak} hari\n`
        if (levelUps.length) text2 += `- *Level naik jadi:* ${levelUps[levelUps.length - 1].level}\n`
        text2 += `\nKembali lagi besok untuk mengambil misi selanjutnya. Ada juga misi mingguan dengan hadiah lebih besar, ketik ${prefix + cmd} mingguan.`
        const gained = checkNewTitles(rpg)
        text2 += titleNotifText(gained, prefix)
        return m.reply(text2)
    }
}
