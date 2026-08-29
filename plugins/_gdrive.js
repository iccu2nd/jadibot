import fetch from 'node-fetch'

const formatSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return null
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = Number(bytes)
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(2)} ${units[i]}`
}

const gdrive = async (url) => {
  if (!/drive\.google/i.test(url)) throw new Error('Link Google Drive tidak valid')

  const idMatch = url.match(/\/?id=([^&]+)/i) || url.match(/\/d\/([^/]+)/)
  const id = idMatch?.[1]
  if (!id) throw new Error('ID file tidak ditemukan di link')

  const res = await fetch(`https://drive.google.com/uc?id=${id}&authuser=0&export=download`, {
    method: 'post',
    headers: {
      'accept-encoding': 'gzip, deflate, br',
      'content-length': 0,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      origin: 'https://drive.google.com',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
      'x-client-data': 'CKG1yQEIkbbJAQiitskBCMS2yQEIqZ3KAQioo8oBGLeYygE=',
      'x-drive-first-party': 'DriveWebUi',
      'x-json-requested': 'true'
    }
  })

  const raw = await res.text()
  let parsed
  try {
    parsed = JSON.parse(raw.slice(4))
  } catch {
    throw new Error('Gagal membaca respons Google Drive (mungkin link private/tidak ada akses)')
  }

  const { fileName, sizeBytes, downloadUrl } = parsed
  if (!downloadUrl) throw new Error('Link Download Limit atau file tidak dapat diakses')

  const head = await fetch(downloadUrl)
  if (head.status !== 200) throw new Error(head.statusText || 'Gagal mengambil file')

  return {
    downloadUrl,
    fileName,
    fileSize: formatSize(sizeBytes),
    mimetype: head.headers.get('content-type') || 'application/octet-stream'
  }
}

export default {
  cmd: ['gdrive', 'gdl'],
  category: 'downloader',
  description: 'Download file dari Google Drive',

  run: async (m, { sock, text, usedPrefix, command }) => {
    if (!text) return m.reply(`*[ ! ] Parameter tidak tepat*\n\nExample: ${usedPrefix + command} https://drive.google.com/xxxxxxxxxx`)

    await m.react('⏳')

    try {
      const data = await gdrive(text)

      await sock.sendMessage(m.from, {
        document: { url: data.downloadUrl },
        fileName: data.fileName,
        mimetype: data.mimetype,
        caption: `GDRIVE DOWNLOADER\n\nNama: ${data.fileName}${data.fileSize ? `\nUkuran: ${data.fileSize}` : ''}`
      }, { quoted: m })

      await m.react('✅')
    } catch (e) {
      console.error(e)
      await m.react('❌')
      m.reply(`Gagal: ${e.message}`)
    }
  }
}