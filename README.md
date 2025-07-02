# Instagram Bulk Unlike

> 🔧 A clean, simple Chrome/Brave extension to bulk-unlike Instagram posts from your Likes page.

[🧩 Get the Extension on the Chrome Web Store →](https://chromewebstore.google.com/detail/instagram-bulk-unlike/cebcpbhkblcbdbblgpaelhfoldffenlj)

---

## 🚀 Quick Start (Locally)

1. **Clone the Repo**
   ```bash
   git clone https://github.com/Ghostcar5153/instagram-bulk-unlike.git
   ```

2. **Load the Extension**
   - Visit `chrome://extensions/` or `brave://extensions`
   - Enable **Developer Mode**
   - Click **Load unpacked**
   - Select the `instagram-bulk-unlike` folder

**(If you downloaded the [chrome extension](https://chromewebstore.google.com/detail/instagram-bulk-unlike/cebcpbhkblcbdbblgpaelhfoldffenlj) you can skip steps 1 & 2)**

3. **Open Instagram Likes Page**
   - Go to: `https://www.instagram.com/your_activity/interactions/likes/`
   - Click the extension icon 🧩
   - Tap ⚙️ to configure settings and start unliking

---

## 🎯 Features

- ⚙️ **Custom Delays & Presets** – Conservative, Balanced, Aggressive modes or full manual control
- 🖥️ **Live Dashboard** – Realtime feedback: current action, cycles, progress
- 🔄 **Retry System** – Auto-retry failed actions with safety logic
- 🧠 **Rate Limiting Support** – Avoid bans by simulating human behavior
- 💾 **Import/Export Settings** – Easily backup or share your configuration
- 🧼 **Modern UI** – Dark-themed, responsive popup with status indicators
- 🔘 **One‑Click Control** – Start, stop, and reset your progress any time

---

## 💽 Supported Browsers

- Chrome (v90+) (Tested)
- Brave (Tested)
### Browsers that should work but i have not tried
- Microsoft Edge (Chromium)
- Opera

---

## ⚙️ Configuration Settings

| Setting            | Description                                | Default |
|--------------------|--------------------------------------------|---------|
| **Items / Cycle**  | How many posts to process in one batch     | `50`    |
| **Between Clicks** | Delay between post interactions (ms)       | `100`   |
| **After Select**   | Wait after selecting a post (ms)           | `500`   |
| **After Unlike**   | Delay after clicking "Unlike" (ms)         | `1000`  |
| **Reload Wait**    | Delay before reloading the Likes page (ms) | `1000`  |
| **Resume Delay**   | Wait time before starting next cycle (ms)  | `5000`  |
| **Rate Limit**     | Enables Instagram-safe mode                | ✅       |
| **Auto-Retry**     | Retries failed attempts automatically      | ✅       |
| **Max Retries**    | Maximum retries per failed item            | `3`     |

---

## 🔄 How It Works

1. Extension checks if you're on your Instagram Likes page.
2. On start, it selects a batch of posts and begins unliking with delays.
3. Reloads the page and repeats until complete or stopped.
4. All actions are tracked with live status and can be paused or reset.

---

## 🛠️ Known Issues

- Some items may not be selected due to dynamic loading delays.
- If issues occur, try reducing batch size or increasing delays.
- There may be the very slight possibility of 1 or 2 ghost posts, due to an account going from public to private

---

## 🙌 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Follow [Conventional Commits](https://www.conventionalcommits.org/)
4. Open a pull request with your changes

---

## ⚠️ Disclaimer

This tool automates Instagram interactions. Use responsibly—Instagram may rate-limit or restrict your account for excessive activity. The author is not responsible for any resulting account issues or penalties.

---

## 📄 License

Licensed under the MIT License.  
See the [LICENSE](./LICENSE) file for full details.
