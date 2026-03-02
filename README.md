# 🔎 SERP Results Fetcher & Figma Plugin

[![Figma](https://img.shields.io/badge/Figma-F24E1E?style=for-the-badge&logo=figma&logoColor=white)](https://www.figma.com/)
[![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](#)

A powerful toolset for UX/UI designers and SEO specialists. Extract real search engine results pages (SERP) directly from your browser and populate your Figma mockups with a single click. No more lorem ipsum or dummy data!

![Demo GIF](assets/demo.gif)

## ✨ Features

- **🚀 One-Click Browser Extraction:** Instantly extract titles, URLs, descriptions, and favicons from real Yandex/Google search results.
- **🖼️ Real Favicon Support:** Automatically downloads and converts website favicons into high-quality Base64 images for Figma.
- **🎨 Smart Figma Population:** Fills up your connected Figma "Snippet" components dynamically without detaching components.
- **🧠 Intelligent Overrides:** Detects inner layers and deeply nested elements to gracefully replace placeholder content and images.

---

## 📦 What's Inside?

The project is split into three main parts:
1. `browser-extension/`: A Chrome/Yandex browser extension to scrape organic search results and copy them as JSON.
2. `plugin/`: The Figma plugin that reads the JSON payload and populates the selected layers.
3. `backend/`: (Optional) Python backend server for advanced SERP scraping.

---

## 🛠️ Installation & Setup

### 1. Browser Extension (Chrome / Yandex)
1. Open your browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click on **Load unpacked** and select the `browser-extension` folder from this repository.
4. Pin the extension to your toolbar.

### 2. Figma Plugin
1. Open Figma and open a design file.
2. Go to `Plugins` > `Development` > `Import plugin from manifest...`
3. Select the `manifest.json` file located inside the `plugin/` folder of this repository.

---

## 💡 How to Use

1. **Extract Data:** Go to a search engine (e.g., `ya.ru`), search for your query, and click the `Extract` button in your SERP Results browser extension. The organic search data will be copied to your clipboard as JSON.
2. **Setup Figma Snippets:** Ensure you have your Figma snippet instances selected on your canvas.
3. **Run the Plugin:** Open the SERP Results Plugin in Figma.
4. **Paste & Populate:** Paste the copied JSON into the text area of the plugin and click **Parse & Insert**. Watch your mockups magically fill with real data!

---

## 🤝 Contributing

Feel free to fork this project, submit pull requests, or send suggestions. If you find a bug regarding Yandex's ever-changing CSS selectors, raise an issue!

## 📄 License
MIT License. Created with ❤️ for the design community.
