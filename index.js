const cluster = require('cluster');
const path = require('path');
const fs = require('fs');
const os = require('os');
const nodemailer = require('nodemailer');
const CFonts = require('cfonts');
const chalk = require('chalk');
const moment = require('moment-timezone');
const { Client, GatewayIntentBits } = require('discord.js');
const { checkApiKey } = require("@jkt48connect/cli");

// Import settings directly
const settings = require('./system/settings');

// Dynamic imports
let boxen;
(async () => {
  boxen = await import('boxen');
})();

// Enhanced logging and error handling
class Logger {
  static error(message) {
    console.error(chalk.bold.red(`[ERROR] ${message}`));
  }

  static success(message) {
    console.log(chalk.bold.green(`[SUCCESS] ${message}`));
  }

  static info(message) {
    console.log(chalk.bold.blue(`[INFO] ${message}`));
  }

  static warn(message) {
    console.log(chalk.bold.yellow(`[WARNING] ${message}`));
  }
}

// Network and System Information Gathering
class SystemInfo {
  static getIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const iface in interfaces) {
      for (const detail of interfaces[iface]) {
        if (detail.family === 'IPv4' && !detail.internal) {
          return detail.address;
        }
      }
    }
    return 'N/A';
  }

  static async getSystemDetails() {
    return {
      hostname: os.hostname(),
      cpu: os.cpus()[0].model,
      ram: Math.round(os.totalmem() / (1024 ** 2)),
      ip: this.getIPAddress(),
      developer: settings.developer || 'Valzyy',
      time: moment.tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
    };
  }
}

// Email Notification Service
class EmailNotifier {
  static async send(details) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: settings.emailUser || 'jkt48connect@gmail.com',
          pass: settings.emailPass || 'yffkdsunrxpoigvb'
        }
      });

      const mailOptions = {
        from: `"${settings.botName || 'JKT48Connect Bot'}" <${settings.emailUser || 'jkt48connect@gmail.com'}>`,
        to: settings.notificationEmail || 'jkt48connect@stayhome.li',
        subject: 'Bot Initialization Notification',
        text: JSON.stringify(details, null, 2)
      };

      await transporter.sendMail(mailOptions);
      Logger.success('Notification email sent successfully');
    } catch (error) {
      Logger.error(`Email sending failed: ${error.message}`);
    }
  }
}

// Enhanced UI Display
class UIDisplay {
  static showBanner() {
    CFonts.say(settings.bannerText || 'DELYNN', {
      font: 'block',
      align: 'center',
      colors: ['cyan', 'blue'],
      background: 'black',
      letterSpacing: 1,
      space: true,
      size: 1
    });
  }

  static async displaySystemInfo() {
    const systemInfo = await SystemInfo.getSystemDetails();

    const boxOptions = {
      padding: 1,
      margin: 1,
      borderColor: 'cyan',
      backgroundColor: 'black',
      borderStyle: 'round',
    };

    const infoTable = `
${chalk.bold.cyan('🖥️  SYSTEM INFORMATION 🖥️')}

${chalk.yellow('➤ Hostname')}     : ${chalk.whiteBright(systemInfo.hostname)}
${chalk.yellow('➤ CPU')}          : ${chalk.whiteBright(systemInfo.cpu)}
${chalk.yellow('➤ RAM')}          : ${chalk.whiteBright(`${systemInfo.ram} MB`)}
${chalk.yellow('➤ IP Address')}   : ${chalk.whiteBright(systemInfo.ip)}
${chalk.yellow('➤ Developer')}    : ${chalk.whiteBright(systemInfo.developer)}
${chalk.yellow('➤ Timestamp')}    : ${chalk.whiteBright(systemInfo.time)}
    `;

    this.showBanner();
    console.log(boxen.default(infoTable, boxOptions));
  }
}

// Main Bot Process Manager
class BotManager {
  static isRunning = false;

  static async start(file) {
    if (this.isRunning) {
      Logger.warn('Bot is already running');
      return;
    }

    try {
      // Validate API Key from settings
      const apiKey = global.jkt48connect;
      if (!apiKey) {
        throw new Error('API Key is not defined in settings');
      }

      await checkApiKey(apiKey);
      Logger.success('API Key validated successfully');

      // Display System Info
      await UIDisplay.displaySystemInfo();

      // Prepare Process
      this.isRunning = true;
      cluster.setupMaster({
        exec: path.join(__dirname, file),
        args: ['--pairing-code', '--autoread', '--autocleartmp']
      });

      const process = cluster.fork();
      
      process.on('exit', (code) => {
        this.isRunning = false;
        
        if (code === 0) {
          Logger.info('Process completed successfully');
        } else {
          Logger.error(`Process exited with code ${code}`);
          this.restartProcess(file);
        }
      });

      // Send Notification Email
      await EmailNotifier.send(await SystemInfo.getSystemDetails());

    } catch (error) {
      Logger.error(`Initialization failed: ${error.message}`);
      process.exit(1);
    }
  }

  static restartProcess(file) {
    Logger.warn('Attempting to restart the process...');
    fs.watchFile(file, () => {
      fs.unwatchFile(file);
      this.start(file);
    });
  }
}

// Main Execution
(async () => {
  try {
    await BotManager.start('main.js');
  } catch (error) {
    Logger.error(`Startup error: ${error.message}`);
    process.exit(1);
  }
})();
