# SchemeSaathi 🏥

**Find every free treatment scheme you qualify for — in your language.**

SchemeSaathi is a web application that helps patients and families in Telangana discover which government health schemes (Aarogyasri, PM-JAY/Ayushman Bharat, EHS, ESI, CGHS) and private insurance cards they're eligible for, in **English, Hindi, and Telugu**. It also helps them find nearby hospitals that accept those schemes.

This project was built to solve a real problem: many patients who qualify for free surgery and treatment under government schemes never find out they're eligible, simply because the information is scattered, technical, and often only available in English.

---

## ✨ Features

- **Eligibility checker** — Answer a few simple questions about income, ration card, employment, and the medical condition; instantly see which schemes you likely qualify for and *why*
- **Multi-language support** — Full UI in English, Hindi (हिन्दी), and Telugu (తెలుగు)
- **Patient details form** — Captures patient name, age, gender, contact, and a plain-language description of the condition
- **Document checklist** — Each matched scheme shows exactly which documents you'll need
- **Hospital finder** — Browse hospitals empanelled for each scheme, filter by city, call or get directions with one tap
- **Print/save results** — Take a physical copy of your matched schemes to the hospital or helpline
- **No backend required** — Runs entirely in the browser; works offline once loaded

---

## 🖥️ Tech Stack

- Plain **HTML5 / CSS3 / JavaScript** (no build tools, no frameworks — runs anywhere)
- Data-driven architecture: all scheme rules, hospital listings, and translations live in editable JSON files
- Google Fonts: Fraunces (headings), Hind (UI text), Noto Sans Telugu (Telugu script)

---

## 📁 Project Structure

```
schemesaathi-app/
├── index.html                 # Main HTML shell — structure of all views
├── src/
│   ├── app.css                 # All styling (design tokens, layout, components)
│   ├── app.js                  # Eligibility engine + UI logic
│   └── data/
│       ├── schemes.json         # Scheme eligibility rules (edit this to add/update schemes)
│       ├── hospitals.json       # Hospital directory with scheme empanelment
│       ├── translations.json    # All UI text in English/Hindi/Telugu
│       └── embedded_data.js     # Auto-generated bundle of the 3 JSON files above (see note below)
└── README.md
```

> ⚠️ **Important:** `embedded_data.js` is a generated file that bundles `schemes.json`, `hospitals.json`, and `translations.json` into a format the browser can load directly (since browsers can't `fetch()` local JSON files without a proper server setup for CORS in some cases). **If you edit any of the three JSON files, you must regenerate `embedded_data.js`** — see [Updating the Data](#-updating-the-data) below.

---

## 🚀 Running the Project Locally

You need a simple local web server — you can't just double-click `index.html`, because the browser blocks local script loading for security reasons (the `file://` protocol restriction).

### Option A — Python (no installation needed on most systems)

```bash
cd schemesaathi-app
python -m http.server 8000
```
Then open **http://localhost:8000** in your browser.

### Option B — Node.js

```bash
cd schemesaathi-app
npx serve
```
This prints a clickable local URL (e.g. `http://localhost:3000`).

### Option C — VS Code Live Server extension

1. Install the **"Live Server"** extension by Ritwick Dey
2. Right-click `index.html` in the VS Code file explorer
3. Choose **"Open with Live Server"**

---

## 🔧 Updating the Data

All scheme rules, hospital listings, and translations are stored as plain JSON so they're easy to edit without touching any code.

1. Edit `src/data/schemes.json`, `src/data/hospitals.json`, or `src/data/translations.json` directly
2. Regenerate `embedded_data.js` by running this small script (save it as `build.py` in the project root):

```python
import json

schemes = json.load(open('src/data/schemes.json', encoding='utf-8'))
hospitals = json.load(open('src/data/hospitals.json', encoding='utf-8'))
translations = json.load(open('src/data/translations.json', encoding='utf-8'))

data_js = "const SCHEMES = " + json.dumps(schemes, ensure_ascii=False) + ";\n"
data_js += "const HOSPITALS = " + json.dumps(hospitals, ensure_ascii=False) + ";\n"
data_js += "const TRANSLATIONS = " + json.dumps(translations, ensure_ascii=False) + ";\n"

with open('src/data/embedded_data.js', 'w', encoding='utf-8') as f:
    f.write(data_js)

print("embedded_data.js regenerated successfully")
```

Run it with:
```bash
python build.py
```

Then refresh your browser to see the changes.

### Adding a new scheme
Add a new object to `schemes.json` following the existing structure (`id`, `name`, `eligibility` rules, `requiredDocuments`, etc.), then regenerate `embedded_data.js`. The eligibility engine in `app.js` automatically picks up new schemes — no code changes needed unless the scheme has a genuinely new *type* of eligibility rule.

### Adding a new hospital
Add a new object to `hospitals.json` with its `empanelledSchemes` array listing the scheme `id`s it accepts, then regenerate.

---

## ⚠️ Important Disclaimer

This tool provides an **estimate** based on publicly available scheme information and the details a user enters. It is:
- **Not** an official government website
- **Not** a guarantee of approval — final eligibility is always decided by the scheme authority or hospital
- Meant to point people in the right direction and reduce confusion, not replace official verification

Always direct users to verify with the scheme's official helpline or portal (linked within each scheme's card) before making medical or financial decisions.

---

## 🗺️ Roadmap Ideas

- [ ] Backend + database to actually store patient submissions (requires data privacy compliance — see India's DPDP Act)
- [ ] WhatsApp/SMS bot version for users who won't visit a website
- [ ] Voice input and text-to-speech for low-literacy users
- [ ] Real-time hospital empanelment data via official APIs (currently static JSON)
- [ ] Application status tracker
- [ ] Expand beyond Telangana to other states

---

## 📄 License

This project is open for personal, educational, and non-commercial use. If you plan to deploy this for real patients at scale, please verify all scheme data against current official sources first, as government scheme rules and income thresholds change over time.

---

## 🙏 Acknowledgements

Built to help patients navigate India's public health scheme landscape without language or paperwork becoming a barrier to free treatment.
