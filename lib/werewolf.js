import { getRpg, addExp, hasStarted, fmtMoney } from './rpg.js'

const emoji_role = (role) => ({
    warga: '👱‍♂️', seer: '👳', guardian: '👼', sorcerer: '🔮',
    werewolf: '🐺', hunter: '🏹', cupid: '💘', algojo: '🎯'
}[role] || '')

const roleLabel = (role) => ({
    warga: 'Warga Desa', seer: 'Penerawang', guardian: 'Malaikat Pelindung', sorcerer: 'Penyihir',
    werewolf: 'Werewolf', hunter: 'Pemburu', cupid: 'Dukun Cinta', algojo: 'Algojo'
}[role] || role)

const findObject = (obj = {}, key, value) => {
    const result = []
    const walk = (o = {}) => {
        if (!o || typeof o !== 'object') return
        if (o[key] === value) result.push(o)
        Object.keys(o).forEach(k => walk(o[k]))
    }
    walk(obj)
    return result
}

const sesi = (from, data) => data[from] || false

const playerOnGame = (sender, data) => findObject(data, 'id', sender).length > 0

const playerOnRoom = (sender, from, data) => {
    const result = findObject(data, 'id', sender)
    return result.length > 0 && result[0].sesi === from
}

const dataPlayer = (sender, data) => {
    const result = findObject(data, 'id', sender)
    return (result.length > 0 && result[0].id === sender) ? result[0] : false
}

const dataPlayerById = (id, data) => {
    const result = findObject(data, 'number', id)
    return (result.length > 0 && result[0].number === id) ? result[0] : false
}

const playerExit = (from, id, data) => {
    const room = sesi(from, data)
    if (!room) return false
    const idx = room.player.findIndex(i => i.id === id)
    if (idx !== -1) room.player.splice(idx, 1)
}

const getPlayerById = (from, sender, id, data) => {
    const room = sesi(from, data)
    if (!room) return false
    const idx = room.player.findIndex(i => i.number === id)
    if (idx === -1) return false
    return { index: idx, sesi: room.player[idx].sesi, db: room.player[idx] }
}

const getPlayerById2 = (sender, id, data) => {
    const result = findObject(data, 'id', sender)
    if (result.length === 0 || result[0].id !== sender) return false
    const from = result[0].sesi
    const room = sesi(from, data)
    if (!room) return false
    const idx = room.player.findIndex(i => i.number === id)
    if (idx === -1) return false
    return { index: idx, sesi: room.player[idx].sesi, db: room.player[idx] }
}

const killWerewolf = (sender, id, data) => {
    const result = getPlayerById2(sender, id, data)
    if (!result) return false
    const { sesi: s, db } = result
    if (db.effect.includes('guardian')) {
        data[s].guardian.push(parseInt(id))
        data[s].dead.push(parseInt(id))
    } else {
        data[s].dead.push(parseInt(id))
    }
}

const dreamySeer = (sender, id, data) => {
    const result = getPlayerById2(sender, id, data)
    if (!result) return false
    const { index, sesi: s } = result
    if (data[s].player[index].role === 'werewolf') data[s].seer = true
    return data[s].player[index].role
}

const sorcerer = (sender, id, data) => {
    const result = getPlayerById2(sender, id, data)
    if (!result) return false
    const { index, sesi: s } = result
    return data[s].player[index].role
}

const protectGuardian = (sender, id, data) => {
    const result = getPlayerById2(sender, id, data)
    if (!result) return false
    const { index, sesi: s } = result
    data[s].player[index].effect.push('guardian')
}

const setLovers = (sender, id1, id2, data) => {
    const result = getPlayerById2(sender, id1, data)
    if (!result) return false
    const room = sesi(result.sesi, data)
    if (!room) return false
    room.lovers = [id1, id2]
    return true
}

const checkLovers = (from, data) => {
    const room = sesi(from, data)
    if (!room || !room.lovers || room.lovers.length !== 2) return []
    const [n1, n2] = room.lovers
    const p1 = room.player.find(p => p.number === n1)
    const p2 = room.player.find(p => p.number === n2)
    if (!p1 || !p2) return []
    const casualties = []
    if (p1.isdead && !p2.isdead) { p2.isdead = true; casualties.push(p2) }
    else if (p2.isdead && !p1.isdead) { p1.isdead = true; casualties.push(p1) }
    return casualties
}

