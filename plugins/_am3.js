import crypto from 'crypto';

const BASE_URL = 'https://alight-motion-premium.site.je';
let testCookie = '';

function solveAESChallenge(html) {
  try {
    const aMatch = html.match(/var a=toNumbers\("([a-f0-9]+)"\)/i);
    const bMatch = html.match(/b=toNumbers\("([a-f0-9]+)"\)/i);
    const cMatch = html.match(/c=toNumbers\("([a-f0-9]+)"\)/i);
    if (!aMatch || !bMatch || !cMatch) return null;
    const key = Buffer.from(aMatch[1], 'hex');
    const iv = Buffer.from(bMatch[1], 'hex');
    const ciphertext = Buffer.from(cMatch[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    decipher.setAutoPadding(false);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('hex');
  } catch {
    return null;
  }
}

async function customFetch(url, options = {}) {
  options.headers = options.headers || {};
  options.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  if (testCookie) {
    options.headers['Cookie'] = '__test=' + testCookie;
  }
  let response = await fetch(url, options);
  let rawText = await response.text();
  if (rawText.includes('slowAES.decrypt') || rawText.includes('__test=')) {
    const cookieVal = solveAESChallenge(rawText);
    if (cookieVal) {
      testCookie = cookieVal;
      options.headers['Cookie'] = '__test=' + testCookie;
      response = await fetch(url, options);
      rawText = await response.text();
    }
  }
  return { response, rawText };
}

async function sendMagicLink(email) {
  const { rawText } = await customFetch(BASE_URL + '/index.php?action=send_eceran', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({ email: email })
  });
  try {
    const data = JSON.parse(rawText);
    if (data.success || (data.message && data.message.toLowerCase().includes('berhasil'))) {
      return { success: true, message: data.message || 'Magic link telah dikirim!' };
    } else {
      return { success: false, message: data.message || 'Gagal mengirim magic link.' };
    }
  } catch {
    return { success: false, message: 'Server merespon tidak valid' };
  }
}

async function verifyMagicLink(email, link) {
  const { rawText } = await customFetch(BASE_URL + '/index.php?action=verify_eceran', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({ email: email, link: link })
  });
  try {
    const data = JSON.parse(rawText);
    if (data.success || (data.message && data.message.toLowerCase().includes('success'))) {
      return { success: true, message: data.message || 'Akun berhasil diaktivasi!' };
    } else {
      return { success: false, message: data.message || 'Link tidak valid atau kadaluwarsa.' };
    }
  } catch {
    return { success: false, message: 'Server merespon tidak valid' };
  }
}

export default {
  cmd: ['am3'],
  category: 'tools',
  run: async (m, { text }) => {
    if (!text) {
      return m.reply(
        'Alight Motion Premium (site.je)\n\n' +
        'Usage:\n' +
        '.am3 <email> - Kirim magic link\n' +
        '.am3 verify <magiclink> - Verifikasi magic link\n\n' +
        'Contoh:\n' +
        '.am3 email@gmail.com\n' +
        '.am3 verify https://...'
      );
    }
    const args = text.trim().split(/\s+/);
    const firstArg = args[0];
    if (firstArg === 'verify') {
      const link = args.slice(1).join(' ');
      if (!link) return m.reply('Masukkan magic link!');
      let email = 'user@auto.detect';
      try {
        const url = new URL(link);
        const emailParam = url.searchParams.get('email');
        if (emailParam) email = emailParam;
      } catch {}
      await m.reply('Memverifikasi link...');
      const result = await verifyMagicLink(email, link);
      if (result.success) {
        return m.reply('Success: ' + result.message);
      } else {
        return m.reply('Failed: ' + result.message);
      }
    }
    const email = firstArg;
    if (!email.includes('@')) return m.reply('Email tidak valid!');
    await m.reply('Mengirim magic link ke ' + email + '...');
    const result = await sendMagicLink(email);
    if (result.success) {
      return m.reply('Success: ' + result.message + '\n\nLangkah selanjutnya:\n1. Cek email ' + email + ' (termasuk folder Spam)\n2. Copy magic link\n3. Ketik: .am3 verify <magiclink>');
    } else {
      return m.reply('Failed: ' + result.message);
    }
  }
};
