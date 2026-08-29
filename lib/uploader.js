import axios from 'axios'
import FormDataNode from 'form-data'

export const pone = async (buffer, filename = 'file.bin') => {
    const form = new FormDataNode()
    form.append('files[]', buffer, { filename })

    const res = await axios.post('https://pone.rs/upload.php', form, {
        headers: {
            ...form.getHeaders(),
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
            accept: '*/*',
            origin: 'https://pone.rs',
            referer: 'https://pone.rs/'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 20000,
        validateStatus: () => true
    })

    const url = res.data?.files?.[0]?.url?.replaceAll('\\/', '/')
    if (!res.data?.success || !url) throw new Error(`HTTP ${res.status}`)
    return url
}

const withTimeout = (ms = 20000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    return { signal: controller.signal, done: () => clearTimeout(timer) }
}

export const imgbb = async (buffer) => {
    const form = new FormData()
    form.append('image', buffer.toString('base64'))
    form.append('expiration', '0')

    const t = withTimeout()
    let res
    try {
        res = await fetch('https://api.imgbb.com/1/upload?key=47eb75204620947118fc74b3952ffc37', {
            method: 'POST',
            body: form,
            signal: t.signal
        })
    } finally { t.done() }

    const json = await res.json()
    if (json.status !== 200) throw new Error(json.error?.message || 'Upload gagal')
    return json.data.url
}

export const tmpfiles = async (buffer, filename = 'file.bin') => {
    const form = new FormData()
    form.append('file', new Blob([buffer]), filename)

    const t = withTimeout()
    let res
    try {
        res = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: form,
            signal: t.signal
        })
    } finally { t.done() }

    const json = await res.json()
    const url = json?.data?.url?.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
    if (!url) throw new Error('Upload gagal')
    return url
}

export const uguu = async (buffer, filename = 'file.bin') => {
    const form = new FormData()
    form.append('files[]', new Blob([buffer]), filename)

    const t = withTimeout()
    let res
    try {
        res = await fetch('https://uguu.se/upload.php', {
            method: 'POST',
            body: form,
            signal: t.signal
        })
    } finally { t.done() }

    const json = await res.json()
    const url = json?.files?.[0]?.url
    if (!url) throw new Error('Upload gagal')
    return url
}
