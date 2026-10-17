# SWITCH - Remote PC Power Controller (Vercel Cloud Edition)

> Permanent, zero-downtime, secure cloud controller for Windows 11 PC Remote Power On (Wake-on-LAN) and Graceful Remote Shutdown.

---

## ⚡ Architecture Overview

```
                      +-----------------------------+
                      |       Your Smartphone       |
                      |  (Anywhere on 4G/5G/Wi-Fi)  |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Vercel Cloud Controller   |
                      |  https://<your-app>.vercel.app
                      +--------------+--------------+
                                     |
                    HTTP Polling (Every 2 seconds)
                                     |
                +--------------------+--------------------+
                |                                         |
                v                                         v
+-------------------------------+         +-------------------------------+
|    Morphy PC (Host Win 11)    |         |       RHU IT Gaming PC        |
|     `switch-cloud-bridge`     |         |     `switch-gaming-agent`     |
|                               |         |                               |
| • Polls Vercel for WoL / Off  |         | • Polls Vercel for Shutdown   |
| • Broadcasts local UDP WoL    |         | • Executes local shutdown     |
|   packets to 192.168.254.255  |         |   without Windows Error 53    |
+-------------------------------+         +-------------------------------+
```

---

## 🚀 Features

- **Permanent URL**: Never changes when PCs reboot or restart.
- **PWA Ready**: Add to Home Screen on iOS and Android for a native app feel.
- **PIN Protected**: Requires Passcode (default `1234`) before any power action.
- **Multi-PC Support**: Switch between Morphy PC and RHU IT Gaming PC.
- **Cross-Subnet Graceful Shutdown**: Prevents Windows RPC Error 53.
- **Real-Time Online Badges**: Live heartbeat from each PC.

---

## 🔧 Deployment to Vercel

1. Push this repository to GitHub:
   ```bash
   gh repo create Morphmatt14/switch-pc-power --public --source=. --push
   ```
2. In [Vercel Dashboard](https://vercel.com/new):
   - Click **Import** next to `switch-pc-power`.
   - Click **Deploy**.
   - Your permanent URL will be `https://switch-pc-power.vercel.app` (or custom subdomain).

3. Set Environment Variable in Vercel (Optional):
   - `SECRET_PIN`: Change your 4-digit PIN (default: `1234`).
