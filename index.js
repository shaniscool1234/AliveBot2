const mineflayer = require('mineflayer');
const { Movements, pathfinder, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;
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

  bot.loadPlugin(pathfinder);
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.settings.colorsEnabled = false;

  let pendingPromise = Promise.resolve();

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
      console.log('[INFO] Started auto-auth module');
      const password = config.utils['auto-auth'].password;
      pendingPromise = pendingPromise
        .then(() => sendRegister(password))
        .then(() => sendLogin(password))
        .catch(err => console.error('[ERROR]', err));
    }

    // --- Chat Messages ---
    if (config.utils['chat-messages'].enabled) {
      console.log('[INFO] Started chat-messages module');
      const messages = config.utils['chat-messages']['messages'];
      if (config.utils['chat-messages'].repeat) {
        const delay = config.utils['chat-messages']['repeat-delay'];
        let i = 0;
        setInterval(() => {
          bot.chat(messages[i]);
          i = (i + 1) % messages.length;
        }, delay * 1000);
      } else {
        messages.forEach(msg => bot.chat(msg));
      }
    }

    // --- Move to Position ---
    if (config.position.enabled) {
      const pos = config.position;
      console.log(`\x1b[32m[AfkBot] Moving to (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`);
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
    }

    // --- Anti-AFK Movement ---
    if (config.utils['anti-afk'].enabled) {
      console.log('[INFO] Anti-AFK module active');
      if (config.utils['anti-afk'].sneak) bot.setControlState('sneak', true);

      setInterval(() => {
        const yaw = Math.random() * Math.PI * 2;
        const pitch = (Math.random() - 0.5) * 0.5;
        bot.look(yaw, pitch, true);

        const actions = ['forward', 'back', 'left', 'right'];
        const action = actions[Math.floor(Math.random() * actions.length)];
        bot.setControlState(action, true);
        setTimeout(() => bot.setControlState(action, false), 500);

        console.log('[Anti-AFK] Sent small movement packet.');
      }, 60 * 1000); // every 60 seconds
    }
  });

  // --- Events ---
  bot.on('goal_reached', () => {
    console.log(`\x1b[32m[AfkBot] Reached goal at ${bot.entity.position}\x1b[0m`);
  });

  bot.on('death', () => {
    console.log(`\x1b[33m[AfkBot] Bot died and respawned at ${bot.entity.position}\x1b[0m`);
  });

  bot.on('end', () => {
    if (config.utils['auto-reconnect']) {
      console.log('[INFO] Bot disconnected, attempting to reconnect...');
      setTimeout(() => createBot(), config.utils['auto-reconnect-delay']);
    }
  });

  bot.on('kicked', reason =>
    console.log('\x1b[33m', `[AfkBot] Bot kicked: ${reason}`, '\x1b[0m')
  );

  bot.on('error', err =>
    console.log(`\x1b[31m[ERROR] ${err.message}\x1b[0m`)
  );
}

createBot();
