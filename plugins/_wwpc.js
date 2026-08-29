import {
    playerOnGame, dataPlayer, getPlayerById2, killWerewolf, dreamySeer, protectGuardian,
    sorcerer, setLovers, checkLovers, roleLabel
} from '../lib/werewolf.js'

export default {
    cmd: ['wwpc'],
    category: 'games',
    run: async (m, { sock, text }) => {
        const sender = m.sender
        sock.werewolf ??= {}
        const ww = sock.werewolf
        const parts = text.trim().split(/ +/)
        const value = parts[0]
        const target = parts[1]

        if (!playerOnGame(sender, ww)) return m.reply('Anda tidak sedang berada dalam sesi permainan.')
        const me = dataPlayer(sender, ww)

        if (value === 'shoot') {
            if (me.role !== 'hunter') return m.reply('Peran ini bukan untuk Anda.')
            if (!me.isdead) return m.reply('Kemampuan ini hanya dapat digunakan setelah Anda gugur.')
            if (me.hunterShotUsed) return m.reply('Anda sudah menggunakan kesempatan terakhir Anda.')
            if (!target) return m.reply('Masukkan nomor pemain.')
            if (isNaN(target)) return m.reply('Gunakan hanya nomor.')
            const byId = getPlayerById2(sender, parseInt(target), ww)
            if (!byId) return m.reply('Pemain tidak terdaftar.')
            if (byId.db.isdead === true) return m.reply('Pemain sudah gugur.')
            if (byId.db.id === sender) return m.reply('Anda tidak dapat menembak diri sendiri.')
            byId.db.isdead = true
            me.hunterShotUsed = true
            const loverCasualties = checkLovers(byId.sesi, ww)
            let msg = `Tembakan terakhir Anda berhasil membunuh player ${parseInt(target)}.`
            if (loverCasualties.length) msg += ` Kematian ini juga membuat pasangan kekasihnya turut gugur.`
            return m.reply(msg)
        }

        if (value === 'algojo') {
            if (me.role !== 'algojo') return m.reply('Peran ini bukan untuk Anda.')
            if (me.isdead) return m.reply('Anda sudah gugur.')
            if (me.algojoUsed) return m.reply('Anda sudah menggunakan peluru terakhir Anda.')
            if (!target) return m.reply('Masukkan nomor pemain.')
            if (isNaN(target)) return m.reply('Gunakan hanya nomor.')
            const byId = getPlayerById2(sender, parseInt(target), ww)
            if (!byId) return m.reply('Pemain tidak terdaftar.')
            if (byId.db.isdead === true) return m.reply('Pemain sudah gugur.')
            if (byId.db.id === sender) return m.reply('Anda tidak dapat menembak diri sendiri.')

            me.algojoUsed = true
            me.status = true
            const targetRole = byId.db.role
            const targetIsEnemy = targetRole === 'werewolf' || targetRole === 'sorcerer'
            byId.db.isdead = true

            if (targetIsEnemy) {
                const loverCasualties = checkLovers(byId.sesi, ww)
                let msg = `Tembakan Anda tepat sasaran. Player ${target} terbukti sebagai ${roleLabel(targetRole)} dan gugur seketika.`
                if (loverCasualties.length) msg += ` Kematian ini juga membuat pasangan kekasihnya turut gugur.`
                return m.reply(msg)
            }
            me.isdead = true
            const loverCasualties = checkLovers(byId.sesi, ww)
            let msg = `Tembakan Anda meleset. Player ${target} yang Anda tembak ternyata warga tak bersalah, dan Anda pun ikut gugur menanggung rasa bersalah.`
            if (loverCasualties.length) msg += ` Kematian ini juga membuat pasangan kekasih yang bersangkutan turut gugur.`
            return m.reply(msg)
        }

        if (value === 'cupid') {
            if (me.role !== 'cupid') return m.reply('Peran ini bukan untuk Anda.')
            if (me.isdead) return m.reply('Anda sudah gugur.')
            if (me.cupidUsed) return m.reply('Anda sudah menggunakan kemampuan ini.')
            const t1 = parts[1], t2 = parts[2]
            if (!t1 || !t2) return m.reply('Masukkan dua nomor pemain, contoh: .wwpc cupid 2 5')
            if (isNaN(t1) || isNaN(t2)) return m.reply('Gunakan hanya nomor.')
            if (t1 === t2) return m.reply('Tidak dapat menjodohkan pemain yang sama.')
            const p1 = getPlayerById2(sender, parseInt(t1), ww)
            const p2 = getPlayerById2(sender, parseInt(t2), ww)
            if (!p1 || !p2) return m.reply('Salah satu pemain tidak terdaftar.')
            if (p1.db.isdead || p2.db.isdead) return m.reply('Tidak dapat menjodohkan pemain yang sudah gugur.')
            setLovers(sender, parseInt(t1), parseInt(t2), ww)
            me.cupidUsed = true
            me.status = true
            return m.reply(`Anda berhasil menjodohkan player ${t1} dan player ${t2} sebagai sepasang kekasih.`)
        }

        if (value === 'skip') {
            const skillRoles = ['werewolf', 'seer', 'guardian', 'sorcerer', 'cupid', 'algojo']
            if (!skillRoles.includes(me.role)) return m.reply('Peran Anda tidak memiliki skill malam untuk dilewati.')
            if (me.isdead === true) return m.reply('Anda sudah gugur.')
            if (me.role === 'algojo' && me.algojoUsed) return m.reply('Peluru Anda sudah digunakan, tidak ada yang perlu dilewati.')
            if (me.status === true) return m.reply('Anda sudah melakukan aksi malam ini.')
            me.status = true
            return m.reply('Anda memilih untuk tidak menggunakan skill malam ini.')
        }

        if (me.status === true) return m.reply('Skill sudah digunakan. Skill hanya dapat digunakan sekali setiap malam.')
        if (me.isdead === true) return m.reply('Anda sudah gugur.')
        if (!target) return m.reply('Masukkan nomor pemain.')
        if (isNaN(target)) return m.reply('Gunakan hanya nomor.')

        const byId = getPlayerById2(sender, parseInt(target), ww)
        if (!byId) return m.reply('Pemain tidak terdaftar.')
        if (byId.db.isdead === true) return m.reply('Pemain sudah gugur.')
        if (byId.db.id === sender) return m.reply('Anda tidak dapat menggunakan skill untuk diri sendiri.')

        if (value === 'kill') {
            if (me.role !== 'werewolf') return m.reply('Peran ini bukan untuk Anda.')
            if (byId.db.role === 'sorcerer') return m.reply('Anda tidak dapat menggunakan skill ini untuk rekan sendiri.')
            await m.reply('Anda berhasil menandai player ' + parseInt(target) + ' untuk dimangsa malam ini.')
            me.status = true
            return killWerewolf(sender, parseInt(target), ww)
        }

        if (value === 'dreamy') {
            if (me.role !== 'seer') return m.reply('Peran ini bukan untuk Anda.')
            const dreamy = dreamySeer(sender, parseInt(target), ww)
            await m.reply(`Anda berhasil membongkar identitas player ${target}: ${roleLabel(dreamy)}.`)
            return me.status = true
        }

        if (value === 'deff') {
            if (me.role !== 'guardian') return m.reply('Peran ini bukan untuk Anda.')
            await m.reply(`Anda berhasil melindungi player ${target}.`)
            protectGuardian(sender, parseInt(target), ww)
            return me.status = true
        }

        if (value === 'sorcerer') {
            if (me.role !== 'sorcerer') return m.reply('Peran ini bukan untuk Anda.')
            const sorker = sorcerer(sender, parseInt(target), ww)
            await m.reply(`Anda berhasil membongkar identitas player ${target}: ${roleLabel(sorker)}.`)
            return me.status = true
        }

        return m.reply('Gunakan: kill / dreamy / deff / sorcerer / cupid / algojo / skip / shoot <nomor>')
    }
}