const roleShuffle = (array) => {
    let cur = array.length, rand
    while (cur !== 0) {
        rand = Math.floor(Math.random() * cur)
        cur--
        ;[array[cur], array[rand]] = [array[rand], array[cur]]
    }
    return array
}

const roleChanger = (from, id, role, data) => {
    const room = sesi(from, data)
    if (!room) return false
    const idx = room.player.findIndex(i => i.id === id)
    if (idx === -1) return false
    room.player[idx].role = role
}

const roleTable = {
    4: { werewolf: 1, seer: 1, guardian: 1, sorcerer: 0, hunter: 0, cupid: 0, algojo: 0, warga: 1 },
    5: { werewolf: 1, seer: 1, guardian: 1, sorcerer: 0, hunter: 0, cupid: 0, algojo: 0, warga: 2 },
    6: { werewolf: 1, seer: 1, guardian: 1, sorcerer: 0, hunter: 1, cupid: 0, algojo: 0, warga: 2 },
    7: { werewolf: 2, seer: 1, guardian: 1, sorcerer: 0, hunter: 1, cupid: 0, algojo: 0, warga: 2 },
    8: { werewolf: 2, seer: 1, guardian: 1, sorcerer: 0, hunter: 1, cupid: 1, algojo: 0, warga: 2 },
    9: { werewolf: 2, seer: 1, guardian: 1, sorcerer: 1, hunter: 1, cupid: 1, algojo: 0, warga: 2 },
    10: { werewolf: 2, seer: 1, guardian: 1, sorcerer: 1, hunter: 1, cupid: 1, algojo: 1, warga: 2 },
    11: { werewolf: 2, seer: 1, guardian: 2, sorcerer: 1, hunter: 1, cupid: 1, algojo: 1, warga: 2 },
    12: { werewolf: 2, seer: 2, guardian: 2, sorcerer: 1, hunter: 1, cupid: 1, algojo: 1, warga: 2 },
    13: { werewolf: 3, seer: 2, guardian: 2, sorcerer: 1, hunter: 1, cupid: 1, algojo: 1, warga: 2 },
    14: { werewolf: 3, seer: 2, guardian: 2, sorcerer: 1, hunter: 1, cupid: 1, algojo: 1, warga: 3 },
    15: { werewolf: 3, seer: 2, guardian: 2, sorcerer: 1, hunter: 2, cupid: 1, algojo: 1, warga: 3 }
}

const roleAmount = (from, data) => {
    const result = sesi(from, data)
    return result ? roleTable[result.player.length] : false
}

const roleGenerator = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    const role = roleAmount(from, data)
    if (!role) return false
    const assign = (roleName, count) => {
        for (let i = 0; i < count; i++) {
            const list = roleShuffle(room.player.filter(x => x.role === false))
            if (list.length === 0) return false
            const random = Math.floor(Math.random() * list.length)
            roleChanger(from, list[random].id, roleName, data)
        }
    }
    assign('werewolf', role.werewolf)
    assign('seer', role.seer)
    assign('guardian', role.guardian)
    assign('sorcerer', role.sorcerer)
    assign('hunter', role.hunter)
    assign('cupid', role.cupid)
    assign('algojo', role.algojo)
    assign('warga', role.warga)
    shortPlayer(from, data)
}

const PHASE_DURATION = 60000

const addTimer = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.cooldown = Date.now() + PHASE_DURATION
}

const startGame = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.status = true
}

const changeDay = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    if (room.time === 'pagi') room.time = 'voting'
    else if (room.time === 'malem') { room.time = 'pagi'; room.day += 1 }
    else if (room.time === 'voting') room.time = 'malem'
}

const dayVoting = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    if (room.time === 'malem' || room.time === 'pagi') room.time = 'voting'
}

const vote = (from, id, sender, data) => {
    const room = sesi(from, data)
    if (!room) return false
    const idGet = room.player.findIndex(i => i.id === sender)
    if (idGet === -1) return false
    const idx = room.player.findIndex(i => i.number === id)
    if (idx === -1) return false
    room.player[idGet].isvote = true
    room.player[idx].vote += 1
}

