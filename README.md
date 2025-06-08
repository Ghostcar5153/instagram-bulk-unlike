# Instagram Bulk Unlike

> 🔧 A lightweight Chrome/Brave extension to bulk‑unlike Instagram posts from your Likes page.

---

## 🚀 Quick Start

1. **Clone the repo**

   ```bash
   git clone https://github.com/Ghostcar5153/instagram-bulk-unlike.git
   ```
2. **Load as an unpacked extension**

   * Open Chrome or Brave and navigate to `chrome://extensions` or `brave://extensions`
   * Enable **Developer mode** (toggle in the top‑right)
   * Click **Load unpacked** and select the `instagram-bulk-unlike` folder
3. **Open your Instagram Likes**

   * Go to: `https://www.instagram.com/your_activity/interactions/likes/`
   * Click the extension icon 🧩, then ⚙️ to configure settings

---

## 🎯 Features

* **Bulk Unlike**: Unlike hundreds of posts automatically.
* **Configurable Delays**: Adjust delays between clicks to avoid rate‑limiting (The default is what worked for me).
* **Batch Size**: Control how many posts to process per cycle.
* **Presets**: Choose from **Slow**, **Balanced**, or **Fast** modes.
* **Safety Options**: Respect Instagram rate limits or auto retry on errors.
* **Import/Export**: Backup and restore your settings as JSON.

---

## 🖥️ Supported Browsers

* Chrome (v**90**+)
* Brave (Chromium‑based)
* Edge (Chromium‑based)
* Opera

---

## ⚙️ Configuration

After installing, click the ⚙️ icon to open settings:

| Setting            | Description                                 | Default |
| ------------------ | ------------------------------------------- | ------- |
| **Items / cycle**  | Maximum posts to unlike per run             | `50`    |
| **Between clicks** | Delay between individual unlike clicks (ms) | `100`   |
| **After select**   | Delay after selecting a post to unlike (ms) | `500`   |
| **After unlike**   | Delay after each unlike action (ms)         | `1000`  |
| **Resume delay**   | Wait time before next cycle (ms)            | `5000`  |
| **Rate limit**     | Respect Instagram’s rate limit rules        | ✔️      |
| **Auto‑retry**     | Retry on script errors                      | ✔️      |
| **Max retries**    | Number of retry attempts on failure         | `3`     |

---

## 🔄 How It Works

By default, the extension:

1. Selects a batch of posts (based on the configured **Items / cycle**, default and recommended by me: 50).
2. Unlikes each post with the specified delays between actions.
3. Reloads the Likes page after processing the batch.
4. Waits for the configured **Resume delay** (default: `5000 ms`).
5. Repeats automatically until all posts are processed or you stop it.

---

## 📸 Usage

1. Navigate to your **Instagram Likes** page.
2. Click the extension icon in your toolbar.
3. In the popup, press **Start** ▶️.
4. Monitor **Cycles**, **Processed**, and **Current Action** in real time.
5. Press **Stop** ⏸️ to halt at any time.

---

## 🗺️ Roadmap

* [ ] **Chrome Web Store** publishing
* [ ] **Edge/Opera** store listings
* [ ] **Dark/Light** theme toggle in popup
* [ ] **Progress bar** & estimated time remaining
* [ ] **Keyboard shortcuts** for start/stop
* [ ] **Better UI/UX**
---

## Contributing

1. Fork the repo and create a branch: `git checkout -b feature/my‑awesome‑feature`
2. Commit your changes: `git commit -m "feat: add my awesome feature"`
3. Push to your branch: `git push origin feature/my‑awesome‑feature`
4. Open a Pull Request and describe your changes.

Please follow the **Conventional Commits** format and update the README accordingly.

---

## ⚠️ Disclaimer

This extension automates the process of unliking posts on Instagram. Use responsibly—excessive or improper use may trigger Instagram's rate limits or temporary account restrictions. The author is not responsible for any misuse of this tool.

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
