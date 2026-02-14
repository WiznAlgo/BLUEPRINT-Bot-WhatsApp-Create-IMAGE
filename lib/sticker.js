/*
 * Sticker Converter Blueprint
 * Konversi image/video ke WebP dengan EXIF metadata
 * Creator: WiznAlgo
 */

import config from "../config.js"
import fs from "fs"
import ff from "fluent-ffmpeg"
import webp from "node-webpmux"
import path from "path"

// [Blueprint] imageToWebp(media): convert image ke WebP
async function imageToWebp(media) {
   const tmpFileOut = path.join(process.cwd(), "temp", `${Math.random().toString(36).substring(7)}.webp`)
   const tmpFileIn = path.join(process.cwd(), "temp", `${Math.random().toString(36).substring(7)}.jpg`)

   // [Blueprint] Write temp file input
   fs.writeFileSync(tmpFileIn, media)

   // [Blueprint] FFmpeg convert dengan scale, palette, fps
   await new Promise((resolve, reject) => {
      ff(tmpFileIn)
         .on("error", reject)
         .on("end", () => resolve(true))
         .addOutputOptions([
            "-vcodec", "libwebp",
            "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
         ])
         .toFormat("webp")
         .save(tmpFileOut)
   })

   // [Blueprint] Read output, hapus temp files
   const buff = fs.readFileSync(tmpFileOut)
   fs.unlinkSync(tmpFileOut)
   fs.unlinkSync(tmpFileIn)
   return buff
}

// [Blueprint] videoToWebp(media): convert video ke WebP (animated)
async function videoToWebp(media) {
   const tmpFileOut = path.join(process.cwd(), "temp", `${Math.random().toString(36).substring(7)}.webp`)
   const tmpFileIn = path.join(process.cwd(), "temp", `${Math.random().toString(36).substring(7)}.mp4`)

   fs.writeFileSync(tmpFileIn, media)

   // [Blueprint] FFmpeg convert video dengan frame limit, loop, palette
   await new Promise((resolve, reject) => {
      ff(tmpFileIn)
         .on("error", reject)
         .on("end", () => resolve(true))
         .addOutputOptions([
            '-vcodec', 'libwebp',
            '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
            '-loop', '0',
            '-ss', '00:00:00.0',
            '-t', '00:00:05.0',
            '-preset', 'default',
            '-an',
            '-vsync', '0'
         ])
         .toFormat("webp")
         .save(tmpFileOut)
   })

   const buff = fs.readFileSync(tmpFileOut)
   fs.unlinkSync(tmpFileOut)
   fs.unlinkSync(tmpFileIn)
   return buff
}

// [Blueprint] writeExif(media, metadata): add EXIF ke WebP
async function writeExif(media, metadata) {
   // [Blueprint] Convert media ke WebP jika belum
   let wMedia = /webp/.test(media.mimetype) ? media.data : /image/.test(media.mimetype) ? await imageToWebp(media.data) : /video/.test(media.mimetype) ? await videoToWebp(media.data) : ""
   
   const tmpFileOut = path.join(process.cwd(), "temp", `${Math.random().toString(36).substring(7)}.webp`)
   const tmpFileIn = path.join(process.cwd(), "temp", `${Math.random().toString(36).substring(7)}.webp`)
   
   fs.writeFileSync(tmpFileIn, wMedia)

   if (metadata || config.Exif) {
      // [Blueprint] Buat JSON metadata & EXIF header
      const img = new webp.Image()
      const json = {
          "sticker-pack-id": metadata?.packId || config.Exif.packId,
          "sticker-pack-name": metadata?.packName || config.Exif.packName,
          "sticker-pack-publisher": metadata?.packPublish || config.Exif.packPublish,
          "emojis": metadata?.categories || config.Exif.emojis || [""]
      }
      const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
      const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8")
      const exif = Buffer.concat([exifAttr, jsonBuff])
      exif.writeUIntLE(jsonBuff.length, 14, 4)
      
      // [Blueprint] Load image, attach EXIF, save
      await img.load(tmpFileIn)
      fs.unlinkSync(tmpFileIn)
      img.exif = exif
      await img.save(tmpFileOut)
      return tmpFileOut
   }
}

export { imageToWebp, videoToWebp, writeExif }