const voteSkip = (from, sender, data) => {
    const room = sesi(from, data)
    if (!room) return false
    const idGet = room.player.findIndex(i => i.id === sender)
    if (idGet === -1) return false
    room.player[idGet].isvote = true
}

const voteResult = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.player.sort((a, b) => (a.vote < b.vote ? 1 : -1))
    if (room.player[0].vote === 0) return 0
    if (room.player[0].vote === room.player[1].vote) return 1
    return room.player[0]
}

const voteKill = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.player.sort((a, b) => (a.vote < b.vote ? 1 : -1))
    if (room.player[0].vote === 0) return 0
    if (room.player[0].vote === room.player[1].vote) return 1
    room.player[0].isdead = true
}

const resetVote = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.player.forEach(p => { p.vote = 0 })
}

const voteDone = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.voting = false
}

const voteStart = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.voting = true
}

const clearAllVote = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.player.forEach(p => { p.vote = 0; p.isvote = false })
}

const clearAll = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.dead = []
    room.seer = false
    room.guardian = []
    room.voting = false
}

const clearAllSTATUS = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.player.forEach(p => { p.effect = [] })
}

const skillOn = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.player.forEach(p => { p.status = false })
}

const skillOff = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.player.forEach(p => { p.status = true })
}

const playerHidup = (data) => data.player.filter(x => x.isdead === false).length
const playerMati = (data) => data.player.filter(x => x.isdead === true).length

const NIGHT_ACTION_ROLES = ['werewolf', 'seer', 'guardian', 'sorcerer', 'algojo']

const allNightActionsDone = (room) => {
    if (!room) return true
    const actors = room.player.filter(p =>
        !p.isdead && NIGHT_ACTION_ROLES.includes(p.role) && !(p.role === 'algojo' && p.algojoUsed)
    )
    if (actors.length === 0) return true
    return actors.every(p => p.status === true)
}

const allFirstNightActionsDone = (room) => {
    if (!room) return true
    const roles = [...NIGHT_ACTION_ROLES, 'cupid']
    const actors = room.player.filter(p =>
        !p.isdead && roles.includes(p.role) && !(p.role === 'algojo' && p.algojoUsed)
    )
    if (actors.length === 0) return true
    return actors.every(p => p.status === true)
}

const allVotesDone = (room) => {
    if (!room) return true
    const alive = room.player.filter(p => !p.isdead)
    if (alive.length === 0) return true
    return alive.every(p => p.isvote === true)
}

const notifyHunter = async (sock, room, p) => {
    if (!p || p.role !== 'hunter' || p.hunterShotUsed) return
    await sock.sendMessage(p.id, {
        text: `*PEMBURU*\n\nAnda baru saja gugur. Sebagai Pemburu ${emoji_role('hunter')}, Anda masih memiliki satu kesempatan terakhir untuk menembak mati satu pemain lain sebelum benar-benar gugur.\n\nKetik *.wwpc shoot nomor* untuk menggunakan kesempatan terakhir Anda (hanya dapat digunakan sekali).`
    }).catch(() => {})
}

const WW_WIN_REWARD = { money: 180, exp: 90 }
const WW_LOSE_REWARD = { money: 40, exp: 20 }
const WW_SURVIVOR_BONUS = { money: 20, exp: 10 }

const giveWWReward = (id, base, alive) => {
    if (!hasStarted(id)) return null
    const rpg = getRpg(id)
    let money = base.money
    let exp = base.exp
    if (alive) { money += WW_SURVIVOR_BONUS.money; exp += WW_SURVIVOR_BONUS.exp }
    rpg.money += money
    const levelUps = addExp(rpg, exp)
    return { money, exp, leveledUp: levelUps.length > 0 }
}

const WW_SIDE = ['werewolf', 'sorcerer']
const WARGA_SIDE = ['warga', 'guardian', 'seer', 'hunter', 'cupid', 'algojo']

