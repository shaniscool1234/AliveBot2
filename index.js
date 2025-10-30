const mineflayer = require('mineflayer');
const { Movements } = require('mineflayer-pathfinder');
const express = require('express');
const config = require('./settings.json');

const app = express();
app.get('/', (req, res) => res.send('Bot has arrived'));
app.listen(8000, () => console.log('Server started'));

function createBot() {
  const bot = mineflayer.createBot({
    username: config['bot-account']['username'],
    password: config['bot-account']['password'],
    auth: config['bot-account']['type'],
    host: config.server.ip,
    port: config.server.port,
    version: config.server.version
  });

  bot.settings.colorsEnabled = false;

  // Auto-auth functions
  async function sendRegister(password) {
    bot.chat(`/register ${password} ${password}`);
    console.log(`[Auth] Sent /register command.`);
  }

  async function sendLogin(password) {
    bot.chat(`/login ${password}`);
    console.log(`[Auth] Sent /login command.`);
  }

  bot.once('spawn', () => {
    console.log('\x1b[33m[AfkBot] Bot joined the server\x1b[0m');

    // --- Auto Auth ---
    if (config.utils['auto-auth'].enabled) {
      const password = config.utils['auto-auth'].password;
      sendRegister(password).then(() => sendLogin(password)).catch(err => console.error('[ERROR]', err));
    }

    // --- Chat Messages ---
    if (config.utils['chat-messages'].enabled) {
      const messages = config.utils['chat-messages']['messages'];
      let i = 0;
      setInterval(() => {
        bot.chat(messages[i]);
        i = (i + 1) % messages.length;
      }, config.utils['chat-messages']['repeat-delay'] * 1000);
    }

    // --- Anti-AFK (Box-Safe) ---
    if (config.utils['anti-afk'].enabled) {
      if (config.utils['anti-afk'].sneak) bot.setControlState('sneak', true);

      // Look around slightly every 30 seconds
      setInterval(() => {
        const yaw = Math.random() * Math.PI * 2;
        const pitch = (Math.random() - 0.5) * 0.3;
        bot.look(yaw, pitch, true);
        console.log('[Anti-AFK] Looked around.');
      }, 30000);

      // Small jump every 2 minutes
      setInterval(() => {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 200);
      }, 120000);
    }

    // --- Auto-Eat Food (every 10 minutes) ---
    setInterval(async () => {
      const foodItem = bot.inventory.items().find(item => item.name.includes('beef') || item.name.includes('bread') || item.name.includes('carrot') || item.name.includes('pork'));
      if (foodItem) {
        try {
          await bot.equip(foodItem, 'hand');
          await bot.consume();
          console.log('[Auto-Eat] Ate some food:', foodItem.name);
        } catch (err) {
          console.log('[Auto-Eat] Failed to eat food:', err.message);
        }
      } else {
        console.log('[Auto-Eat] No food in inventory.');
      }
    }, 10 * 60 * 1000); // every 10 minutes
  });

  // --- Events ---
  bot.on('end', () => {
    if (config.utils['auto-reconnect']) {
      console.log('[INFO] Bot disconnected, reconnecting...');
      setTimeout(createBot, config.utils['auto-reconnect-delay']);
    }
  });

  bot.on('kicked', reason =>
    console.log('\x1b[33m[AfkBot] Bot kicked:', reason, '\x1b[0m')
  );

  bot.on('error', err =>
    console.log('\x1b[31m[ERROR]', err.message, '\x1b[0m')
  );
}

createBot();
