const MIRRORS = ['https://konachan.com', 'https://konachan.net'];
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://konachan.com/post'
};

function compressImage(url) {
  if (!url) return url;
  return url.replace(/\.(jpg|jpeg|png|gif)/i, '.jpg');
}

async function fetchKonachan(query = '', page = 1) {
  const tagQuery = query.trim() ? query.trim().replace(/\s+/g, '+') : '';
  const apiUrl = `https://konachan.com/post.json?limit=100&tags=${encodeURIComponent(tagQuery)}&page=${page}`;

  const response = await fetch(apiUrl, {
    headers: BROWSER_HEADERS,
    timeout: 15000
  });

  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

async function getRandomKonachan(query = '', limit = 5) {
  const numLimit = Math.min(Math.max(1, parseInt(limit) || 5), 10);
  const page = Math.floor(Math.random() * 50) + 1;

  let data = await fetchKonachan(query, page);

  if (!data || data.length === 0) {
    if (query) {
      data = await fetchKonachan('', page);
    }
    if (!data || data.length === 0) {
      throw new Error('Tidak ada gambar ditemukan');
    }
  }

  const picked = [...data].sort(() => 0.5 - Math.random()).slice(0, numLimit);

  return picked.map(post => {
    let url = post.file_url;
    if (url && !url.includes('sample')) {
      url = url.replace(/\.(jpg|jpeg|png|gif)/i, '.jpg');
    }
    return {
      url: url,
      preview: post.preview_url,
      sample_url: post.sample_url,
      tags: post.tags ? post.tags.split(' ') : [],
      rating: post.rating,
      source: 'https://konachan.com/post/show/' + post.id,
      id: post.id
    };
  });
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: BROWSER_HEADERS
  });
  if (!response.ok) throw new Error('Gagal download gambar');
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

export default {
  cmd: ['konachan', 'kona'],
  category: 'image',
  description: 'Ambil gambar random dari Konachan',
  run: async (m, { sock, text }) => {
    const args = text?.trim().split(/\s+/) || [];
    let query = '';
    let limit = 5;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-l' || args[i] === '--limit') {
        limit = parseInt(args[i + 1]) || 5;
        i++;
      } else if (args[i] === '-t' || args[i] === '--tag') {
        query = args[i + 1] || '';
        i++;
      } else {
        query = args[i];
      }
    }

    try {
      await m.reply('Mencari gambar...');
      const images = await getRandomKonachan(query, limit);

      if (images.length === 1) {
        try {
          const buffer = await downloadImage(images[0].url);
          if (buffer.length > 15 * 1024 * 1024) {
            const sampleUrl = images[0].sample_url || images[0].preview;
            if (sampleUrl) {
              const sampleBuffer = await downloadImage(sampleUrl);
              await sock.sendMessage(m.chat, {
                image: sampleBuffer,
                caption: 'Konachan (compressed)\nTags: ' + (images[0].tags.slice(0, 10).join(', ') || '-') + '\nRating: ' + images[0].rating
              }, { quoted: m });
              return;
            }
          }
          await sock.sendMessage(m.chat, {
            image: buffer,
            caption: 'Konachan\nTags: ' + (images[0].tags.slice(0, 10).join(', ') || '-') + '\nRating: ' + images[0].rating
          }, { quoted: m });
        } catch {
          const sampleUrl = images[0].sample_url || images[0].preview;
          if (sampleUrl) {
            const sampleBuffer = await downloadImage(sampleUrl);
            await sock.sendMessage(m.chat, {
              image: sampleBuffer,
              caption: 'Konachan (compressed)\nTags: ' + (images[0].tags.slice(0, 10).join(', ') || '-') + '\nRating: ' + images[0].rating
            }, { quoted: m });
          } else {
            throw new Error('Gagal download gambar');
          }
        }
      } else {
        const album = [];
        for (const img of images) {
          try {
            let buffer = await downloadImage(img.url);
            if (buffer.length > 15 * 1024 * 1024) {
              const sampleUrl = img.sample_url || img.preview;
              if (sampleUrl) {
                buffer = await downloadImage(sampleUrl);
              }
            }
            album.push({
              image: buffer,
              caption: 'Tags: ' + (img.tags.slice(0, 10).join(', ') || '-') + '\nRating: ' + img.rating
            });
          } catch {
            const sampleUrl = img.sample_url || img.preview;
            if (sampleUrl) {
              const buffer = await downloadImage(sampleUrl);
              album.push({
                image: buffer,
                caption: 'Tags: ' + (img.tags.slice(0, 10).join(', ') || '-') + '\nRating: ' + img.rating
              });
            }
          }
        }
        if (album.length > 0) {
          await sock.sendAlbum(m.chat, album, { quoted: m });
        } else {
          throw new Error('Gagal download semua gambar');
        }
      }
    } catch (error) {
      return m.reply('Error: ' + error.message);
    }
  }
};