const getWinner = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    let ww = 0, orangBaek = 0
    for (const p of room.player) {
        if (p.isdead === false) {
            if (WW_SIDE.includes(p.role)) ww += 1
            else if (WARGA_SIDE.includes(p.role)) orangBaek += 1
        }
    }
    if (room.voting) {
        const b = voteResult(from, data)
        if (b !== 0 && b !== 1) {
            if (WW_SIDE.includes(b.role)) ww -= 1
            else if (WARGA_SIDE.includes(b.role)) orangBaek -= 1
        }
    }
    if (ww === 0) { room.iswin = true; return { voting: room.voting, status: true } }
    if (ww === orangBaek || orangBaek === 0) { room.iswin = false; return { voting: room.voting, status: false } }
    return { voting: room.voting, status: null }
}

const shortPlayer = (from, data) => {
    const room = sesi(from, data)
    if (!room) return false
    room.player.sort((a, b) => a.number - b.number)
}

const killww = (from, id, data) => {
    const room = sesi(from, data)
    if (!room) return false
    for (const num of room.dead) {
        const idd = getPlayerById(from, room.player[0].id, num, data)
        if (!idd) continue
        if (room.player[idd.index].effect.includes('guardian')) continue
        room.player[idd.index].isdead = true
    }
}

const strip = (id) => `@${id.replace('@s.whatsapp.net', '')}`

const joinList = (ids) => {
    if (ids.length === 0) return ''
    if (ids.length === 1) return strip(ids[0])
    return ids.slice(0, -1).map(strip).join(', ') + ` dan ${strip(ids[ids.length - 1])}`
}

const loversNotice = (casualties) => {
    if (!casualties.length) return ''
    return `\n\nKarena ikatan cinta yang telah terjalin, ${joinList(casualties.map(p => p.id))} turut gugur menyusul pasangannya yang lebih dulu meninggal.`
}

const pagii = (data) => {
    if (data.dead.length < 1) {
        return `*WEREWOLF - PAGI*\n\nMatahari terbit, tidak ada korban jiwa pada malam ini. Warga desa kembali menjalani aktivitas seperti biasa.\n\nWaktu diskusi: 1 menit sebelum memasuki fase pemungutan suara.\nHari ke-${data.day}`
    }
    const dead = [], saved = []
    for (const num of data.dead) {
        const idx = data.player.findIndex(x => x.number === num)
        if (idx === -1) continue
        if (data.player[idx].effect.includes('guardian')) saved.push(data.player[idx].id)
        else dead.push(data.player[idx].id)
    }
    return `*WEREWOLF - PAGI*\n\nWarga desa menemukan ${dead.length > 1 ? 'beberapa korban' : '1 korban'} pada pagi ini. ${dead.length ? joinList(dead) + ' dinyatakan meninggal. ' : ''}${saved.length ? `${joinList(saved)} hampir menjadi korban, namun berhasil diselamatkan oleh Guardian Angel.` : ''}\n\nWaktu diskusi: 1 menit sebelum memasuki fase pemungutan suara.\nHari ke-${data.day}\n\nSilakan berdiskusi di grup ini untuk mencari tahu siapa yang mencurigakan. Ketik *.ww player* untuk memeriksa daftar pemain yang masih hidup.`
}

async function pagi(sock, x, data) {
    skillOff(x.room, data)
    const ment = x.player.map(p => p.id)
    shortPlayer(x.room, data)
    const deadNumbers = [...x.dead]
    killww(x.room, x.dead, data)
    const loverCasualties = checkLovers(x.room, data)
    shortPlayer(x.room, data)
    for (const num of deadNumbers) {
        const p = x.player.find(pl => pl.number === num)
        if (p && p.isdead) await notifyHunter(sock, x, p)
    }
    for (const p of loverCasualties) await notifyHunter(sock, x, p)
    changeDay(x.room, data)
    const text = pagii(x) + loversNotice(loverCasualties)
    return sock.sendMessage(x.room, { text, mentions: ment })
}

