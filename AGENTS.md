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

Video previews: run `sequence.renderInToOut` or `sequence.renderSelection`, poll
`jobs.list`, and inspect `sequence.renderBar`. Use `jobs.cancel` to stop a job.
`wait:true` is unsupported. `sequence.renderAudio` renders audio previews in the
same way. Previews are session-only; the shared video/audio cache is capped at
256 MiB, with additional temporary rendering memory. Delete all render files to
clear audio previews; the In/Out deletion command only removes video parts.

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


Audio output: `filmcraft.info().audioBackend` reports `worklet`, `script-processor`, or `unavailable` after initialization. A main-thread fallback is attempted if the worklet fails or stalls for two seconds; it can have higher latency and may underrun under load. A browser gesture may be required.

Portable projects: `filmcraft.createPackage(false)` returns a virtual `.fcpack` path; copy it via `readFileChunk`. `filmcraft.openPackage(file)` verifies and opens one. The UI offers download in Project Manager and opens packages with File ▸ Open or drag and drop. Numbered image sequences are included with gaps preserved and names isolated. At most 10,000 assets and 10,000 image aliases are supported; each still-image read is limited to 256 MiB. To collect selected sequences and nested dependencies, pass `{excludeUnused:true, sequences:[id], includeProxies:false}` as the second argument. Defaults are `excludeUnused:false` and `includeProxies:true`; without filtering, the whole project is collected. On web.18+, `includePreviews:true` includes valid cached audio/video previews in a version 2 package; older builds reject it. On web.19+, `mode:"consolidate"`, `preset` and `handles` re-encode eligible video; web.20 adds eligible mono/stereo audio-only sources and mono video; inspect `transcodedItems` and `copiedMedia` for whole-file fallbacks. Consolidation excludes proxies and previews and can be cancelled through its parent job. Preview cache is limited to 256 MiB. Packages have SHA-256 integrity checks but are not encrypted or signed.

On web.19+, audio and image exports use cooperative jobs and retry deferred media reads; omit `wait:true` and poll `jobs.list`. Direct `/opfs/` exports are rejected until durable writes can be confirmed; use `/exports/` and save the result.

On web.20+, `savePersistentProject(name)` saves a uniquely named project-only
OPFS snapshot after the write is acknowledged. `listPersistentProjects()` lists
these snapshots and `openPersistentProject(id)` opens one, replacing the current
project. Media and proxies are separate; storage is bound to the browser profile
and origin, may be evicted, and the snapshot does not mark the open project saved.
Direct synchronous `/opfs/` writes are rejected. Maximum snapshot size: 256 MiB.

On web.21+, `startDiskExport(params)` starts a H.264 MP4 export to OPFS; poll
`jobs.list`, inspect `diskExportStatus(path)`, copy the output, then call
`releaseDiskExport(path)`. The output queue is capped at 64 MiB per step, but
encoder and index memory remain; the MP4 is not fast-start and an abrupt tab
closure can leave a spool file. `deletePersistentProject(id)` deletes one
acknowledged project snapshot. Automatic recovery uses checksummed slots and a
Web Lock; close or reload old web.20 tabs and reload a second tab after the owner
closes. Media copies remain asynchronous and may be offline after interruption.

On web.22+, disk-backed exports also support ProRes/MOV, WAV, AIFF, FLAC and AAC/M4A. `listOrphanDiskExports()` lists inactive versioned files; `claimOrphanDiskExport(id)` verifies size and SHA-256, and `deleteOrphanDiskExport(id)` permanently deletes one inactive exact ID. Use the same persistent browser profile and origin and Web Locks. Legacy web.21 files are excluded. `recoveryMediaStatus()` reports source/proxy copy status: on web.24 ready reports the last full SHA-256 verification, while old copies are legacy; quota, later changes and eviction still apply. `allReady` does not attest a project snapshot.

On web.23+, disk-backed exports also support DNxHR, APV and Motion JPEG in MOV and MXF OP1a. An explicit nonempty `settings.path` is rejected: the spool chooses its own path. Recovery media status is also visible in Settings ▸ Auto Save ▸ Crash Recovery. The fixed 4 GiB recovery copy limit is removed; storage quota and eviction remain relevant.

