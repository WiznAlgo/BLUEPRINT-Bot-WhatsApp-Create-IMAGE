/*
 * Utility Functions Blueprint
 * Helper: axios, buffer, formatting, validation, etc
 * Creator: WiznAlgo
 */

import axios from "axios"
import fs from "fs"
import fileType from "file-type"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"
import { platform } from "os"
import moment from "moment-timezone"
import { format } from "util"

export default new (class Function {
   constructor() {
      this.axios = axios
      this.fs = fs
      this.path = path
   }

   // [Blueprint] __filename(pathURL, rmPrefix): get filename dari import.meta
   __filename(pathURL = import.meta, rmPrefix = platform() !== "win32") {
      const path = pathURL?.url || pathURL;
      return rmPrefix
         ? /file:\/\/\//.test(path) ? fileURLToPath(path) : path
         : /file:\/\/\//.test(path) ? path : pathToFileURL(path).href;
   }

   // [Blueprint] __dirname(pathURL): get dirname
   __dirname(pathURL) {
      const dir = this.__filename(pathURL, true);
      return this.path.dirname(dir);
   }

   // [Blueprint] sleep(ms): async delay
   sleep(ms) {
      return new Promise((a) => setTimeout(a, ms));
   }

   // [Blueprint] format(str): util format
   format(str) {
      return format(str)
   }

   // [Blueprint] jam(numer, options): format time dengan timezone
   jam(numer, options = {}) {
      let fmt = options.format ? options.format : "HH:mm";
      let jam = options?.timeZone
         ? moment(numer).tz(options.timeZone).format(fmt)
         : moment(numer).format(fmt);
      return `${jam}`;
   }

   // [Blueprint] tanggal(numer, timeZone): format tanggal lokal
   tanggal(numer, timeZone = "") {
      const myMonths = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
      const myDays = ["Minggu","Senin","Selasa","Rabu","Kamis","Jum'at","Sabtu"];
      var tgl = new Date(numer);
      var day = tgl.getDate();
      var bulan = tgl.getMonth();
      var thisDay = tgl.getDay(), thisDay = myDays[thisDay];
      var yy = tgl.getYear();
      var year = yy < 1000 ? yy + 1900 : yy;
      return `${thisDay}, ${day} ${myMonths[bulan]} ${year}`;
   }

   // [Blueprint] fetchBuffer(string, options): fetch dari URL atau buffer
   fetchBuffer(string, options = {}) {
      return new Promise(async (resolve, reject) => {
         try {
            if (/^https?:\/\//i.test(string)) {
               let data = await axios.get(string, {
                  headers: { ...(!!options.headers ? options.headers : {}) },
                  responseType: "arraybuffer",
                  ...options,
               })
               let buffer = await data?.data
               let type = await fileType.fromBuffer(buffer)
               let mime = type ? type.mime : "application/octet-stream"
               let ext = type ? type.ext : "bin"
               
               resolve({
                  data: buffer,
                  size: Buffer.byteLength(buffer),
                  sizeH: this.formatSize(Buffer.byteLength(buffer)),
                  name: "file." + ext,
                  mime,
                  ext
               });
            } else if (Buffer.isBuffer(string)) {
               let size = Buffer?.byteLength(string) || 0
               let type = await fileType.fromBuffer(string)
               resolve({ 
                  data: string, 
                  size, 
                  sizeH: this.formatSize(size), 
                  mime: type ? type.mime : "application/octet-stream", 
                  ext: type ? type.ext : "bin" 
               });
            } else {
               reject(new Error("Sumber file tidak valid"))
            }
         } catch (e) {
            reject(new Error(e?.message || e))
         }
      });
   }

   // [Blueprint] isUrl(url): validasi format URL
   isUrl(url) {
      let regex = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/, "gi")
      return url.match(regex)
   }

   // [Blueprint] getRandom(ext, length): generate string random
   getRandom(ext = "", length = "10") {
      var result = "";
      var character = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
      var characterLength = character.length;
      for (var i = 0; i < length; i++) {
         result += character.charAt(Math.floor(Math.random() * characterLength));
      }
      return `${result}${ext ? `.${ext}` : ""}`;
   }

   // [Blueprint] formatSize(bytes): konversi byte ke KB/MB/GB
   formatSize(bytes, si = true, dp = 2) {
      const thresh = si ? 1000 : 1024;
      if (Math.abs(bytes) < thresh) return `${bytes} B`;
      const units = si
         ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
         : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
      let u = -1;
      const r = 10 ** dp;
      do {
         bytes /= thresh;
         ++u;
      } while (
         Math.round(Math.abs(bytes) * r) / r >= thresh &&
         u < units.length - 1
      );
      return `${bytes.toFixed(dp)} ${units[u]}`;
   }

   // [Blueprint] runtime(seconds): format detik ke readable format
   runtime(seconds) {
      seconds = Number(seconds);
      var d = Math.floor(seconds / (3600 * 24));
      var h = Math.floor((seconds % (3600 * 24)) / 3600);
      var m = Math.floor((seconds % 3600) / 60);
      var s = Math.floor(seconds % 60);
      return (d > 0 ? d + "d " : "") + (h > 0 ? h + "h " : "") + (m > 0 ? m + "m " : "") + (s > 0 ? s + "s" : "");
   }
})()