async function voting(sock, x, data) {
    voteStart(x.room, data)
    let text = '*WEREWOLF - PEMUNGUTAN SUARA*\n\nSaatnya seluruh warga memilih siapa yang akan dieksekusi. Waktu yang tersedia 1 menit, berhati-hatilah, sebab ada pengkhianat di antara kalian.\n\n*DAFTAR PEMAIN*:\n'
    shortPlayer(x.room, data)
    const ment = []
    for (const p of x.player) {
        text += `(${p.number}) ${strip(p.id)}${p.isdead ? ' (gugur)' : ''}\n`
        ment.push(p.id)
    }
    text += '\nKetik *.ww vote nomor* untuk memilih di GRUP INI (bukan pesan pribadi).\nTidak ingin memilih? Ketik *.ww skip*.\nJika seluruh pemain yang masih hidup telah memilih atau melewati giliran, fase ini akan berlanjut lebih cepat.'
    dayVoting(x.room, data)
    clearAll(x.room, data)
    clearAllSTATUS(x.room, data)
    return sock.sendMessage(x.room, { text, mentions: ment })
}

async function malam(sock, x, data) {
    const hasil = voteResult(x.room, data)
    const finish = async () => {
        changeDay(x.room, data)
        voteDone(x.room, data)
        resetVote(x.room, data)
        clearAllVote(x.room, data)
        if (getWinner(x.room, data).status !== null) return win(x, sock, data)
    }
    const nightNotice = '\nMalam telah tiba. Pemain dengan peran aktif malam hari akan menerima pesan pribadi dari bot berisi instruksi, silakan periksa pesan pribadi Anda. Waktu yang tersedia 1 menit untuk bertindak.'
    if (hasil === 0) {
        const text = `*WEREWOLF - MALAM*\n\nWarga terlalu ragu untuk menentukan pilihan, sehingga tidak ada yang dieksekusi hari ini.\n${nightNotice}`
        await sock.sendMessage(x.room, { text })
        return finish()
    }
    if (hasil === 1) {
        const text = `*WEREWOLF - MALAM*\n\nWarga desa telah memilih, namun hasilnya seri sehingga tidak ada yang dieksekusi.\n${nightNotice}`
        await sock.sendMessage(x.room, { text, mentions: x.player.map(p => p.id) })
        return finish()
    }
    const extra = hasil.role === 'werewolf' ? '' : nightNotice
    voteKill(x.room, data)
    const loverCasualties = checkLovers(x.room, data)
    const text = `*WEREWOLF - MALAM*\n\nWarga desa telah sepakat mengeksekusi ${strip(hasil.id)}.\n\n${strip(hasil.id)} ternyata adalah ${roleLabel(hasil.role)} ${emoji_role(hasil.role)}${loversNotice(loverCasualties)}${extra}`
    await sock.sendMessage(x.room, { text, mentions: [hasil.id, ...loverCasualties.map(p => p.id)] })
    await notifyHunter(sock, x, hasil)
    for (const p of loverCasualties) await notifyHunter(sock, x, p)
    return finish()
}

