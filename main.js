(async () => { 
require('./system/settings')

const { checkApiKey } = require('@jkt48connect/cli');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, generateForwardMessageContent, prepareWAMessageMedia, generateWAMessageFromContent, generateMessageID, downloadContentFromMessage, makeInMemoryStore, jidDecode, getAggregateVotesInPollMessage, proto } = require("jkt48connect-wa")
const WebSocket = require('ws')
const path = require('path')
const pino = require('pino')
const fs = require('fs')
const yargs = require('yargs/yargs')
const cp = require('child_process')
let { promisify } = require('util')
let exec = promisify(cp.exec).bind(cp)
const _ = require('lodash')
const syntaxerror = require('syntax-error')
const os = require('os')
const { randomBytes } = require('crypto')
const PhoneNumber = require('awesome-phonenumber')
const moment = require("moment-timezone")
const chalk = require('chalk')
const { color } = require('./lib/color')
let simple = require('./lib/simple')
var low

// Enhanced API Key Validation with Advanced Security
const apiKeyValidation = (() => {
    const apiKey = process.env.JKT48_CONNECT_API_KEY || global.jkt48connect;
    if (!apiKey) {
        console.error(chalk.red("❌ No API Key found. Exiting..."));
        process.exit(1);
    }

    const checkInterval = 30000; // 30 seconds
    const maxFailedAttempts = 3;
    let failedAttempts = 0;

    const validateApiKey = async () => {
        try {
            await checkApiKey(apiKey);
            failedAttempts = 0; // Reset failed attempts on successful validation
            return true;
        } catch (err) {
            failedAttempts++;
            console.error(chalk.yellow(`API Key validation failed (Attempt ${failedAttempts}): ${err.message}`));
            
            if (failedAttempts >= maxFailedAttempts) {
                console.error(chalk.red("❌ Maximum API Key validation attempts reached. Exiting..."));
                process.exit(1);
            }
            return false;
        }
    };

    return {
        start: () => {
            validateApiKey(); // Initial check
            return setInterval(validateApiKey, checkInterval);
        }
    };
})();

// Start API Key validation
apiKeyValidation.start();

try {
  low = require('lowdb')
} catch (e) {
  low = require('./lib/lowdb')
}
const readline = require("readline");
const question = (text) => {
const rl = readline.createInterface({
input: process.stdin,
output: process.stdout
  });
  return new Promise((resolve) => {
rl.question(text, resolve)
  })
};
const { Low, JSONFile } = low
const mongoDB = require('./lib/mongoDB')

require("http").createServer((_, res) => res.end("Uptime!")).listen(8080)

// RandomBytes
const randomID = length => randomBytes(Math.ceil(length * .5)).toString('hex').slice(0, length)

const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
} 

API = (name, path = '/', query = {}, apikeyqueryname) => (name in APIs ? APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: APIKeys[name in APIs ? APIs[name] : name] } : {}) })) : '')

timestamp = {
  start: new Date
}

const PORT = process.env.PORT || 3000

opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
prefix = new RegExp('^[' + (opts['prefix'] || '芒鈧絰zXZ/i!#$%+脗拢脗垄芒鈥毬偮脗掳=脗露芒藛鈥犆冣€斆兟访忊偓芒藛拧芒艙鈥溍偮┟偮�:;?&.\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')

db = new Low(
  /https?:\/\//.test(opts['db'] || '') ?
    new cloudDBAdapter(opts['db']) : /mongodb/i.test(opts['db']) ?
      new mongoDB(opts['db']) :
      new JSONFile(`${opts._[0] ? opts._[0] + '_' : ''}database.json`)
)

DATABASE = db // Backwards Compatibility
loadDatabase = async function loadDatabase() {
  if (db.READ) return new Promise((resolve) => setInterval(function () { (!db.READ ? (clearInterval(this), resolve(db.data == null ? loadDatabase() : db.data)) : null) }, 1 * 1000))
  if (db.data !== null) return
  db.READ = true
  await db.read()
  db.READ = false
  db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    sticker: {},
    settings: {},
    respon : {},
    ...(db.data || {})
  }
  db.chain = _.chain(db.data)
}
loadDatabase()

const printQRInTerminal = process.argv.includes("--qr-code")
const authFolder = `${opts._[0] || 'Session'}`
global.isInit = !fs.existsSync(authFolder)
const { state, saveCreds } = await useMultiFileAuthState(authFolder)

const connectionOptions = {
  ...(!printQRInTerminal && {
    pairingCode: true
  }),
  ...(printQRInTerminal && {
    pairingCode: !printQRInTerminal
  }),
  logger: pino({ level: "silent" }), 
  auth: state,
  markOnlineOnConnect: false,
  browser: ["Ubuntu","Chrome","20.0.04"]
}

global.conn = simple.makeWASocket(connectionOptions)
global.ev = global.conn.ev

if(!conn.authState.creds.registered) {
const phoneNumber = await question(chalk.bgBlack(chalk.redBright("Start with your country's WhatsApp code, Example : 62xxx\n")))
const code = await conn.requestPairingCode(phoneNumber.trim())
console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)))
}

if (!opts['test']) {
  if (db) setInterval(async () => {
    if (global.db.data) await db.write()
    if (opts['autocleartmp'] && (support || {}).find) (tmp = [os.tmpdir(), 'tmp'], tmp.forEach(filename => cp.spawn('find', [filename, '-amin', '3', '-type', 'f', '-delete'])))
  }, 30 * 1000)
}
if (opts['server']) require('./server')(conn, PORT)

