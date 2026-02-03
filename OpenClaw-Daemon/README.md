# OpenClaw Process Daemon
## Windows Edition

### 🛡️ What is the OpenClaw Daemon?
The OpenClaw Daemon is a monitoring service that automatically:
- Starts OpenClaw when it's not running
- Restarts OpenClaw if it crashes
- Provides detailed logging for troubleshooting
- Ensures continuous availability of OpenClaw services

### 🎯 Key Features
- 🔄 Automatic restart on crash (up to 50 attempts)
- 📝 Comprehensive logging to `daemon.log`
- 🎮 Multiple installation path detection
- 🛡️ Graceful shutdown handling
- ⚡ Smart process management

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ installed
- OpenClaw installed and working
- Windows 10/11 (64-bit)

### Automatic Path Detection
The daemon automatically searches for OpenClaw in these locations:
1. `D:\gitcode\openclaw`
2. `C:\gitcode\openclaw`
3. `%USERPROFILE%\gitcode\openclaw`
4. `%USERPROFILE%\openclaw`

### Installation & Usage

#### 1. Start the Daemon
Simply double-click: `Start OpenClaw Daemon.bat`

The daemon will:
- 🔍 Search for OpenClaw installation
- 🚀 Start OpenClaw on port 18789
- 📝 Begin logging to `daemon.log`
- 🔄 Monitor for crashes and restart automatically

#### 2. Stop the Daemon
Double-click: `Stop OpenClaw Daemon.bat`

#### 3. Check Status
- Look for `[OpenClaw]` messages in the console
- Check `daemon.log` for detailed history
- Verify OpenClaw is running: `netstat -ano | findstr :18789`

---

## 📁 File Structure

```
OpenClaw-Daemon/
├── Start OpenClaw Daemon.bat    # 🚀 Launch daemon
├── Stop OpenClaw Daemon.bat     # 🛑 Stop daemon  
├── daemon.js                   # ⚙️ Core daemon logic
└── README.md                   # 📖 This documentation
```

---

## 🔧 Configuration

### Default Settings
- **Restart Attempts**: 50 maximum
- **Restart Delay**: 3 seconds
- **Log File**: `daemon.log` (in daemon directory)
- **OpenClaw Port**: 18789
- **Command**: `node openclaw.mjs gateway --port 18789`

### Customization
You can modify `daemon.js` to change:
- Maximum restart attempts
- Restart delay timing
- Log file location
- OpenClaw startup command

---

## 📝 Logging

The daemon creates detailed logs including:
- ✅ Successful starts and stops
- ❌ Crash detection and restart attempts
- 📍 OpenClaw installation path found
- ⚠️ Error messages and troubleshooting info
- 🕒 Timestamped events in ISO format

Example log entry:
```
[2026-02-02T14:30:15.123Z] 🛡️ OpenClaw Daemon Started
[2026-02-02T14:30:15.456Z] Found OpenClaw at: D:\gitcode\openclaw
[2026-02-02T14:30:16.789Z] 🦞 Starting OpenClaw (attempt 1/50)
[2026-02-02T14:30:25.012Z] [OpenClaw] Gateway listening on ws://127.0.0.1:18789
```

---

## 🐛 Troubleshooting

### Issue: "OpenClaw installation not found"
**Solution:**
1. Install OpenClaw from https://github.com/anomalyco/openclaw
2. Install in one of the default locations
3. Or modify the path detection in `daemon.js`

### Issue: "Port 18789 is occupied"
**Solution:**
1. Find the process: `netstat -ano | findstr :18789`
2. Kill it: `taskkill /PID process_id /F`
3. Restart the daemon

### Issue: Daemon fails to start
**Solution:**
1. Check Node.js: `node --version`
2. Verify OpenClaw works manually
3. Check `daemon.log` for specific errors

### Issue: Infinite restart loop
**Solution:**
This usually indicates a configuration issue. The daemon will:
- Attempt up to 50 restarts
- Stop if it can't maintain a stable connection
- Log detailed error information

---

## 🔄 Integration with Crabwalk

### Perfect Pair
- **OpenClaw Daemon**: Ensures OpenClaw stays running
- **Crabwalk**: Monitors OpenClaw sessions
- **Result**: Complete monitoring solution

### Recommended Workflow
1. **Start OpenClaw Daemon** first (using `Start OpenClaw Daemon.bat`)
2. **Start Crabwalk** second (using `Start Crabwalk.bat`)
3. **Access Crabwalk** at http://localhost:3000
4. **Monitor both** services as needed

---

## 🛡️ Security Notes

- The daemon runs with the same privileges as your user account
- Log files may contain sensitive information
- Only run the daemon from trusted sources
- Regularly check `daemon.log` for unusual activity

---

## 🤝 Contributing

This daemon is part of the Windows adaptation effort. To contribute:
1. Test on different Windows configurations
2. Report issues and suggestions
3. Submit improvements to the daemon logic

---

## 📄 License

This daemon follows the same license as the OpenClaw project.

---

## 🎉 Benefits

### ✅ Why Use the Daemon?
- **Reliability**: Ensures OpenClaw never stays down
- **Automation**: No manual restarts needed
- **Monitoring**: Detailed logs for troubleshooting
- **Integration**: Works perfectly with Crabwalk
- **Windows-Native**: Designed specifically for Windows

### 🎯 Perfect For:
- **Production environments** where uptime matters
- **Development** where crashes are common
- **Automated setups** without manual intervention
- **Users who want "set it and forget it" solution

---

**Enjoy reliable OpenClaw monitoring with the daemon!** 🛡️✨