On web.24+, `startDiskProxies({items,preset?,attach?})` starts OPFS-backed proxy jobs; poll jobs and inspect children. Copy needed outputs and save the project. Recovery is a second asynchronous copy with its own status and storage cost. A completed job is not proof that the recovery copy is ready. The Settings ▸ Auto Save ▸ Crash Recovery panel reports status. New media copies are SHA-256 verified after copy and again in the background on reopening; `legacy` copies lack this check. Image sequences in `/files` have snapshot-bound manifests of at most 10,000 frame positions including gaps; web.25 adds new verified package aliases. Checksums are not signatures and do not protect against later modification or eviction.

On web.25, opened package assets and sequence aliases are copied for recovery asynchronously only after successful validation. Old numeric package aliases are not migrated: keep and reopen the original package. `listUncommittedRecoveryMedia()` lists inactive, unopened data without a marker under the recovery lock; `deleteUncommittedRecoveryMedia(name)` permanently deletes one exact listed residue after rechecking. Marked, open, legacy, package and `.crswap` files are excluded.

On web.26, `createPackage(false,{storage:"opfs"})` and the Project Manager storage option write the composite package to OPFS without assembling all bytes in WASM. Copy it and release its spool; restart recovery requires Web Locks and the same persistent origin/profile. Without Web Locks creation/copy work but the spool is not restart-recoverable and has no spool checksum. Browser-internal memory and caches are not bounded. Recovery media copies share one queue; inspect per-media status and allow time for large files.

On web.27, OPFS packages are hashed at source and after writing and mismatches fail before marker, publication or download, including without Web Locks. WAV import prewarms the header and reads samples on demand; this does not bound browser cache or recovery-copy storage. Agent copies check cancellation between chunks and before publication; a publication already started may finish, and earlier image-sequence frames can already be present.

On web.28, uncompressed AIFF PCM 8/16/24/32-bit with supported integer sample rates uses random-access reads; avoiding full prewarm for files up to 256 MiB requires a compatible COMM chunk within the first 64 KiB. Unsupported AIFF-C and compressed formats retain their previous path. Explicit snapshot writes are checked against source SHA-256 before acknowledgement; web.29 snapshots additionally store an integrity record checked on reopening. `openPackage(file, signal)` accepts an AbortSignal checked before final project replacement; cancellation after commit begins may be too late. MCP clients on older builds must explicitly opt in to uncancellable opening.

Web.29 also reads integer PCM AIFF-C `NONE`, `twos` and `sowt` at 8/16/24/32 bits on demand; avoiding full prewarm for files up to 256 MiB requires a compatible COMM header within the first 64 KiB. New snapshots require Web Locks; older snapshots remain readable as legacy. `createPackage(download, options, signal)` accepts an AbortSignal before publication; consolidation cancels and waits for child jobs. Once publication begins cancellation may be too late. Older builds without safe creation cancellation require explicit MCP opt-in.

On web.30, native FLAC with STREAMINFO and known duration uses windowed random-access decoding; other variants use the earlier path and browser/seek caches are input-dependent. `openProject(fileOrUrl, signal)` checks cancellation and document revision before replacement. `listUncommittedPersistentProjects()` and `deleteUncommittedPersistentProject(id)` explicitly inspect/delete inactive unmarked v2 snapshot files under Web Locks; they may contain recoverable data. Marked, legacy, swap and marker-only files are excluded. Sequence export destinations are reserved only within the same agent process; other processes can still collide during multi-file publication.

On web.31, `importFiles(files, signal)` checks cancellation and project identity before each pending item is committed. Earlier batch items or placements can remain. `openPersistentProject(id, signal)` checks cancellation before project replacement; once commit begins it may be too late. Older builds require explicit MCP opt-in for uncancellable behavior. The MCP `filmcraft_save` writes a local copy and does not mark the browser project saved. AAC in M4A uses packet-based reading; standalone MP3 and AAC ADTS retain their existing path.

On web.32, persistent snapshot creation checks cancellation before acknowledgement and attempts to remove provisional files under the per-snapshot lock; storage removal failure or abrupt termination can leave remnants. A cancelled screenshot is checked before local publication. The MCP local project-copy result includes `changedDuringCopy`: inspect and repeat when it is true and the latest edits are required.

On web.33, compatible standalone MP3 with Xing/Info headers uses indexed windowed audio decoding; other MP3 and AAC ADTS use the earlier path. Disk-backed exports can provide SRT/VTT caption sidecars in session memory; the result includes their path and SHA-256. Sidecars are not part of restart-recovered spools, and separate local publication can partially succeed.
