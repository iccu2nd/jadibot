import { MOUNTS, getRpg, hasStarted, fmtMoney } from '../lib/rpg.js'

export default {
    cmd: ['mount', 'tunggangan', 'kendaraan'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const args = text.trim().toLowerCase().split(/ +/).filter(Boolean)
        const sub = args[0] || ''

        if (!sub) {
            let out = `*TUNGGANGAN*\n`
            if (rpg.mount && MOUNTS[rpg.mount]) {
                const mnt = MOUNTS[rpg.mount]
                out += `Tunggangan Anda: ${mnt.name}\nBonus serang : +${mnt.atk}\nBonus bertahan : +${mnt.def}\n\n`
            } else {
                out += `Anda belum punya tunggangan.\n\n`
            }
            out += `*DAFTAR TUNGGANGAN*\n`
            out += Object.entries(MOUNTS).map(([id, mnt]) =>
                `• ${mnt.name} (${id}) - butuh level ${mnt.levelReq}, bonus serang +${mnt.atk}, bertahan +${mnt.def}, harga ${fmtMoney(mnt.price)}`
            ).join('\n')
            out += `\n\nBeli/ganti dengan ${prefix + cmd} buy <nama tunggangan>. Bonusnya menumpuk dengan peliharaan (${prefix}pet), tidak saling menggantikan.`
            return m.reply(out)
        }

        if (sub === 'beli' || sub === 'buy') {
            const mountId = args.slice(1).join('_')
            const mnt = MOUNTS[mountId]
            if (!mnt) return m.reply(`Tunggangan tidak ditemukan. Ketik ${prefix + cmd} untuk melihat daftar tunggangan.`)
            if (rpg.mount === mountId) return m.reply(`Anda sudah memakai ${mnt.name}.`)
            if (rpg.level < mnt.levelReq) return m.reply(`Butuh level ${mnt.levelReq} untuk memakai ${mnt.name}. Level Anda sekarang ${rpg.level}.`)
            if (rpg.money < mnt.price) return m.reply(`Money tidak cukup. Butuh ${fmtMoney(mnt.price)} money.`)
            rpg.money -= mnt.price
            rpg.mount = mountId
            return m.reply(`Sekarang Anda menunggangi *${mnt.name}*! Bonus tarung langsung aktif otomatis di semua mode tarung. Sisa money ${fmtMoney(rpg.money)} money.`)
        }

        if (sub === 'lepas' || sub === 'release') {
            if (!rpg.mount) return m.reply(`Anda belum punya tunggangan.`)
            rpg.mount = null
            return m.reply(`Tunggangan sudah dilepas. Beli lagi kapan saja lewat ${prefix + cmd} buy.`)
        }

        return m.reply(`Perintah tidak dikenali. Gunakan ${prefix + cmd}, ${prefix + cmd} buy <nama>, atau ${prefix + cmd} release.`)
    }
}
