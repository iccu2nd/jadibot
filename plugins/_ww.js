import {
    emoji_role, roleLabel, playerOnGame, playerOnRoom, playerExit, dataPlayer, getPlayerById,
    roleGenerator, addTimer, startGame, clearAllVote, vote, voteSkip, run, phaseFor,
    waitPhase, allFirstNightActionsDone
} from '../lib/werewolf.js'
import { getContact } from '../lib/database.js'

const strip = (id) => `@${id.replace('@s.whatsapp.net', '')}`
const getName = (id) => getContact(id)?.pushname || id.split('@')[0]

const skipHint = '\nTidak ingin atau tidak sempat menggunakan skill? Ketik *.wwpc skip*.\nJika seluruh peran aktif malam ini telah bertindak atau melewati giliran, fase ini akan berlanjut ke pagi lebih cepat.'

const firstNightPrompt = (p, list1, list2) => {
    const name = getName(p.id)
    if (p.role === 'werewolf') return `*WEREWOLF - MALAM PERTAMA*\n\nHalo ${name}, Anda terpilih sebagai Werewolf ${emoji_role('werewolf')}.\n\nPilih satu orang untuk dimangsa malam ini.\n*DAFTAR PEMAIN*:\n${list2}\nKetik *.wwpc kill nomor* untuk membunuh pemain.${skipHint}`
    if (p.role === 'warga') return `*WEREWOLF - MALAM PERTAMA*\n\nHalo ${name}, peran Anda adalah Warga Desa ${emoji_role('warga')}.\n*DAFTAR PEMAIN*:\n${list1}\nTidak ada aksi untuk Anda saat ini. Cukup tunggu kabar dari GRUP setiap pagi dan ikuti diskusi/pemungutan suara di sana. Tetaplah waspada, Werewolf mungkin akan memangsa Anda malam ini.`
    if (p.role === 'seer') return `*WEREWOLF - MALAM PERTAMA*\n\nHalo ${name}, Anda terpilih sebagai Penerawang ${emoji_role('seer')}.\n\nPilih satu orang untuk diintip perannya.\n*DAFTAR PEMAIN*:\n${list1}\nKetik *.wwpc dreamy nomor* untuk melihat peran pemain.${skipHint}`
    if (p.role === 'guardian') return `*WEREWOLF - MALAM PERTAMA*\n\nHalo ${name}, Anda terpilih sebagai Malaikat Pelindung ${emoji_role('guardian')}.\n\nPilih satu orang untuk dilindungi dari serangan Werewolf.\n*DAFTAR PEMAIN*:\n${list1}\nKetik *.wwpc deff nomor* untuk melindungi pemain.${skipHint}`
    if (p.role === 'sorcerer') return `*WEREWOLF - MALAM PERTAMA*\n\nHalo ${name}, Anda terpilih sebagai Penyihir ${emoji_role('sorcerer')}.\n\nPilih satu orang untuk dibongkar identitasnya.\n*DAFTAR PEMAIN*:\n${list2}\nKetik *.wwpc sorcerer nomor* untuk melihat peran pemain.${skipHint}`
    if (p.role === 'hunter') return `*WEREWOLF - MALAM PERTAMA*\n\nHalo ${name}, peran Anda adalah Pemburu ${emoji_role('hunter')}. Sehari-hari Anda terlihat seperti warga biasa.\n*DAFTAR PEMAIN*:\n${list1}\nTidak ada aksi untuk Anda saat ini, cukup tunggu. Namun jika Anda gugur (dimangsa Werewolf atau dieksekusi), Anda masih memiliki satu kesempatan terakhir menembak mati satu pemain lain lewat *.wwpc shoot nomor*.`
    if (p.role === 'cupid') return `*WEREWOLF - MALAM PERTAMA*\n\nHalo ${name}, Anda terpilih sebagai Dukun Cinta ${emoji_role('cupid')}.\n\nPilih dua orang untuk dijodohkan menjadi sepasang kekasih. Jika salah satu dari mereka gugur, pasangannya akan ikut gugur karena patah hati. Kemampuan ini hanya dapat digunakan malam ini.\n*DAFTAR PEMAIN*:\n${list1}\nKetik *.wwpc cupid nomor1 nomor2* untuk menjodohkan dua pemain, contoh: .wwpc cupid 2 5.${skipHint}`
    if (p.role === 'algojo') return `*WEREWOLF - MALAM PERTAMA*\n\nHalo ${name}, Anda terpilih sebagai Algojo ${emoji_role('algojo')}.\n\nAnda memiliki satu peluru yang dapat digunakan kapan saja pada malam hari untuk menembak satu pemain yang Anda curigai sebagai Werewolf atau Penyihir. Jika tembakan Anda tepat sasaran, pemain tersebut gugur. Namun jika target Anda ternyata warga tak bersalah, Anda juga akan gugur akibat rasa bersalah. Kemampuan ini hanya dapat digunakan sekali seumur permainan.\n*DAFTAR PEMAIN*:\n${list1}\nKetik *.wwpc algojo nomor* untuk menembak, atau *.wwpc skip* untuk menyimpan peluru malam ini.`
    return ''
}

