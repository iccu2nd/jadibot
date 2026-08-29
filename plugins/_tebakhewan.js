import axios from 'axios'
import { getPlugin } from '../lib/plugins.js'

const DATA_URL = 'https://raw.githubusercontent.com/reyzdesu/bot-assets/main/games/tebakhewan.json'
const TIMEOUT_MS = 120000
const REWARD = 500
const SIMILAR_THRESHOLD = 0.72
const HINT_PENALTY = 0.7

const prefixes = ['.', '/', '#', '!']
const surrenderRegex = /^((me)?nyerah|surr?ender)$/i

function isCmd(body) {
  const prefix = prefixes.find(p => (body || '').startsWith(p))
  if (!prefix) return false
  const cmd = body.slice(prefix.length).trim().split(/ +/)[0]?.toLowerCase()
  return !!getPlugin(cmd)
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function similarity(a, b) {
  if (!a.length && !b.length) return 1
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length)
}

function makeClue(word) {
  const letters = word.split('')
  return letters
    .map((ch, i) => (ch === ' ' || ch === '-' || i === 0 || i === letters.length - 1 || i % 2 === 0 ? ch : '_'))
    .join('')
}

function endGame(sock, chat) {
  const game = sock.tebakhewan?.[chat]
  if (!game) return
  clearTimeout(game.timer)
  delete sock.tebakhewan[chat]
}

export default {
  cmd: ['tebakhewan', 'tebhewan'],
  category: 'games',

  run: async (m, { sock, prefix, cmd }) => {
    sock.tebakhewan ??= {}

    if (cmd === 'tebhewan') {
      const game = sock.tebakhewan[m.chat]
      if (!game) return m.reply(`Tidak ada soal yang sedang berlangsung di sini. Mulai dulu dengan *${prefix}tebakhewan*.`)

      let note = ''
      if (!game.hintUsed) {
        game.hintUsed = true
        game.reward = Math.max(1, Math.floor(game.reward * HINT_PENALTY))
        note = `\n\n_Petunjuk dipakai, hadiah berkurang jadi ${game.reward} Money._`
      }

      const clue = makeClue(game.soal.jawaban)
      return m.reply('Petunjuk: ```' + clue + '```' + note + '\n\nBalas pesan soal untuk menjawab, bukan pesan ini.')
    }

    if (sock.tebakhewan[m.chat]) {
      return m.reply('Masih ada soal yang belum terjawab di chat ini. Balas pesan soal untuk menjawab, atau ketik *nyerah* untuk menyerah.')
    }

    let data
    try {
      const res = await axios.get(DATA_URL)
      data = res.data
    } catch (e) {
      console.error(e)
      return m.reply('Gagal mengambil soal, coba lagi nanti.')
    }
    if (!Array.isArray(data) || !data.length) return m.reply('Soal sedang tidak tersedia, coba lagi nanti.')

    const soal = data[Math.floor(Math.random() * data.length)]
    const reward = REWARD

    const caption = `*TEBAK HEWAN*

${soal.soal}

Waktu: ${(TIMEOUT_MS / 1000).toFixed(0)} detik. Balas pesan ini untuk menjawab.
Ketik *${prefix}tebhewan* untuk melihat petunjuk.
Hadiah: ${reward} Money`.trim()

    const sent = await sock.sendMessage(m.chat, { text: caption }, { quoted: m })

    const timer = setTimeout(() => {
      if (sock.tebakhewan?.[m.chat]) {
        sock.sendMessage(m.chat, { text: `Waktu habis. Jawabannya adalah *${soal.jawaban}*.` }, { quoted: sent }).catch(() => {})
        delete sock.tebakhewan[m.chat]
      }
    }, TIMEOUT_MS)

    sock.tebakhewan[m.chat] = { key: sent.key, soal, reward, timer }
  },

  onMessage: async (m, { sock }) => {
    if (!m || !m.message || m.key?.fromMe) return false

    const game = sock.tebakhewan?.[m.chat]
    if (!game) return false
    if (!m.quoted || m.quoted.id !== game.key.id) return false
    if (isCmd(m.body)) return false

    const guess = (m.body || '').toLowerCase().trim()
    if (!guess) return false

    if (surrenderRegex.test(guess)) {
      endGame(sock, m.chat)
      m.reply(`Baik, permainan diakhiri. Jawabannya adalah *${game.soal.jawaban}*.`)
      return true
    }

    const jawaban = game.soal.jawaban.toLowerCase().trim()

    if (guess === jawaban) {
      endGame(sock, m.chat)
      const user = global.db.data.users[m.sender]
      if (user) user.money = (user.money || 0) + game.reward
      m.reply(`*Jawaban benar!*\n+${game.reward} Money`)
    } else if (similarity(guess, jawaban) >= SIMILAR_THRESHOLD) {
      m.reply('*Hampir benar.*')
    } else {
      m.reply('*Jawaban salah.*')
    }
    return true
  }
}
