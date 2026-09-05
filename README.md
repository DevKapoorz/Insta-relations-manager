# 👥 Insta Relations Manager

> **A 100% private, client-side web application to track who doesn't follow you back on Instagram, fans you don't follow back, and your pending follow requests.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Local-success.svg)](#privacy--security)
[![No Login Required](https://img.shields.io/badge/Auth-No%20Login%20Needed-orange.svg)](#why-insta-relations-manager)

---

## 🚀 Live Demo

👉 **[Launch Insta Relations Manager](https://devkapoorz.github.io/Insta-relations-manager/)**

---

## 🔒 Why Insta Relations Manager?

Most "Instagram unfollower" apps require entering your Instagram username and password. This exposes your account to security risks, credentials harvesting, or automated action bans by Meta.

**Insta Relations Manager works differently:**
- 🛡️ **Zero Login Required:** Never asks for your password or Instagram account credentials.
- 💻 **100% Client-Side & Local:** All file unzipping and relations calculations occur purely within your browser using JavaScript and Web APIs.
- 🚫 **No Server Uploads:** Your exported data never leaves your device or touches an external server.
- ⚡ **Blazing Fast:** Processes multi-thousand account archives in seconds.

---

## ✨ Features

- **Who Doesn't Follow You Back:** Instantly identify users you follow who do not follow you in return (themed with smooth rose/pink accents).
- **Who You Don't Follow Back:** Discover followers and fans that you haven't followed back (indigo/purple theme).
- **Pending Follow Requests:** View all sent follow requests currently pending acceptance (amber/orange theme).
- **Interactive Stat Tiles:** Summary metric tiles at the top that allow one-tap scrolling directly to any category.
- **Real-Time Live Search:** Fast in-memory filtering by Instagram username with an empty search state and clear filter button.
- **Custom Sort Engine:** Sort results alphabetically (`A-Z`, `Z-A`) or chronologically (`Newest to Oldest`, `Oldest to Newest`) via an elevated options menu.
- **Clean Minimalist Profile Cards:** 4-column responsive grid on desktop, 2 columns on tablet, and single-column on mobile. Native link cards show the profile URL in your browser's bottom-left status bar on hover and open directly in a new tab upon click.
- **Mobile-First Responsive Design:** Modern 2-row sticky navigation header, compact metric bar, touch micro-press feedback, and iOS home-indicator safe-area integration.
- **Back to Top Button:** Smooth floating button for convenient navigation when browsing large account lists.

---

## 📥 How to Get Your Instagram Data

1. Open Instagram on your mobile app or web browser.
2. Go to **Settings & Privacy** &rarr; **Accounts Center**.
3. Select **Your information and permissions** &rarr; **Download your information**.
4. Choose **Download or transfer information**, select your profile, and pick **Some of your information**.
5. Select **Followers and following** under Connections.
6. Under Format, select **JSON** (⚠️ *Important: Do not select HTML*).
7. Submit request. Once Instagram sends the download link, download the `.zip` archive.

---

## 🛠️ How to Use

1. Open **[Insta Relations Manager](https://devkapoorz.github.io/Insta-relations-manager/)** in any modern web browser.
2. Drag and drop your downloaded Instagram `.zip` file into the upload zone, or click **Browse ZIP File**.
3. Watch the real-time progress checklist as your archive is extracted and analyzed.
4. Browse your non-followers, fans, and pending requests with instant search and sorting!
5. To check another archive, simply click **Change ZIP** in the top navigation bar.

---

## 💻 Local Development Setup

No build tools, compilation, or external package managers required.

### 1. Clone the repository
```bash
git clone https://github.com/DevKapoorz/Insta-relations-manager.git
cd Insta-relations-manager
```

### 2. Serve the directory
You can open `index.html` directly in your browser or run any local HTTP server:

```bash
# Using Python 3
python -m http.server 8000

# Or using Node.js
npx serve .
```

Open `http://localhost:8000` in your web browser.

---

## 🗂️ Project Structure

```text
├── index.html            # Main markup with SEO metadata, structured data & UI views
├── style.css             # Design system, CSS grid/flexbox, animations & mobile rules
├── core.js               # Instagram relations calculation algorithms & ZIP parser
├── script.js             # UI view orchestrator, search/sort filters & event handling
├── robots.txt            # Search engine crawler permissions
├── sitemap.xml           # XML sitemap for SEO indexing
└── LICENSE               # Apache 2.0 open-source license
```

---

## 🛡️ Privacy & Security Guarantee

Insta Relations Manager operates entirely under a **Local-First Privacy & Defensive Security Architecture**:
- **100% Local Processing:** All operations (`JSZip` decompression, JSON parsing, set differences) run purely in your browser's local memory.
- **Zero Data Transmission:** No network requests containing your followers, followings, or username data are ever made.
- **XSS & Injection Protection:** All user strings and timestamps are rendered strictly via safe DOM text nodes (`textContent`). URLs are strictly validated to belong to `https://www.instagram.com/`, blocking all `javascript:`, `data:`, and malicious redirect vectors. Enforced with a strict Content Security Policy (CSP).
- **Active Decompression-Time Memory Protection:** Unlike naive extractors that buffer entire payloads, our engine uses real-time stream chunk monitors (`internalStream`) with streaming `TextDecoder`. If an archive entry attempts to inflate beyond 2 MB or cumulative data crosses 5 MB, decompression is immediately terminated mid-flight before browser memory is consumed. Includes an 8-second timeout against algorithmic complexity exhaustion.
- **ZIP Bomb & Huge-File Defenses:** Protected with multi-stage safety checks: 5 MB archive size limits, 500 file entry caps, path traversal guards, single-file decompression quotas (2 MB), and prototype pollution protection during JSON parsing.
- **Anonymous Analytics:** Optional aggregate usage metrics only measure generic non-PII actions (e.g. archive processed count) with IP anonymization enabled.

---

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.