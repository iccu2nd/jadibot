import { createRequire } from 'module'
import fs from 'fs/promises'
import path from 'path'

const require = createRequire(import.meta.url)
const AdmZip = require('adm-zip')

const ignoredDirs = ['node_modules', 'session', '.git', '.replit', '.cache']
const ignoredFiles = ['package-lock.json', 'db.json']

async function addFilesToZip(zip, dir, currentPath = '') {
    const list = await fs.readdir(dir)
    for (const file of list) {
        const fullPath = path.join(dir, file)
        const zipPath = currentPath ? path.join(currentPath, file) : file
        const stat = await fs.stat(fullPath)

        if (stat.isDirectory()) {
            if (!ignoredDirs.includes(file)) await addFilesToZip(zip, fullPath, zipPath)
        } else {
            const ext = path.extname(file).toLowerCase()
            if (!ignoredFiles.includes(file) && ext !== '.zip' && ext !== '.gz') {
                zip.addLocalFile(fullPath, currentPath)
            }
        }
    }
}

export default {
    cmd: ['backup'],
    category: 'owner',
    run: async (m, { sock, isOwner }) => {
        if (!isOwner) return m.reply("Fitur ini khusus untuk owner.")
        // Owner di sini bisa berarti "owner sesi jadibot" (nomor yang dipakai
        // buat connect lewat /bot) — bukan cuma admin/pemilik deployment ini.
        // .backup nge-zip seluruh source project, jadi kalau dibolehkan di
        // sesi jadibot, siapa pun yang connect nomor bisa ambil source code
        // bot ini secara utuh. Diblokir khusus untuk sesi jadibot.
        if (sock.isJadibotSession) return m.reply("Fitur ini tidak tersedia untuk sesi jadibot.")

        m.reply("Sedang membuat backup script, mohon tunggu...")

        const dateStr = new Date().toISOString().slice(0, 10)
        const zipName = `${dateStr}.zip`

        try {
            const zip = new AdmZip()
            await addFilesToZip(zip, '.')
            await zip.writeZipPromise(zipName)

            await sock.sendMessage(m.from, {
                document: await fs.readFile(zipName),
                mimetype: 'application/zip',
                fileName: zipName
            }, { quoted: m })
        } catch (e) {
            m.reply(`Gagal membuat backup: ${e.message}`)
            throw e
        } finally {
            fs.unlink(zipName).catch(() => {})
        }
    }
}
