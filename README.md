# isaacadekunle.com

Source for the personal portfolio site of Isaac Adekunle (https://isaacadekunle.com).

It is a single static page: a dark-to-dawn scroll story that walks through the ISOLATE, TRACE and RELEASE method and then lists products, a case study and contact links. Each claim on the page carries a tag (Shipped, Specified, Assumption, Limit, Human gate) and the tags are listed in a legend in the footer.

## Layout

```
site/                what is served: index.html, robots.txt, _headers, css/main.css, js/main.js, fonts/, img/, video/, audio/
src/index.src.html   page template (claims are inserted by the build)
src/claims.json      claim text and tag for each claim on the page
src/css/             tokens.css and main.css, the readable styles
src/js/main.js       readable page script
tools/build.mjs      src/ -> site/index.html, site/css/main.css, site/js/main.js
NOTICE               third-party components and their licences
```

## Build and preview

```
npm install
npm run build
cd site && python3 -m http.server 8765
```

`npm install` fetches esbuild 0.27.7, which is a build tool only. The build writes one minified stylesheet, `site/css/main.css`, and one minified script, `site/js/main.js`. The page links those two files. `site/_headers` is the Cloudflare Pages cache file: the page, CSS and JS revalidate, and the media files are cached for a year. Then open http://localhost:8765/. `site/robots.txt` allows indexing. The page makes no third-party requests, so `site/` can be served from any static host. A direct upload of `site/` is the Pages package.

## Fonts

Zodiak and Switzer © Indian Type Foundry (ITF), free from fontshare.com under the ITF Free Font License. The exact woff2 files served on the site are stored as base64 in `src/fonts/` and written into `site/fonts/` by the build and committed there, so the branch contains the same font bytes as the Pages upload: `zodiak-400.woff2`, `zodiak-400i.woff2`, `switzer-400.woff2`, `switzer-500.woff2`, `switzer-600.woff2`. IBM Plex Mono is included under the SIL Open Font License (`site/fonts/LICENSE-IBMPlexMono-OFL.txt`).

## Behaviour

- The hero buttons "Play tour" and "Start a conversation" run an automatic, slow scroll down the page (the tour also starts once per visit when a visitor scrolls down to ISOLATE). A "Stop tour" button, or any wheel, touch, key press or click, hands scrolling back. The tour never starts when motion is off or the operating system asks for reduced motion; the buttons then just jump to their sections.
- The TRACE stage write-ups follow the scroll position.
- Motion is on by default. A small toggle in the header turns it off; the page then shows static scenes. Operating-system "reduce motion" selects a gentler version.
- The hero is a looping 10 second video (WebM first, MP4 fallback) over a matching still image. Videos are muted and have no audio track.
- A sound button controls an optional quiet ambience loop (`site/audio/`). The button label reflects whether audio is actually playing, and the choice is stored in the browser's localStorage. If the browser blocks autoplay, the first tap, key press or click starts it.
- Without JavaScript the page shows the static layout.

## Credits and licences

- Cockpit image and hero video: the hero video combines a CC BY-SA 4.0 photograph ("Airbus A380 Qantas Cockpit" by [Braniff747SP](https://commons.wikimedia.org/wiki/User:Braniff747SP), modified; original at https://commons.wikimedia.org/wiki/File:Airbus_A380_Qantas_Cockpit.JPG) with rendered screen imagery from the FlyByWire A380X instrument code (GPLv3, https://github.com/flybywiresim/aircraft). Base photograph CC BY-SA 4.0; screen imagery rendered from GPLv3 code. The combined video's licensing is not asserted beyond this. The adapted images in `site/img/` are shared under the same CC BY-SA 4.0 licence as the photograph. The changes made are listed in `site/video/CREDITS.txt`. The page footer carries the same credit, including the FlyByWire GPLv3 note for the hero video.
- FlyByWire A380X: used only to render 2D screen imagery for the hero video. No FlyByWire code, logos, branding or 3D assets are included in this repository.
- Ambience loop: original synthesised audio made for this site.
- Fonts: see above.
- Full list of third-party components: see `NOTICE`.
- All other text, code and design: © Isaac Adekunle, all rights reserved unless stated otherwise.
