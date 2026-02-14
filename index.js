/*
 * AIRBOT SYSTEM LAUNCHER BLUEPRINT
 * Fungsi: Auto-restart, memory management, process spawning
 * Creator: WiznAlgo
 * 
 * FITUR BLUEPRINT:
 * - Spawn Node.js child process dengan RAM limit
 * - Auto-restart jika process crash
 * - Message handler untuk reset & uptime
 */

console.log('🕒 Memuat System AirBot...')

import { spawn } from "child_process"
import path from "path"
import { fileURLToPath } from "url"
import { platform } from "os"
import { watchFile, unwatchFile } from "fs"
import chalk from "chalk"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

var isRunning = false

function start(file) {
   if (isRunning) return
   isRunning = true
   
   console.log(chalk.green('✅ SYSTEM STARTING...'))
   console.log(chalk.cyan('🧠 Memory Limit: 3GB (HIGH PERFORMANCE MODE)'))

   // === BLOK 1: SPAWN PROCESS ===
   // [Blueprint] Opsi RAM:
   // - 2GB (Ringan)
   // - 3GB (Medium) <- AKTIF
   // - 4GB (High Performance)
   
   let args = ['--max-old-space-size=3072', path.join(__dirname, file), ...process.argv.slice(2)]

   let p = spawn(process.argv[0], args, { 
       stdio: ["inherit", "inherit", "inherit", "ipc"] 
   })

   // === BLOK 2: MESSAGE HANDLER ===
   // [Blueprint] Listen pesan dari child process:
   // - "reset": kill process & restart
   // - "uptime": send uptime ke process
   
   p.on("message", (data) => {
      switch (data) {
         case "reset":
            platform() === "win32" ? p.kill("SIGINT") : p.kill()
            isRunning = false
            start.apply(this, arguments)
            break
         case "uptime":
            p.send(process.uptime())
            break
      }
   })

   // === BLOK 3: EXIT HANDLER ===
   // [Blueprint] Jika process berhenti:
   // - code === 0: stop (exit sengaja) -> tidak restart
   // - else: restart otomatis setelah 3 detik
   
   p.on("exit", (code) => {
      isRunning = false
      console.error(chalk.red("❌ Bot Berhenti dengan kode:", code))
      
      if (code === 0) return // Stop manual, jangan restart
      
      console.log(chalk.yellow("🔄 Merestart Bot otomatis dalam 3 detik..."))
      setTimeout(() => {
          watchFile(args[0], () => {
             unwatchFile(args[0])
          })
          start(file)
      }, 3000)
   })
}

// [Blueprint] JALANKAN MESIN UTAMA
start("hisoka.js")