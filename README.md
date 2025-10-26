# TwitchTweaks

<p align="center">
  <img src="https://i.redd.it/175o5835m1l91.gif" alt="TwitchTweaks Logo" width="400">
</p>

<p align="center">
  <em>Enhance your Twitch experience with a suite of powerful, customizable tweaks and utilities.</em>
</p>

<p align="center">
  <a href="https://github.com/ikuza47/TwitchTweaks/releases">
    <img src="https://img.shields.io/github/v/release/ikuza47/TwitchTweaks?include_prereleases&sort=semver&display_name=tag&style=for-the-badge&logo=github&color=9146FF" alt="GitHub Release">
  </a>
  <a href="https://github.com/ikuza47/TwitchTweaks/stargazers">
    <img src="https://img.shields.io/github/stars/ikuza47/TwitchTweaks?style=for-the-badge&logo=github&color=gold" alt="GitHub Stars">
  </a>
  <a href="https://github.com/ikuza47/TwitchTweaks/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/ikuza47/TwitchTweaks?style=for-the-badge&color=informational" alt="License">
  </a>
</p>

<p align="center">
</p>

---

## 🌟 Overview

Welcome to **TwitchTweaks**, your ultimate companion for enhancing your **Twitch** experience! This browser extension is a growing collection of powerful features, tweaks, and utilities designed to make your time on Twitch more enjoyable, efficient, and fun. Whether you're a viewer, streamer, or just someone who loves the platform, TwitchTweaks aims to provide the tools you need.

> **Note:** This project is currently under active development. Features are subject to change, and new ones are constantly being added. The core philosophy is to offer modular, user-controlled enhancements without bloating the experience.

---

## 🧰 Current Features

This extension is packed with features, and the list is always growing. Here's a breakdown of the current capabilities:

### 📤 File Uploader

<p align="center">
  <img src="nope" alt="File Uploader Preview" width="300">
</p>

- **Drag & Drop:** Effortlessly upload any file directly from your browser by dragging it onto the Twitch page.
- **Paste Support:** Simply paste an image or file from your clipboard, and it's instantly uploaded.
- **Litterbox Integration:** Files are uploaded to the reliable `litterbox.catbox.moe` service.
- **Link to Chat:** Upon successful upload, the generated link is automatically copied to your clipboard.
- **Preview:** See a preview of your uploaded image, video, or text file before sharing.

### 🖼️ Chat Media Previews

<p align="center">
  <img src="nope" alt="Media Preview" width="300">
</p>

- **Image/Video Embeds:** Links to images (`.png`, `.jpg`, `.gif`, etc.) or videos (`.mp4`, `.webm`, etc.) posted in chat are automatically replaced with embedded previews.
- **Responsive:** Previews scale to fit the chat width with a maximum height of 600px.
- **Click to Open:** Click the preview to open the original image/video in a new tab.

### 📝 Chat Text Previews

<p align="center">
  <img src="nope" alt="Text Preview" width="300">
</p>

- **Text File Embeds:** Links to text files (`.txt`, `.js`, `.json`, `.md`, etc.) are replaced with a preview box showing the content.
- **Fixed Aspect Ratio:** The preview box is a square (1:1 aspect ratio) for a consistent look.
- **Scrollable Content:** If the text is long, the box becomes scrollable.
- **Action Buttons:** Includes "Copy" and "Open" buttons for easy interaction with the content.

### 🎵 Osu! Map Panel

<p align="center">
  <img src="https://osu.ppy.sh/images/layout/beatmapset-page/osu.svg" alt="Osu! Panel Preview" width="200">
</p>

- **Hover for Details:** Hover over any osu! beatmap link (e.g., `https://osu.ppy.sh/beatmapsets/...` or `https://osu.ppy.sh/beatmaps/...`) in the chat or on the page.
- **Instant Information:** A sleek, Twitch-themed panel appears, showing:
  - **Cover Art:** The beatmap's background image.
  - **Title & Artist:** With the mapper's name.
  - **Difficulty:** Name and star rating with a color-coded gradient based on difficulty.
  - **Stats:** AR, OD, CS, HP, BPM, and PP.
  - **Status:** Ranked, Loved, etc.
  - **Time & Count:** Total length, number of circles, sliders, and spinners.
- **Download Button:** A quick link to download the beatmap set.
- **Draggable Panel:** Move the panel around the screen for a better view.
- **Smart Positioning:** The panel intelligently positions itself and stays within screen bounds.




---

## 🚧 Planned Features

The roadmap for TwitchTweaks is extensive. Here are some ideas currently in the planning or early development phase:

- **Advanced Chat Filtering:** Block specific keywords, users, or message patterns.
- **Dark/Light Theme Support:** A global theme switch for all extention.

---

## 📦 Installation

> **Important:** This is a **browser extension**. It needs to be installed manually from the source code or as an unpacked extension during development.

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/ikuza47/TwitchTweaks.git
    cd TwitchTweaks
    ```
2.  **Open Your Browser's Extension Page:**
    - **Chrome/Edge:** Navigate to `chrome://extensions` or `edge://extensions`.
3.  **Enable Developer Mode:** (On Chrome/Edge) Toggle the "Developer mode" switch in the top right.
4.  **Load the Extension:**
    - Click "Load unpacked" (Chrome/Edge).
    - Select the `TwitchTweaks` folder you cloned.
5.  **Enable the Extension:** Ensure the extension is toggled on.

The extension will now be active on Twitch! Refresh any open Twitch tabs to apply the changes.

---

## 🛠️ Development

<p align="center">
  <img src="nope" alt="Development" width="300">
</p>

This extension is built with modularity in mind. Each feature resides in its own file within the `m/` directory.

- **Core Structure:**
  - `manifest.json`: Standard browser extension manifest.
  - `m/upload/upload.js`: Handles file upload logic.
  - `m/panel/osu/map.js`: Manages the osu! map hover panel.
  - `m/chat/showfiles/images.js`: Handles image previews in chat.
  - `m/chat/showfiles/text.js`: Handles text file previews in chat.
- **APIs Used:**
  - `catboy.best`: For osu! beatmap data and metadata.
  - `litterbox.catbox.moe`: For file uploads.
- **Technologies:** Pure JavaScript, HTML, CSS. No build tools required for basic modifications.

---

## 🤝 Contributing

<p align="center">
  <img src="nope" alt="Contributing" width="300">
</p>

Contributions are welcome! Whether it's a bug report, a feature request, or a pull request, your input helps improve TwitchTweaks.

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes.
4.  Submit a Pull Request with a clear description.

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE).

---

## 🙏 Acknowledgements

- Thanks to `catboy.best` and `litterbox.catbox.moe` for providing free and reliable APIs.
- A huge thank you to the Twitch community for the inspiration and feedback!

<p align="center">
  Made with 💜 by <a href="https://github.com/ikuza47">ikuza47</a>
</p>

<p align="center">
  <img src="https://i.redd.it/1234567890abcdef1234567890abcdef.gif" alt="Thanks for Reading!" width="300">
</p>
