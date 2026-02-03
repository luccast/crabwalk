import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class OpenClawDaemon {
  constructor() {
    this.process = null;
    this.isRunning = false;
    this.maxRestartAttempts = 50;
    this.restartAttempts = 0;
    this.restartDelay = 3000; // 3 second restart delay
    this.logFile = path.join(__dirname, 'daemon.log');
    this.openclawCommand = ['node', 'openclaw.mjs', 'gateway', '--port', '18789'];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    // Write to log file
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  startProcess() {
    if (this.isRunning) {
      this.log('Process is already running');
      return;
    }

    this.log(`🦞 Starting OpenClaw (attempt ${this.restartAttempts + 1}/${this.maxRestartAttempts})`);
    
    // Try to find OpenClaw installation directory
    const possiblePaths = [
      'D:\\gitcode\\openclaw',
      'C:\\gitcode\\openclaw',
      'D:\\openclaw',
      'C:\\openclaw',
      path.join(process.env.USERPROFILE || '', 'gitcode', 'openclaw'),
      path.join(process.env.USERPROFILE || '', 'openclaw')
    ];
    
    let openclawPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(path.join(testPath, 'openclaw.mjs'))) {
        openclawPath = testPath;
        break;
      }
    }
    
    if (!openclawPath) {
      this.log('ERROR: OpenClaw installation not found. Please install OpenClaw first.');
      this.log('Expected locations:');
      possiblePaths.forEach(p => this.log(`  - ${p}`));
      process.exit(1);
    }
    
    this.log(`Found OpenClaw at: ${openclawPath}`);
    
    // Run openclaw command directly
    this.process = spawn(this.openclawCommand[0], this.openclawCommand.slice(1), {
      cwd: openclawPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });

    this.isRunning = true;

    // Listen to standard output
    this.process.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[OpenClaw] ${output}`);
      }
    });

    // Listen to error output
    this.process.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`[OpenClaw Error] ${output}`);
      }
    });

    // Listen to process exit
    this.process.on('exit', (code, signal) => {
      this.isRunning = false;
      this.process = null;
      
      if (signal === 'SIGINT') {
        this.log('Received SIGINT signal, daemon exiting');
        process.exit(0);
      } else if (code !== 0) {
        this.log(`Process exited abnormally with exit code: ${code}`);
        this.handleRestart();
      } else {
        this.log('Process exited normally');
        this.handleRestart();
      }
    });

    // Listen to process errors
    this.process.on('error', (error) => {
      this.isRunning = false;
      this.process = null;
      this.log(`Process error: ${error.message}`);
      this.handleRestart();
    });
  }

  handleRestart() {
    if (this.restartAttempts >= this.maxRestartAttempts) {
      this.log(`Maximum restart attempts (${this.maxRestartAttempts}) reached, stopping`);
      process.exit(1);
    }

    this.restartAttempts++;
    this.log(`Restarting in ${this.restartDelay}ms...`);
    
    setTimeout(() => {
      this.startProcess();
    }, this.restartDelay);
  }

  stop() {
    if (this.process) {
      this.log('Stopping OpenClaw...');
      this.process.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  start() {
    this.log('🛡️ OpenClaw Daemon Started');
    this.log(`Log file: ${this.logFile}`);
    this.log('Daemon will automatically monitor OpenClaw and restart on crashes');
    this.log('Press Ctrl+C to completely stop the daemon');
    
    // Handle system signals
    process.on('SIGINT', () => {
      this.log('Received Ctrl+C, shutting down...');
      this.stop();
    });

    process.on('SIGTERM', () => {
      this.log('Received termination signal, shutting down...');
      this.stop();
    });

    // Start the process
    this.startProcess();
  }
}

// Start the daemon
const daemon = new OpenClawDaemon();
daemon.start();