export default {
    cmd: ['ww'],
    category: 'games',
    run: async (m, { sock, text }) => {
        if (!m.isGroup) return m.reply('Perintah ini hanya dapat digunakan di dalam grup.')
        const sender = m.sender
        const chat = m.chat
        sock.werewolf ??= {}
        const ww = sock.werewolf
        const [value, target] = text.trim().split(/ +/)

        if (value === 'create') {
            if (chat in ww) return m.reply('Grup ini masih memiliki sesi permainan yang berjalan.')
            if (playerOnGame(sender, ww)) return m.reply('Anda masih berada dalam sesi permainan lain.')
            ww[chat] = {
                room: chat, owner: sender, status: false, running: false, iswin: null, cooldown: null,
                day: 0, time: 'malem', player: [], dead: [], voting: false, seer: false, guardian: [], lovers: null
            }
            return m.reply('Room berhasil dibuat. Ketik *.ww join* untuk bergabung.')
        }

        if (value === 'join') {
            if (!ww[chat]) return m.reply('Belum ada sesi permainan di grup ini.')
            if (ww[chat].status === true) return m.reply('Sesi permainan sudah dimulai.')
            if (ww[chat].player.length >= 16) return m.reply('Maaf, jumlah pemain sudah penuh.')
            if (playerOnRoom(sender, chat, ww)) return m.reply('Anda sudah bergabung dalam room ini.')
            if (playerOnGame(sender, ww)) return m.reply('Anda masih berada dalam sesi permainan lain.')
            ww[chat].player.push({
                id: sender, number: ww[chat].player.length + 1, sesi: chat, status: false,
                role: false, effect: [], vote: 0, isdead: false, isvote: false,
                hunterShotUsed: false, algojoUsed: false, cupidUsed: false
            })
            let text2 = '\n*WEREWOLF - DAFTAR PEMAIN*\n\n'
            const ment = []
            for (const p of ww[chat].player) { text2 += `${p.number}) ${strip(p.id)}\n`; ment.push(p.id) }
            text2 += '\nJumlah pemain minimal 5 orang, maksimal 15 orang.'
            return sock.sendMessage(chat, { text: text2.trim(), mentions: ment }, { quoted: m })
        }

        if (value === 'start') {
            if (!ww[chat]) return m.reply('Belum ada sesi permainan di grup ini.')
            if (ww[chat].player.length === 0) return m.reply('Room belum memiliki pemain.')
            if (ww[chat].player.length < 5) return m.reply('Maaf, jumlah pemain belum memenuhi syarat minimal.')
            if (!playerOnRoom(sender, chat, ww)) return m.reply('Anda belum bergabung dalam room ini.')

            if (ww[chat].status === true) {
                if (ww[chat].running) return m.reply('Sesi permainan sedang berlangsung, silakan tunggu instruksi fase berikutnya di grup ini atau di pesan pribadi.')

                clearAllVote(chat, ww)
                addTimer(chat, ww)
                return run(sock, chat, ww, phaseFor(ww[chat].time))
            }

            if (ww[chat].owner !== sender) return m.reply(`Hanya ${strip(ww[chat].owner)} yang dapat memulai permainan ini.`)

            roleGenerator(chat, ww)
            addTimer(chat, ww)
            startGame(chat, ww)

            let list1 = '', list2 = ''
            const allIds = ww[chat].player.map(p => p.id)
            for (const p of ww[chat].player) list1 += `(${p.number}) ${strip(p.id)}\n`
            for (const p of ww[chat].player) list2 += `(${p.number}) ${strip(p.id)} ${(p.role === 'werewolf' || p.role === 'sorcerer') ? `[${p.role}]` : ''}\n`

            for (const p of ww[chat].player) {
                if (p.isdead) continue
                const dmText = firstNightPrompt(p, list1, list2)
                if (dmText) await sock.sendMessage(p.id, { text: dmText, mentions: allIds })
            }

            await sock.sendMessage(chat, {
                text: '*WEREWOLF - PERMAINAN DIMULAI*\n\nBerikut alur permainannya:\n\n1. Periksa pesan pribadi Anda dengan bot sekarang, di sana terdapat peran dan instruksi Anda.\n2. Jika peran Anda memiliki aksi malam (Werewolf/Penerawang/Guardian/Penyihir/Dukun Cinta/Algojo), ikuti instruksi di pesan pribadi menggunakan *.wwpc ...*, atau ketik *.wwpc skip* jika tidak ingin menggunakan skill.\n3. Jika peran Anda tidak memiliki aksi malam (Warga/Pemburu), Anda cukup menunggu.\n4. Setiap pagi dan pemungutan suara, diskusi dan voting dilakukan di GRUP INI menggunakan *.ww vote nomor* (atau *.ww skip*).\n5. Setiap fase akan berlanjut otomatis begitu seluruh pemain yang wajib bertindak telah selesai, tanpa perlu menunggu 1 menit penuh.\n6. Ketik *.ww player* kapan saja untuk memeriksa daftar pemain yang masih hidup.\n\nBerhati-hatilah, malam ini mungkin menjadi malam terakhir bagi sebagian dari Anda.',
                mentions: allIds
            })

            const skippedEarly = await waitPhase(chat, ww, allFirstNightActionsDone)
            if (skippedEarly) {
                await sock.sendMessage(chat, { text: 'Seluruh pemain dengan peran malam telah bertindak (atau melewati giliran), permainan dilanjutkan ke pagi lebih cepat.' }).catch(() => {})
            }
            return run(sock, chat, ww)
        }

        if (value === 'vote') {
            if (!ww[chat]) return m.reply('Belum ada sesi permainan di grup ini.')
            if (ww[chat].status === false) return m.reply('Sesi permainan belum dimulai.')
            if (ww[chat].time !== 'voting') return m.reply('Sesi pemungutan suara belum dimulai.')
            if (!playerOnRoom(sender, chat, ww)) return m.reply('Anda bukan pemain dalam sesi ini.')
            if (dataPlayer(sender, ww).isdead === true) return m.reply('Anda sudah gugur.')
            if (!target) return m.reply('Masukkan nomor pemain.')
            if (isNaN(target)) return m.reply('Gunakan hanya nomor.')
            if (dataPlayer(sender, ww).isvote === true) return m.reply('Anda sudah melakukan pemungutan suara.')
            const b = getPlayerById(chat, sender, parseInt(target), ww)
            if (!b) return m.reply('Pemain tidak terdaftar.')
            if (b.db.isdead === true) return m.reply(`Pemain ${target} sudah gugur.`)
            vote(chat, parseInt(target), sender, ww)
            return m.reply('Suara Anda telah diterima.')
        }

        if (value === 'skip') {
            if (!ww[chat]) return m.reply('Belum ada sesi permainan di grup ini.')
            if (ww[chat].status === false) return m.reply('Sesi permainan belum dimulai.')
            if (ww[chat].time !== 'voting') return m.reply('Sesi pemungutan suara belum dimulai.')
            if (!playerOnRoom(sender, chat, ww)) return m.reply('Anda bukan pemain dalam sesi ini.')
            if (dataPlayer(sender, ww).isdead === true) return m.reply('Anda sudah gugur.')
            if (dataPlayer(sender, ww).isvote === true) return m.reply('Anda sudah melakukan pemungutan suara.')
            voteSkip(chat, sender, ww)
            return m.reply('Anda memilih untuk melewati pemungutan suara kali ini.')
        }

        if (value === 'exit') {
            if (!ww[chat]) return m.reply('Tidak ada sesi permainan di grup ini.')
            if (!playerOnRoom(sender, chat, ww)) return m.reply('Anda tidak berada dalam sesi permainan ini.')
            if (ww[chat].status === true) return m.reply('Permainan sudah dimulai, Anda tidak dapat keluar.')
            await m.reply(`${strip(sender)} keluar dari permainan.`)
            return playerExit(chat, sender, ww)
        }

        if (value === 'delete') {
            if (!ww[chat]) return m.reply('Tidak ada sesi permainan di grup ini.')
            if (ww[chat].owner !== sender) return m.reply(`Hanya ${strip(ww[chat].owner)} yang dapat menghapus sesi permainan ini.`)
            await m.reply('Sesi permainan berhasil dihapus.')
            return delete ww[chat]
        }

        if (value === 'player') {
            if (!ww[chat]) return m.reply('Tidak ada sesi permainan di grup ini.')
            if (!playerOnRoom(sender, chat, ww)) return m.reply('Anda tidak berada dalam sesi permainan ini.')
            if (ww[chat].player.length === 0) return m.reply('Sesi permainan belum memiliki pemain.')
            let text2 = '\n*WEREWOLF - DAFTAR PEMAIN*\n\n'
            const ment = []
            for (const p of ww[chat].player) { text2 += `(${p.number}) ${strip(p.id)} ${p.isdead ? `(gugur) ${roleLabel(p.role)}` : ''}\n`; ment.push(p.id) }
            return sock.sendMessage(chat, { text: text2, mentions: ment }, { quoted: m })
        }

        let helpText = '\n*WEREWOLF - PERMAINAN*\n\nPermainan sosial berbasis peran yang berlangsung dalam beberapa ronde. Para pemain harus menemukan siapa saja "penjahat" (Werewolf dan Penyihir) yang bersembunyi di antara warga.\n\n*DAFTAR PERINTAH*\n'
        helpText += ' • ww create\n • ww join\n • ww start\n • ww vote <nomor>\n • ww skip (melewati pemungutan suara)\n • ww exit\n • ww delete\n • ww player\n'
        helpText += '\n*DAFTAR PERAN*\n'
        helpText += ` • Werewolf ${emoji_role('werewolf')} — memangsa 1 warga setiap malam (.wwpc kill)\n • Penerawang ${emoji_role('seer')} — mengintip peran pemain (.wwpc dreamy)\n • Malaikat Pelindung ${emoji_role('guardian')} — melindungi 1 pemain (.wwpc deff)\n • Penyihir ${emoji_role('sorcerer')} — membongkar identitas pemain (.wwpc sorcerer)\n • Pemburu ${emoji_role('hunter')} — jika gugur, menembak 1 pemain lain (.wwpc shoot)\n • Dukun Cinta ${emoji_role('cupid')} — menjodohkan 2 pemain di malam pertama, jika salah satu gugur pasangannya ikut gugur (.wwpc cupid)\n • Algojo ${emoji_role('algojo')} — memiliki 1 peluru rahasia, jika salah target ia ikut gugur (.wwpc algojo)\n • Warga ${emoji_role('warga')} — mencari dan memilih siapa penjahatnya\n`
        helpText += '\n*ALUR SINGKAT*\n'
        helpText += ' • Malam: peran aktif (Werewolf/Penerawang/Guardian/Penyihir/Dukun Cinta/Algojo) bertindak lewat pesan pribadi menggunakan *.wwpc ...* atau *.wwpc skip*.\n • Pagi dan Pemungutan Suara: diskusi dan voting dilakukan di GRUP INI menggunakan *.ww vote nomor* atau *.ww skip*.\n • Setiap fase berdurasi 1 menit, namun akan berlanjut otomatis lebih cepat begitu seluruh pemain yang wajib bertindak telah selesai.\n'
        helpText += '\nPemenang mendapat reward money dan exp, yang kalah tetap mendapat reward (tidak nol), dan yang bertahan hidup sampai akhir mendapat bonus tambahan.'
        helpText += '\n\nPermainan ini dapat dimainkan oleh 5 sampai 15 orang.'
        return m.reply(helpText.trim())
    }
}