const roleNightPrompt = (p, tok1, tok2, skipHint) => {
    if (p.role === 'werewolf') return `*WEREWOLF - MALAM*\n\nGiliran Anda ${emoji_role('werewolf')}: pilih satu orang untuk dimangsa.\n*DAFTAR PEMAIN*:\n${tok2}\nKetik *.wwpc kill nomor* untuk membunuh pemain.${skipHint}`
    if (p.role === 'warga') return `*WEREWOLF - MALAM*\n\nSebagai Warga Desa, tetaplah waspada, sebab Anda mungkin menjadi target selanjutnya.\n*DAFTAR PEMAIN*:${tok1}\nPeran Anda tidak memiliki aksi malam. Tunggu kabar dari grup ketika pagi tiba.`
    if (p.role === 'seer') return `*WEREWOLF - MALAM*\n\nGiliran Anda ${emoji_role('seer')}: pilih satu orang untuk diintip perannya.\n*DAFTAR PEMAIN*:${tok1}\nKetik *.wwpc dreamy nomor* untuk melihat peran pemain.${skipHint}`
    if (p.role === 'guardian') return `*WEREWOLF - MALAM*\n\nGiliran Anda ${emoji_role('guardian')}: pilih satu orang untuk dilindungi dari serangan Werewolf.\n*DAFTAR PEMAIN*:${tok1}\nKetik *.wwpc deff nomor* untuk melindungi pemain.${skipHint}`
    if (p.role === 'sorcerer') return `*WEREWOLF - MALAM*\n\nGiliran Anda ${emoji_role('sorcerer')}: pilih satu orang untuk dibongkar identitasnya.\n*DAFTAR PEMAIN*:\n${tok2}\nKetik *.wwpc sorcerer nomor* untuk melihat peran pemain.${skipHint}`
    if (p.role === 'hunter') return `*WEREWOLF - MALAM*\n\nAnda adalah Pemburu ${emoji_role('hunter')}. Sehari-hari Anda terlihat seperti warga biasa, namun jika Anda gugur (dimangsa Werewolf maupun dieksekusi), Anda masih memiliki satu kesempatan menembak mati satu pemain lain sebelum benar-benar gugur.\n*DAFTAR PEMAIN*:${tok1}\nPeran Anda tidak memiliki aksi malam ini. Simpan kemampuan *.wwpc shoot nomor* untuk digunakan setelah Anda gugur.`
    if (p.role === 'cupid') {
        if (p.cupidUsed) return `*WEREWOLF - MALAM*\n\nAnda adalah Dukun Cinta ${emoji_role('cupid')}. Kemampuan Anda hanya dapat digunakan pada malam pertama dan sudah Anda gunakan. Tidak ada aksi malam ini, cukup tunggu perkembangan permainan.`
        return `*WEREWOLF - MALAM*\n\nGiliran Anda ${emoji_role('cupid')}: pilih dua orang untuk dijadikan sepasang kekasih. Jika salah satu dari mereka gugur, pasangannya akan ikut gugur karena patah hati. Kemampuan ini hanya dapat digunakan malam ini.\n*DAFTAR PEMAIN*:${tok1}\nKetik *.wwpc cupid nomor1 nomor2* untuk menjodohkan dua pemain, contoh: .wwpc cupid 2 5.${skipHint}`
    }
    if (p.role === 'algojo') {
        if (p.algojoUsed) return `*WEREWOLF - MALAM*\n\nAnda adalah Algojo ${emoji_role('algojo')}. Peluru terakhir Anda sudah digunakan. Tidak ada aksi malam ini, cukup tunggu perkembangan permainan.`
        return `*WEREWOLF - MALAM*\n\nAnda adalah Algojo ${emoji_role('algojo')}. Anda memiliki satu peluru yang dapat digunakan kapan saja pada malam hari untuk menembak satu pemain yang Anda curigai sebagai Werewolf atau Penyihir. Jika tembakan Anda tepat sasaran, pemain tersebut akan gugur. Namun jika target Anda ternyata warga yang tidak bersalah, Anda juga akan gugur akibat rasa bersalah. Kemampuan ini hanya dapat digunakan sekali seumur permainan.\n*DAFTAR PEMAIN*:${tok1}\nKetik *.wwpc algojo nomor* untuk menembak, atau *.wwpc skip* untuk menyimpan peluru malam ini.`
    }
    return ''
}

async function skill(sock, x, data) {
    skillOn(x.room, data)
    if (getWinner(x.room, data).status !== null || x.win != null) return win(x, sock, data)
    if (!x || !x.player || x.win != null) return
    shortPlayer(x.room, data)
    let tok1 = '\n', tok2 = '\n'
    const membernya = []
    for (const p of x.player) {
        tok1 += `(${p.number}) ${strip(p.id)}${p.isdead ? ' (gugur)' : ''}\n`
        tok2 += `(${p.number}) ${strip(p.id)} ${(p.role === 'werewolf' || p.role === 'sorcerer') ? (p.isdead ? ' (gugur)' : ` ${p.role}`) : ' '}\n`
        membernya.push(p.id)
    }
    const skipHint = '\nTidak ingin atau tidak sempat menggunakan skill? Ketik *.wwpc skip*.\nJika seluruh peran aktif malam ini telah bertindak atau melewati giliran, fase ini akan berlanjut ke pagi lebih cepat.'
    for (const p of x.player) {
        if (p.isdead) continue
        const text = roleNightPrompt(p, tok1, tok2, skipHint)
        if (text) await sock.sendMessage(p.id, { text, mentions: membernya })
    }
}

