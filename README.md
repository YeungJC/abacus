# 同 TONG Manchester

An interactive proof of concept for TONG, a shared hub for the Chinese and Hong Kong
student societies in Manchester, with a traditional Chinese look.

The whole site is a rainy Chinatown street you walk down (three.js via React Three Fiber).
Every section is a place on it:

| Place | Section |
|---|---|
| 牌坊 gate | Welcome and how it works |
| Four society halls and an empty shop | The societies, and how to join |
| 告示板 notice board | What's on |
| 紅包 stall | Joint Pass: open the envelope, press your seal |
| 出口 station exit | Freshers guide in EN / 繁 / 简 |
| 茶樓 tea house | Committee almanac, shared live through the artifact's db on claude.ai |
| Gala stage | Live countdown and fireworks |

Walk with W A S D or the arrow keys, drag to look, scroll to stroll, or click a place, a
name tag or a station on the metro-style line at the bottom. Phones get a walk pad.
"Read as a page" shows the same content as a normal scrolling page, which is also the
fallback when the browser has no WebGL.

Events, venues, prices and some Chinese society names are examples, not confirmed details.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # single-file build: dist/index.html, plus dist/artifact.html for claude.ai
```

`legacy.html` is the first single-file version, kept for reference.
