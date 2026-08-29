export default {
  cmd: ['base64', 'b64'],
  category: 'tools',
  description: 'Encode/decode Base64',
  run: async (m, { text }) => {
    if (!text) return m.reply('Usage: .base64 encode|decode <string>');
    const [mode, ...rest] = text.split(' ');
    const input = rest.join(' ');
    if (!input) return m.reply('Masukkan string.');
    try {
      const result = mode === 'encode' || mode === 'enc'
        ? Buffer.from(input, 'utf-8').toString('base64')
        : mode === 'decode' || mode === 'dec'
          ? Buffer.from(input, 'base64').toString('utf-8')
          : null;
      if (result === null) return m.reply('Mode harus encode atau decode');
      return m.reply(result);
    } catch {
      return m.reply('Error: input tidak valid');
    }
  }
};