function clearTmp() {
  const tmp = [os.tmpdir(), path.join(__dirname, './tmp')]
  const filename = []
  tmp.forEach(dirname => fs.readdirSync(dirname).forEach(file => filename.push(path.join(dirname, file))))
  filename.map(file => (
    stats = fs.statSync(file),
    stats.isFile() && (Date.now() - stats.mtimeMs >= 1000 * 60 * 3) ?
      fs.unlinkSync(file) :
      null))
}

// Improved connection monitoring and auto-restart
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 5;
const RESTART_DELAY = 5000; // 5 seconds

async function connectionUpdate(update) {
  const { receivedPendingNotifications, connection, lastDisconnect, isOnline, isNewLogin } = update;
  
  if (connection === 'close') {
    const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
    
    if (shouldReconnect) {
      restartAttempts++;
      
      if (restartAttempts > MAX_RESTART_ATTEMPTS) {
        console.error(chalk.red('Max restart attempts reached. Please check your connection manually.'));
        process.exit(1);
      }
      
      console.log(chalk.yellow(`Connection lost. Attempting to reconnect (Attempt ${restartAttempts})...`));
      
      setTimeout(() => {
        reloadHandler(true);
      }, RESTART_DELAY);
    } else {
      console.log(chalk.red('Connection closed. Logout detected.'));
      process.exit(1);
    }
  }
  
  if (connection === 'connecting') {
    console.log(chalk.yellow('Connecting to WhatsApp...'));
  }
  
  if (connection === 'open') {
    console.log(chalk.green('WhatsApp connection established.'));
    restartAttempts = 0;
    startDelynnAI();
  }
}

// DelynnAI Process Management
let delynnAIProcess = null;

function startDelynnAI() {
  if (delynnAIProcess) {
    console.log(chalk.yellow('DelynnAI is already running.'));
    return;
  }

  delynnAIProcess = cp.spawn('node', ['delynai.js'], {
    stdio: 'inherit',
    shell: true
  });

  delynnAIProcess.on('error', (error) => {
    console.error(chalk.red(`Failed to start DelynnAI: ${error.message}`));
    delynnAIProcess = null;
  });

  delynnAIProcess.on('exit', (code, signal) => {
    console.log(chalk.yellow(`DelynnAI process exited with code ${code} and signal ${signal}`));
    delynnAIProcess = null;
    
    // Auto-restart DelynnAI after a short delay
    setTimeout(startDelynnAI, 5000);
  });
}

// Minimal logging and reduced verbosity
process.on('uncaughtException', (err) => {
  console.error(chalk.red('Uncaught Exception:'), err);
});

let isInit = true, handler = require('./handler')
reloadHandler = function (restatConn) {
  let Handler = require('./handler')
  if (Object.keys(Handler || {}).length) handler = Handler
  if (restatConn) {
    try { conn.ws.close() } catch { }
    conn = {
      ...conn, ...simple.makeWASocket(connectionOptions)
    }
  }
  if (!isInit) {
    conn.ev.off('messages.upsert', conn.handler)
    conn.ev.off('group-participants.update', conn.onParticipantsUpdate)
    conn.ev.off('connection.update', conn.connectionUpdate)
    conn.ev.off('creds.update', conn.credsUpdate)
  }

  conn.welcome = 'Hai, @user!\nSelamat datang di grup *@subject*\n\n@desc'
  conn.bye = 'Selamat tinggal @user!'
  conn.spromote = '@user sekarang admin!'
  conn.sdemote = '@user sekarang bukan admin!'
  conn.handler = handler.handler.bind(conn)
  conn.onParticipantsUpdate = handler.participantsUpdate.bind(conn)
  conn.connectionUpdate = connectionUpdate.bind(conn)
  conn.credsUpdate = saveCreds.bind(conn)

  conn.ev.on('messages.upsert', conn.handler)
  conn.ev.on('group-participants.update', conn.onParticipantsUpdate)
  conn.ev.on('connection.update', conn.connectionUpdate)
  conn.ev.on('creds.update', conn.credsUpdate)
  isInit = false
  return true
}

// Plugin loading with error handling
let pluginFolder = path.join(__dirname, 'plugins')
let pluginFilter = filename => /\.js$/.test(filename)
plugins = {}
let pluginFiles = fs.readdirSync(pluginFolder).filter(pluginFilter)

pluginFiles.forEach(filename => {
    try {
        plugins[filename] = require(path.join(pluginFolder, filename))
    } catch (e) {
        console.error(chalk.red(`Error loading plugin ${filename}:`), e);
        delete plugins[filename]
    }
})

reload = (_ev, filename) => {
  if (pluginFilter(filename)) {
    let dir = path.join(pluginFolder, filename)
    if (dir in require.cache) {
      delete require.cache[dir]
      
      let err = syntaxerror(fs.readFileSync(dir), filename)
      if (err) {
        console.error(chalk.red(`Syntax error in ${filename}:`), err);
        return;
      }
      
      try {
        plugins[filename] = require(dir)
      } catch (e) {
        console.error(chalk.red(`Error requiring plugin ${filename}:`), e);
      }
    }
  }
}

fs.watch(path.join(__dirname, 'plugins'), reload)
reloadHandler()

})()
