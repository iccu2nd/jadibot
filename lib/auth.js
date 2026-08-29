// Layer auth akun (login web) — TERPISAH dari sesi jadibot (nomor WhatsApp).
// Satu akun (email/password atau Google) bisa dipakai buat login ke dashboard,
// nyambungin bot, dan buka /bot. Disimpan di MongoDB koleksi "users" (pakai
// getDb() yang sama dari lib/mongo.js, jadi satu cluster buat semua data).
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import { ObjectId } from 'mongodb'
import { getDb } from './mongo.js'
import config from '../config.js'

const COOKIE_NAME = 'jadibot_session'
const TOKEN_TTL = '30d'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000

const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null

async function usersCol() {
    const db = await getDb()
    const col = db.collection('users')
    await col.createIndex({ email: 1 }, { unique: true, sparse: true }).catch(() => {})
    await col.createIndex({ googleId: 1 }, { unique: true, sparse: true }).catch(() => {})
    return col
}

function publicUser(user) {
    if (!user) return null
    return {
        id: String(user._id),
        name: user.name || user.email?.split('@')[0] || 'Pengguna',
        email: user.email || null,
        avatar: user.avatar || null,
        provider: user.provider || 'email',
        createdAt: user.createdAt || null
    }
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase()
}

export function isEmailValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// --- Daftar & login pakai email/password -----------------------------------
export async function registerWithPassword({ name, email, password }) {
    email = normalizeEmail(email)
    if (!isEmailValid(email)) throw new Error('Format email tidak valid.')
    if (!password || password.length < 8) throw new Error('Password minimal 8 karakter.')

    const col = await usersCol()
    const existing = await col.findOne({ email })
    if (existing) throw new Error('Email ini sudah terdaftar. Coba masuk aja.')

    const passwordHash = await bcrypt.hash(password, 10)
    const doc = {
        name: (name || '').trim() || email.split('@')[0],
        email,
        passwordHash,
        provider: 'email',
        avatar: null,
        createdAt: new Date()
    }
    const { insertedId } = await col.insertOne(doc)
    return publicUser({ ...doc, _id: insertedId })
}

export async function loginWithPassword({ email, password }) {
    email = normalizeEmail(email)
    const col = await usersCol()
    const user = await col.findOne({ email })
    if (!user || !user.passwordHash) throw new Error('Email atau password salah.')

    const ok = await bcrypt.compare(password || '', user.passwordHash)
    if (!ok) throw new Error('Email atau password salah.')
    return publicUser(user)
}

// --- Login pakai Google (Google Identity Services, verifikasi ID token) ----
export async function loginWithGoogle(credential) {
    if (!googleClient) throw new Error('Login Google belum diaktifkan di server ini (GOOGLE_CLIENT_ID belum diset).')
    if (!credential) throw new Error('Token Google tidak ada.')

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: config.googleClientId })
    const payload = ticket.getPayload()
    if (!payload?.email) throw new Error('Akun Google ini tidak punya email.')

    const email = normalizeEmail(payload.email)
    const col = await usersCol()

    let user = await col.findOne({ $or: [{ googleId: payload.sub }, { email }] })
    if (user) {
        const patch = {}
        if (!user.googleId) patch.googleId = payload.sub
        if (payload.picture && payload.picture !== user.avatar) patch.avatar = payload.picture
        if (Object.keys(patch).length) {
            await col.updateOne({ _id: user._id }, { $set: patch })
            user = { ...user, ...patch }
        }
        return publicUser(user)
    }

    const doc = {
        name: payload.name || email.split('@')[0],
        email,
        googleId: payload.sub,
        provider: 'google',
        avatar: payload.picture || null,
        createdAt: new Date()
    }
    const { insertedId } = await col.insertOne(doc)
    return publicUser({ ...doc, _id: insertedId })
}

export async function findUserById(id) {
    const col = await usersCol()
    let objectId
    try { objectId = new ObjectId(id) } catch (e) { return null }
    const user = await col.findOne({ _id: objectId })
    return publicUser(user)
}

// --- Cookie sesi (JWT httpOnly) --------------------------------------------
export function issueSessionCookie(res, user) {
    const token = jwt.sign({ uid: user.id }, config.jwtSecret, { expiresIn: TOKEN_TTL })
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: COOKIE_MAX_AGE
    })
}

export function clearSessionCookie(res) {
    res.clearCookie(COOKIE_NAME)
}

export function readSessionToken(req) {
    return req.cookies?.[COOKIE_NAME] || null
}

// Middleware buat rute API: wajib login, kalau nggak balikin 401 JSON.
export async function requireAuthApi(req, res, next) {
    try {
        const token = readSessionToken(req)
        if (!token) return res.status(401).json({ error: 'Belum login.' })
        const { uid } = jwt.verify(token, config.jwtSecret)
        const user = await findUserById(uid)
        if (!user) return res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang.' })
        req.user = user
        next()
    } catch (e) {
        res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang.' })
    }
}

// Middleware buat rute halaman: wajib login, kalau nggak redirect ke /login.
export async function requireAuthPage(req, res, next) {
    try {
        const token = readSessionToken(req)
        if (!token) return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`)
        const { uid } = jwt.verify(token, config.jwtSecret)
        const user = await findUserById(uid)
        if (!user) return res.redirect('/login')
        req.user = user
        next()
    } catch (e) {
        res.redirect('/login')
    }
}

// Dipakai di /login supaya yang udah login langsung dilempar ke /dashboard.
export async function getCurrentUser(req) {
    try {
        const token = readSessionToken(req)
        if (!token) return null
        const { uid } = jwt.verify(token, config.jwtSecret)
        return await findUserById(uid)
    } catch (e) {
        return null
    }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME
