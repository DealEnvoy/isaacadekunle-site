# isaacadekunle.com

Source for the personal portfolio site of Isaac Adekunle (https://isaacadekunle.com).

It is a single static page: a dark-to-dawn scroll story that walks through the ISOLATE, TRACE and RELEASE method and then lists products, a case study and contact links. Each claim on the page carries a tag (Shipped, Specified, Assumption, Limit, Human gate) and the tags are listed in a legend in the footer.

## Layout

```
site/                what is served: index.html, css/, js/, fonts/, img/, video/
src/index.src.html   page template (claims are inserted by the build)
src/claims.json      claim text and tag for each claim on the page
tools/build.mjs      src/ -> site/index.html (Node, no dependencies)
NOTICE               third-party components and their licences
```

## Build and preview

```
node tools/build.mjs          # regenerates site/index.html
cd site && python3 -m http.server 8765
```

Then open http://localhost:8765/. `site/` is plain HTML, CSS and JavaScript with no runtime dependencies and no third-party requests, so it can be served from any static host.

## Fonts

Zodiak and Switzer © Indian Type Foundry (ITF), free from fontshare.com under the ITF Free Font License; not redistributed here — download them from Fontshare into `site/fonts/` to build locally. Expected files: `zodiak-400.woff2`, `zodiak-400i.woff2`, `switzer-400.woff2`, `switzer-500.woff2`, `switzer-600.woff2`. Without them the page falls back to Georgia and Arial. IBM Plex Mono is included under the SIL Open Font License (`site/fonts/LICENSE-IBMPlexMono-OFL.txt`).

## Behaviour

- Motion is on by default. A small toggle in the header turns it off; the page then shows static scenes. Operating-system "reduce motion" selects a gentler version.
- Without JavaScript the page shows the static layout.

## Credits and licences

- Cockpit image: "Airbus A380 Qantas Cockpit" by [Braniff747SP](https://commons.wikimedia.org/wiki/User:Braniff747SP), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), modified. Original: https://commons.wikimedia.org/wiki/File:Airbus_A380_Qantas_Cockpit.JPG. The adapted images in `site/img/` are shared under the same licence (CC BY-SA 4.0).
- Night view through the windows: aerial photograph "City lights from air at night 1" by Foxtod, CC0 1.0, reworked.
- Fonts: see above.
- Full list of third-party components: see `NOTICE`.
- All other text, code and design: © Isaac Adekunle, all rights reserved unless stated otherwise.
