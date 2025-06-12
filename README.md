# Instagram Bulk Unlike

> 🔧 A lightweight Chrome/Brave extension to bulk‑unlike Instagram posts from your Likes page.

---

## 🚀 Quick Start

1. **Clone the repo**

   ```bash
   git clone https://github.com/Ghostcar5153/instagram-bulk-unlike.git
   ```

2. **Load as an unpacked extension**

   * Go to `chrome://extensions` or `brave://extensions`
   * Enable **Developer mode** (top-right switch)
   * Click **Load unpacked** and select the `instagram-bulk-unlike` folder

3. **Open your Instagram Likes**

   * Navigate to: `https://www.instagram.com/your_activity/interactions/likes/`
   * Click the extension icon 🧩, then hit ⚙️ to configure and start

---

## 🎯 Features

* **Bulk Unlike**: Automatically removes likes from hundreds of posts
* **Real-time Dashboard**: Live tracking of cycles, actions, and processing status
* **Presets**: Choose between **Conservative**, **Balanced**, or **Aggressive** configurations
* **Custom Delays**: Full control over timing for each stage (clicks, reloads, retries)
* **Rate Limiting & Retry Logic**: Avoids bans and retries intelligently
* **Settings Modal**: Modern, responsive modal for configuration
* **Import/Export**: Easily back up and restore your settings as JSON
* **New UI**: Completely redesigned, clean and responsive layout with feedback and status indicators

---

## 💽 Supported Browsers

* Chrome (v90+)
* Brave
* Edge (Chromium)
* Opera

---

## ⚙️ Configuration Settings

| Setting            | Description                                | Default |
| ------------------ | ------------------------------------------ | ------- |
| **Items / cycle**  | Posts unliked per batch                    | `50`    |
| **Between clicks** | Delay between unlike clicks (ms)           | `100`   |
| **After select**   | Wait after selecting a post (ms)           | `500`   |
| **After unlike**   | Wait after unliking a post (ms)            | `1000`  |
| **Reload wait**    | Wait after reloading Likes page (ms)       | `1000`  |
| **Resume delay**   | Wait before starting a new cycle (ms)      | `5000`  |
| **Rate limit**     | Enables safety for Instagram limits        | ✔️      |
| **Auto-retry**     | Automatically retries failed actions       | ✔️      |
| **Max retries**    | Number of retry attempts per failed action | `3`     |

---

## 🔄 How It Works

By default, the extension:

1. Selects a batch of posts (based on the configured **Items / cycle**, default and recommended by me: 50).
2. Unlikes each post with the specified delays between actions.
3. Reloads the Likes page after processing the batch.
4. Waits for the configured **Resume delay** (default: `5000 ms`).
5. Repeats automatically until all posts are processed or you stop it.

---

## 📸 Using It

1. Go to your **Instagram Likes** page
2. Open the extension 🧩 and click **Start**
3. View the live status including:

   * **Current Action**
   * **Cycle Count**
   * **Processed Posts**
4. Click **Stop** at any time
5. Use ⚙️ to tweak presets or delays
6. Use ⬆️ Export and ⬇️ Import buttons to save/share config

---

## 🛠️ Known Bugs / Notes

* Some likes may require manual retry depending on scroll and render timing.
* If you see odd behavior, try a lower batch size or enable `Respect Rate Limit`.

---

## 🗜️ Roadmap

* [ ] Chrome Web Store publishing
* [ ] Edge/Opera store listings
* [ ] Dark/Light theme toggle
* [ ] Keyboard shortcuts (start/stop)
* [ ] Visual refresh: minimal flat icons & UI transitions

---

## 🙌 Contributing

1. Fork and branch: `git checkout -b feat/cool-feature`
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
3. Push: `git push origin feat/cool-feature`
4. Open a PR describing your changes

---

## ⚠️ Disclaimer

This extension automates the process of unliking posts on Instagram. Use responsibly—excessive or improper use may trigger Instagram's rate limits or temporary account restrictions. The author is not responsible for any misuse of this tool.

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
