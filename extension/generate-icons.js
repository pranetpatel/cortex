#!/usr/bin/env node
// Generates extension icons (16, 48, 128px) as PNG files.
// Pure Node.js — no npm dependencies required.
'use strict'

const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

// ─── CRC32 ────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff]
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const crcVal = Buffer.alloc(4)
  crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])))
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  return Buffer.concat([len, t, data, crcVal])
}

// ─── PNG WRITER ───────────────────────────────────────────────────────────────
// pixels: Array of [R,G,B] arrays, row-major
function makePNG(w, h, pixels) {
  // IHDR: 8-bit RGB
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB

  // Raw scanlines with filter byte 0 (None)
  const raw = Buffer.alloc(h * (1 + w * 3))
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0 // filter = None
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixels[y][x]
      const off = y * (1 + w * 3) + 1 + x * 3
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 })
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ─── ICON RENDERER ───────────────────────────────────────────────────────────
// Draws: dark #18181d background + amber #f59e42 diamond centered
function renderIcon(size) {
  const BG = [0x18, 0x18, 0x1d]
  const FG = [0xf5, 0x9e, 0x42]
  const INNER = [0x12, 0x12, 0x16] // slightly darker for inner cutout

  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  // Outer diamond half-size (fraction of icon size)
  const outer = size * 0.34
  // Inner cutout half-size
  const inner = size * 0.16
  // Small dots at cardinal points (for the ◈ look, only at 48px+)
  const dotR = size * 0.055
  const dotD = outer + dotR * 1.8

  const pixels = []
  for (let y = 0; y < size; y++) {
    const row = []
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - cx)
      const dy = Math.abs(y - cy)
      const diamondDist = dx + dy // Manhattan distance (diamond metric)

      // Anti-alias edge
      const aa = Math.max(0, Math.min(1, outer - diamondDist + 0.7))

      let pixel = BG

      if (diamondDist < outer) {
        // Inside outer diamond
        if (diamondDist < inner) {
          // Inner cutout — mix FG and darker color
          const t = Math.max(0, Math.min(1, inner - diamondDist + 0.5))
          pixel = [
            Math.round(FG[0] * (1 - t) + INNER[0] * t),
            Math.round(FG[1] * (1 - t) + INNER[1] * t),
            Math.round(FG[2] * (1 - t) + INNER[2] * t),
          ]
        } else {
          pixel = FG
        }
      } else if (aa > 0 && aa < 1) {
        // Anti-aliased edge: blend FG into BG
        pixel = [
          Math.round(BG[0] + (FG[0] - BG[0]) * aa),
          Math.round(BG[1] + (FG[1] - BG[1]) * aa),
          Math.round(BG[2] + (FG[2] - BG[2]) * aa),
        ]
      }

      // Cardinal dots (◈ detail) — only for 48px+
      if (size >= 48) {
        const dots = [
          [cx, cy - dotD], [cx, cy + dotD],
          [cx - dotD, cy], [cx + dotD, cy],
        ]
        for (const [ddx, ddy] of dots) {
          const dist = Math.sqrt((x - ddx) ** 2 + (y - ddy) ** 2)
          const dotAA = Math.max(0, Math.min(1, dotR - dist + 0.7))
          if (dotAA > 0) {
            pixel = [
              Math.round(pixel[0] + (FG[0] - pixel[0]) * dotAA),
              Math.round(pixel[1] + (FG[1] - pixel[1]) * dotAA),
              Math.round(pixel[2] + (FG[2] - pixel[2]) * dotAA),
            ]
          }
        }
      }

      row.push(pixel)
    }
    pixels.push(row)
  }
  return pixels
}

// ─── GENERATE ─────────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'icons')
fs.mkdirSync(outDir, { recursive: true })

for (const size of [16, 48, 128]) {
  const pixels = renderIcon(size)
  const png = makePNG(size, size, pixels)
  const outPath = path.join(outDir, `icon${size}.png`)
  fs.writeFileSync(outPath, png)
  console.log(`  ✓ icon${size}.png  (${png.length} bytes)`)
}
console.log('\nIcons generated in extension/icons/')
