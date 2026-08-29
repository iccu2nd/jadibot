import { getRpg, hasStarted, applyGodmode } from '../lib/rpg.js'
import { getOwo, fmtCowoncy, applyOwoGodmode } from '../lib/owo.js'

export default {
    cmd: ['cheat'],
    category: 'owner',
    run: async (m, { sock, text, prefix, cmd }) => {
        if (!m.isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')

        const target = m.sender
        const args = text.trim().split(/ +/).filter(Boolean)
        const mode = args[0]?.toLowerCase()

        if (mode === 'all') {
            if (!hasStarted(target)) return m.reply('Anda belum punya karakter RPG. Ketik .start dulu sebelum menggunakan godmode.')

            const rpg = getRpg(target)
            applyGodmode(rpg)
            const owo = applyOwoGodmode(target)
            const user = global.db.data.users[target] ??= {}
            user.money = 999999999

            return sock.sendMessage(m.from, {
                text: `👑 *GODMODE AKTIF*\n\nLevel: ${rpg.level}\nATK: ${rpg.atk}\nDEF: ${rpg.def}\nSemua gelar, achievement, dan skill class terbuka\nGear terbaik terpasang\nPet & mount terkuat dimiliki\n\nMoney: ${user.money}\nOWO Cowoncy: ${fmtCowoncy(owo.cowoncy)}`
            }, { quoted: m })
        }

        const amount = parseInt(args[1], 10)

        if (!['owo', 'money'].includes(mode) || !amount || amount <= 0) {
            return m.reply(`*CHEAT (OWNER)*\n\n${prefix + cmd} all - godmode RPG/OWO/money\n${prefix + cmd} owo <jumlah> - tambah OWO cowoncy\n${prefix + cmd} money <jumlah> - tambah money (juga dipakai RPG)\n\nContoh:\n${prefix + cmd} all\n${prefix + cmd} owo 50000\n${prefix + cmd} money 50000\n\nSemua cheat otomatis berlaku untuk akun Anda sendiri.`)
        }

        const results = []

        if (mode === 'owo') {
            const owo = getOwo(target)
            owo.cowoncy += amount
            results.push(`OWO Cowoncy: +${fmtCowoncy(amount)}\nSekarang: ${fmtCowoncy(owo.cowoncy)}`)
        }

        if (mode === 'money') {
            const user = global.db.data.users[target] ??= {}
            user.money = (user.money || 0) + amount
            results.push(`Money: +${amount}\nSekarang: ${user.money}`)
        }

        return sock.sendMessage(m.from, {
            text: `✅ *CHEAT BERHASIL*\n\n${results.join('\n\n')}`
        }, { quoted: m })
    }
}