async function win(x, sock, data) {
    const status = getWinner(x.room, data).status
    if (status !== false && status !== true) return
    const winningSide = status === false ? WW_SIDE : WARGA_SIDE
    const header = status === false ? '*WEREWOLF MENANG*\n\nTIM WEREWOLF\n\n' : '*WARGA MENANG*\n\nTIM WARGA\n\n'

    let text = header
    const ment = []
    let anyRewarded = false
    for (const p of x.player) {
        const isWinner = winningSide.includes(p.role)
        const reward = giveWWReward(p.id, isWinner ? WW_WIN_REWARD : WW_LOSE_REWARD, p.isdead === false)
        if (reward) anyRewarded = true
        if (isWinner) {
            const rewardText = reward ? `\n     Reward: +${fmtMoney(reward.money)} money, +${reward.exp} exp${reward.leveledUp ? ' (naik level!)' : ''}` : ''
            text += `${p.number}) ${strip(p.id)}\n     Peran: ${roleLabel(p.role)}${rewardText}\n\n`
            ment.push(p.id)
        }
    }
    if (anyRewarded) {
        text += `Seluruh pemain (baik yang menang maupun kalah) yang memiliki karakter RPG tetap mendapat reward, minimal +${fmtMoney(WW_LOSE_REWARD.money)} money dan +${WW_LOSE_REWARD.exp} exp, ditambah bonus bagi yang bertahan hidup sampai akhir. Belum memiliki karakter? Ketik *.rpgstart* agar ikut kebagian di sesi berikutnya.`
    }
    await sock.sendMessage(x.room, { text: text.trim(), mentions: ment })
    delete data[x.room]
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const phaseFor = (time) => (time === 'voting' ? 1 : time === 'malem' ? 2 : 0)

const MAX_PHASE_WAIT = PHASE_DURATION
const POLL_INTERVAL = 2000

async function waitPhase(id, data, checkDone) {
    const start = Date.now()
    while (Date.now() - start < MAX_PHASE_WAIT) {
        await sleep(POLL_INTERVAL)
        const room = sesi(id, data)
        if (!room) return false
        if (getWinner(id, data).status !== null) return false
        if (checkDone(room)) return true
    }
    return false
}

async function run(sock, id, data, startPhase = 0) {
    const room0 = sesi(id, data)
    if (!room0) return
    if (room0.running) return
    room0.running = true
    try {
        const steps = [pagi, voting, malam, skill]
        let phase = startPhase
        while (getWinner(id, data).status === null) {
            if (getWinner(id, data).status !== null) break
            const stepRan = steps[phase % 4]
            await stepRan(sock, sesi(id, data), data)
            phase++
            if (getWinner(id, data).status !== null) break

            let skippedEarly = false
            if (stepRan === skill) {
                skippedEarly = await waitPhase(id, data, allNightActionsDone)
            } else if (stepRan === voting) {
                skippedEarly = await waitPhase(id, data, allVotesDone)
            } else {
                await sleep(MAX_PHASE_WAIT)
            }

            const room = sesi(id, data)
            if (skippedEarly && room) {
                const text = stepRan === skill
                    ? 'Seluruh pemain dengan peran malam telah bertindak (atau melewati giliran), permainan dilanjutkan ke pagi lebih cepat.'
                    : 'Seluruh pemain yang masih hidup telah memilih (atau melewati giliran), permainan dilanjutkan ke tahap berikutnya lebih cepat.'
                await sock.sendMessage(room.room, { text }).catch(() => {})
            }

            if (getWinner(id, data).status !== null) break
        }
        await win(sesi(id, data), sock, data)
    } finally {
        const room = sesi(id, data)
        if (room) room.running = false
    }
}

export {
    emoji_role, roleLabel, sesi, playerOnGame, playerOnRoom, playerExit, dataPlayer, dataPlayerById,
    getPlayerById, getPlayerById2, killWerewolf, killww, dreamySeer, sorcerer, protectGuardian,
    setLovers, checkLovers, roleShuffle, roleChanger, roleAmount, roleGenerator, addTimer, startGame,
    playerHidup, playerMati, vote, voteSkip, voteResult, clearAllVote, getWinner, win, pagi, malam,
    skill, voteStart, voteDone, voting, run, phaseFor, waitPhase, allNightActionsDone,
    allFirstNightActionsDone, allVotesDone, PHASE_DURATION
}
