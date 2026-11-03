# Driving FilmCraft Web with an agent

The page installs a stable, promise-based control API at `window.filmcraft`. It is
the same command engine that the UI uses, so anything a person can do, an agent
can do.

- **URL:** <https://elzuzu.github.io/filmcraft-web-app/>
- **Machine-readable descriptor:** [`agent/manifest.json`](agent/manifest.json)
- **Command count:** 716 in build 0.17.0
- **Time:** one second = `254016000000` ticks

## Quick start

Open the page in a Chromium-based browser (or let an MCP/Playwright client open
it), then run this in the page context:

```js
await window.filmcraftLoad.readyMs; // wait until the editor is up
await filmcraft.execute('playhead.start');
await filmcraft.request('ui.playback', { action: 'play' });
const state = await filmcraft.inspect();
console.log(state.playback, state.playhead, state.fps);
await filmcraft.request('ui.playback', { action: 'stop' });
```

## API

| Call | Result |
|---|---|
| `filmcraft.execute(command, params)` | run an engine command |
| `filmcraft.request(method, params)` | any control method |
| `filmcraft.commands()` | full registry with `id`, `label`, `enabled`, `params`, `menu`, `shortcut` |
| `filmcraft.inspect()` | `ui.inspect`: mode, workspace, dock, selection, playhead, playback, fps |
| `filmcraft.info()` | renderer, WebCodecs codecs, OPFS, threads, startup time |
| `filmcraft.screenshot({ panel? })` | `{ pngBase64, width, height }` of the canvas or one panel |
| `filmcraft.files()` | virtual files (imports and exports) with `path`, `size`, `kind` |
| `filmcraft.releaseExport(path)` | remove an exact in-memory `/exports/` entry after saving it; attached proxies may become unavailable |
| `filmcraft.readFile(path)` | `Uint8Array` of a virtual file |
| `filmcraft.readFileChunk(path, offset, length)` | bounded `Uint8Array` (offset safe integer, length 1–8 MiB) |
| `filmcraft.registerFile(file)` | register a local `File` for relinking without importing another item |
| `filmcraft.importFiles(FileList \| File[])` | `{ items, errors, paths }` |
| `filmcraft.importUrl(url, name?)` | fetch a URL and import it |
| `filmcraft.openProject(urlOrFile)` | open a `.fcproj` |

Control methods most useful to agents:

| Method | Parameters |
|---|---|
| `ui.inspect` | — |
| `ui.elements` | `{ prefix? }` — every widget id with its rectangle |
| `ui.click` / `ui.move` | `{ id }` or `{ x, y }`, `button`, `count`, `modifiers` |
| `ui.drag` | `{ from, to, steps, modifiers }` |
| `ui.scroll` | `{ id \| x, y, dx, dy }` |
| `ui.key` / `ui.type` | `{ key }` / `{ text }` |
| `ui.playback` | `{ action: "play" \| "stop" \| "toggle", speed? }` |
| `ui.set` | `{ tool, workspace, mode, timeline, program, source, export, ... }` |
| `ui.panel.show` / `ui.panel.close` | `{ panel }` |
| `ui.screenshot` | `{ panel? }` |
| `perf.stats` | — |

## Commands

**Never guess a command id.** Fetch the registry and read the `params` schema:

```js
const commands = await filmcraft.commands();
const place = commands.find((c) => c.id === 'timeline.place');
console.log(place.params);
```

Tested examples:

```js
// create a project and procedural footage
await filmcraft.execute('file.newProject', { name: 'Agent demo' });
await filmcraft.execute('file.importDemoFootage', { scene: 'OceanSunset' });

// inspect the project tree; the new item is the last child
const project = await filmcraft.execute('project.inspect', {});
const item = project.root.children.at(-1).item;

// make a sequence from that item and place it twice
await filmcraft.execute('file.newSequence', { name: 'Agent cut', fromItem: item });
await filmcraft.execute('timeline.place', { item, track: 'V1', seconds: 0 });
await filmcraft.execute('timeline.place', { item, track: 'V1', seconds: 4 });

// trim 24 frames off the out point, ripple
await filmcraft.execute('timeline.trim', {
  clip: 13, edge: 'out', mode: 'ripple', deltaFrames: -24,
});

// export the active sequence
const job = await filmcraft.execute('file.exportMedia', {
  format: 'h264', path: '/exports/cut.mp4', width: 640, height: 360,
  bitrateKbps: 800, range: 'custom', startSeconds: 0, endSeconds: 2,
});
while (true) {
  const jobs = await filmcraft.execute('jobs.list', {});
  if (jobs.find((j) => j.id === job.job)?.finished) break;
  await new Promise((r) => setTimeout(r, 400));
}
const bytes = await filmcraft.readFile('/exports/cut.mp4');
```

Useful namespaces: `file.*`, `timeline.*`, `playhead.*`, `edit.*`, `effects.*`,
`lumetri.*`, `graphics.*`, `captions.*`, `mixer.*`, `audio.*`, `project.*`,
`markers.*`, `jobs.*`, `export.presets.*`.

## Time and identity

- Prefer `seconds` fields; `frame`, `timecode` and raw `ticks` are also accepted.
- Project items and clips are numeric ids.
- `timeline.place` returns `{ clips: [videoClipId, audioClipId] }`.
- `filmcraft.inspect().activeSequence` is the sequence shown in the timeline.
- `ui.elements` is the authoritative list of widget ids and their CSS-pixel
  rectangles in the viewport (default 1600×1000).

## Browser and media

- The build is stateless on the server and local-first. Imported files are read
  by the browser; nothing is uploaded.
- A picked file is readable while the tab is open; FilmCraft also keeps a copy in
  OPFS for crash recovery.
- Audio starts after a user gesture in a normal browser.
- WebGPU is used when available; otherwise WebGL2. Append `?webgl` to force WebGL2.

## MCP and CLI

A complete MCP stdio server, one-shot CLI and portable agent skill live in the
private `filmcraft-agent` repository, together with the build and deployment
scripts. Ask the maintainer for access. The public page above is sufficient for
any client that can evaluate JavaScript in a browser, including Playwright,
Puppeteer, Selenium or a browser extension.

