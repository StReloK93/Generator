/**
 * Optional Telegram bot (TELEGRAM_BOT_TOKEN and TELEGRAM_WEBAPP_URL in .env): puts a "Play" button that opens the
 * game as a Mini App in the bot's menu, and answers /start with the same button. "/start room_123456" (a bot link
 * a friend shared) opens that room's lobby. Long polling, so the server needs no public webhook.
 */

const TEXTS = {
  uz: { name: 'Olamlar', play: "O'ynash", welcome: "Olamlar'ga xush kelibsiz! O'yinni ochish uchun tugmani bosing.", invited: room => `Do'stingiz sizni ${room} xonasiga taklif qildi.` },
  ru: { name: 'Царства', play: 'Играть', welcome: 'Добро пожаловать в Царства! Нажмите кнопку, чтобы открыть игру.', invited: room => `Друг пригласил вас в комнату ${room}.` },
  en: { name: 'Realms', play: 'Play', welcome: 'Welcome to Realms! Tap the button to open the game.', invited: room => `A friend invited you to room ${room}.` },
}
const textsFor = language => TEXTS[language?.slice(0, 2)] ?? TEXTS.en

const POLL_TIMEOUT_SEC = 50
const RETRY_MS = 5000

export function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const webAppUrl = process.env.TELEGRAM_WEBAPP_URL?.replace(/\/$/, '')
  if (!token || !webAppUrl) return

  const call = async (method, body = {}) => {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!data.ok) throw new Error(`${method}: ${data.description}`)
    return data.result
  }

  call('setChatMenuButton', { menu_button: { type: 'web_app', text: TEXTS.uz.play, web_app: { url: webAppUrl } } })
    .catch(err => console.warn('[telegram]', err.message))

  const answerStart = message => {
    const texts = textsFor(message.from?.language_code)
    const room = message.text.split(' ')[1]?.match(/^room_(\d{6})$/)?.[1]
    return call('sendMessage', {
      chat_id: message.chat.id,
      text: room ? texts.invited(room) : texts.welcome,
      reply_markup: {
        inline_keyboard: [[{ text: `${texts.play} — ${texts.name}`, web_app: { url: room ? `${webAppUrl}/lobby/${room}` : webAppUrl } }]],
      },
    })
  }

  let offset = 0
  const poll = async () => {
    try {
      const updates = await call('getUpdates', { offset, timeout: POLL_TIMEOUT_SEC, allowed_updates: ['message'] })
      for (const update of updates) {
        offset = update.update_id + 1
        if (update.message?.text?.startsWith('/start')) await answerStart(update.message)
      }
    } catch (err) {
      console.warn('[telegram]', err.message)
      await new Promise(resolve => setTimeout(resolve, RETRY_MS))
    }
    poll()
  }
  poll()
  console.log('Telegram bot: polling')
}
