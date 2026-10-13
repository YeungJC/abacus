# 同 TONG Manchester

An interactive proof of concept for TONG, a shared hub for the Chinese and Hong Kong
student societies in Manchester, with a traditional Chinese look.

- **3D lantern street** (three.js via React Three Fiber): a rainy Chinatown street at night
  under a 牌坊 gate. Each society is a lantern; tap one to open its scroll.
- **What's on** board with society filters, and a countdown to the Lunar New Year Gala.
- **Joint Pass**: open the red envelope, name the pass and press your society's seal.
- **Freshers guide** in English, Traditional and Simplified Chinese.
- **Committee almanac** that marks clashes with 忌. On claude.ai it uses the artifact's
  shared database, so every committee sees the same drafts live. Locally it falls back
  to browser storage.

Events, venues, prices and some Chinese society names are examples, not confirmed details.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # single-file build: dist/index.html, plus dist/artifact.html for claude.ai
```

`legacy.html` is the first single-file version, kept for reference.
