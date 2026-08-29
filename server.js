// Modul ini bisa dijalankan berdiri sendiri (`npm run dashboard`, dashboard tanpa
// bot owner utama) ATAU di-import dari index.js supaya jalan satu proses bareng
// bot utama (disarankan — biar sesi jadibot nggak dobel-konek dari dua proses beda).
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import chalk from 'chalk'
import config from './config.js'
import * as sessionManager from './lib/session-manager.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, 'public')
const pluginsDir = path.join(__dirname, 'plugins')

await sessionManager.initSessionStore()

const app = express()
app.use(express.json())

// index:false biar '/' gak otomatis nyajiin index.html, dan file .html
// gak ke-serve langsung dari nama aslinya — semua halaman lewat endpoint
// bersih di bawah (/dashboard, /admin), bukan /index.html atau /admin.html.
app.use(express.static(publicDir, { index: false, extensions: false }))

app.get('/', (req, res) => res.redirect('/dashboard'))
app.get('/dashboard', (req, res) => res.sendFile(path.join(publicDir, 'index.html')))
app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')))

// Nama lama tetap dialihkan (301) kalau ada yang masih nyimpen link .html
app.get('/index.html', (req, res) => res.redirect(301, '/dashboard'))
app.get('/admin.html', (req, res) => res.redirect(301, '/admin'))


// --- Public: statistik ringan buat landing page (total fitur, bot aktif,
// nomor WA admin buat tombol upgrade) — dihitung dari disk & session store,
// bukan angka hardcode, jadi selalu jujur sama kondisi server. ---------------
app.get('/api/stats', (req, res) => {
    let totalFeatures = 0
    try {
        totalFeatures = fs.readdirSync(pluginsDir).filter((f) => f.endsWith('.js')).length
    } catch (e) {}

    let totalBots = 0
    try {
        totalBots = sessionManager.listSessions().length
    } catch (e) {}

    res.json({
        totalFeatures,
        totalBots,
        contactNumber: config.ownerNumber?.[0] || null,
        premiumPriceLabel: 'Hubungi admin'
    })
})

// --- Public: mulai sesi baru ---------------------------------------------
app.post('/api/connect', async (req, res) => {
    const number = sessionManager.formatNumber(req.body?.number)
    if (!number) return res.status(400).json({ error: 'Nomor tidak valid. Contoh: 08123456789' })

    const existing = sessionManager.getSession(number)
    if (existing) {
        return res.status(200).json({ number, accessToken: existing.accessToken, existing: true })
    }

    try {
        const session = await sessionManager.startWebSession(number)
        res.json({ number, accessToken: session.accessToken })
    } catch (e) {
        res.status(500).json({ error: e.message || 'Gagal memulai sesi jadibot.' })
    }
})

// --- Middleware: cek token milik sesi -------------------------------------
function auth(req, res, next) {
    const number = sessionManager.formatNumber(req.params.number)
    const session = number ? sessionManager.getSession(number) : null
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan.' })

    const token = req.headers['x-session-token']
    if (!token || token !== session.accessToken) return res.status(403).json({ error: 'Token sesi tidak valid.' })

    req.sessionNumber = number
    next()
}

app.get('/api/session/:number', auth, (req, res) => {
    res.json(sessionManager.publicView(sessionManager.getSession(req.sessionNumber)))
})

app.put('/api/session/:number/settings', auth, (req, res) => {
    const { ownerNumber, autoread, autotyping } = req.body || {}
    const updated = sessionManager.updateSessionSettings(req.sessionNumber, { ownerNumber, autoread, autotyping })
    res.json(sessionManager.publicView(updated))
})

app.post('/api/session/:number/stop', auth, async (req, res) => {
    await sessionManager.stopSession(req.sessionNumber)
    res.json({ ok: true })
})

// --- Admin: lihat & kelola semua sesi --------------------------------------
function adminAuth(req, res, next) {
    const key = req.headers['x-admin-key']
    if (!config.dashboardAdminKey || key !== config.dashboardAdminKey) {
        return res.status(403).json({ error: 'Admin key salah atau belum diset di config.js.' })
    }
    next()
}

app.get('/api/admin/sessions', adminAuth, (req, res) => {
    res.json(sessionManager.listSessions())
})

app.post('/api/admin/session/:number/stop', adminAuth, async (req, res) => {
    const number = sessionManager.formatNumber(req.params.number)
    if (!sessionManager.getSession(number)) return res.status(404).json({ error: 'Sesi tidak ditemukan.' })
    await sessionManager.stopSession(number)
    res.json({ ok: true })
})

sessionManager.restoreAllSessions()

const PORT = config.dashboardPort || 3000
app.listen(PORT, () => {
    console.log(chalk.cyanBright.bold(`Dashboard jadibot jalan di http://localhost:${PORT}`))
})
