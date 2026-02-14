/*
 * Message Serializer & Client Extension Blueprint
 * Fungsi: Normalize pesan, extend Baileys, anti-BAD-MAC
 * Creator: WiznAlgo
 */

import config from "../config.js"
import baileys from "@whiskeysockets/baileys"
const { jidNormalizedUser, extractMessageContent, downloadContentFromMessage } = baileys
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function Client({ hisoka, store }) {
   // [Blueprint] Hapus groupMetadata biar hemat memory
   if(store.groupMetadata) delete store.groupMetadata
   for (let v in store) hisoka[v] = store[v]

   // [Blueprint] Extend hisoka dengan custom methods:
   const client = Object.defineProperties(hisoka, {
      
      // [Blueprint] getContentType(): deteksi tipe pesan
      getContentType: {
         value(content) {
            if (content) {
               const keys = Object.keys(content);
               const key = keys.find(k => (k === 'conversation' || k.endsWith('Message') || k.endsWith('V2') || k.endsWith('V3')) && k !== 'senderKeyDistributionMessage');
               return key
            }
         }
      },

      // [Blueprint] decodeJid(): normalize JID format
      decodeJid: {
         value(jid) {
            if (/:\d+@/gi.test(jid)) {
               const decode = jidNormalizedUser(jid);
               return decode
            } else return jid;
         }
      },

      // [Blueprint] downloadMediaMessage(): download media dari pesan
      downloadMediaMessage: {
         async value(message) {
            let mime = (message.msg || message).mimetype || ''
            let messageType = message.type.replace(/Message/gi, '')
            let stream = await downloadContentFromMessage(message.msg || message, messageType)
            let buffer = Buffer.from([])
            for await(const chunk of stream) {
               buffer = Buffer.concat([buffer, chunk])
            }
            return buffer
         }
      }
   })
   return hisoka
}

export async function Serialize(hisoka, msg) {
   // [Blueprint] Normalize message menjadi object m yang mudah diakses
   
   const m = {}
   if (!msg.message) return 

   m.message = extractMessageContent(msg.message)
   
   if (msg.key) {
      m.key = msg.key
      m.from = hisoka.decodeJid(m.key.remoteJid)
      m.fromMe = m.key.fromMe
      m.sender = hisoka.decodeJid(m.fromMe ? hisoka.user.id : m.key.participant || m.from)
      m.isGroup = m.from.endsWith("@g.us")
   }

   m.pushName = msg.pushName || "User"
   
   if (m.message) {
      m.type = hisoka.getContentType(m.message) || Object.keys(m.message)[0]
      m.msg = extractMessageContent(m.message[m.type]) || m.message[m.type]
      m.body = m.msg?.text || m.msg?.conversation || m.msg?.caption || m.message?.conversation || ""
      
      // [Blueprint] Command parser
      m.prefix = config.options.prefix.test(m.body) ? m.body.match(config.options.prefix)[0] : "#"
      m.command = m.body && m.body.replace(m.prefix, '').trim().split(/ +/).shift()
      m.args = m.body.trim().split(/ +/).slice(1) || []
      m.text = m.args.join(" ")
      
      // [Blueprint] Deteksi media
      m.isMedia = !!m.msg?.mimetype || !!m.msg?.thumbnailDirectPath

      // [Blueprint] Helper function reply
      m.reply = async (text, options = {}) => {
         return hisoka.sendMessage(m.from, { text, ...options }, { quoted: m })
      }

      // [Blueprint] Helper download media
      m.download = () => hisoka.downloadMediaMessage(m)
   }

   // [Blueprint] Handle quoted message (untuk fitur reply)
   m.quoted = null
   if (m.msg?.contextInfo?.quotedMessage) {
      const quoted = m.msg.contextInfo.quotedMessage
      m.quoted = {}
      m.quoted.message = extractMessageContent(quoted)
      m.quoted.type = hisoka.getContentType(m.quoted.message)
      m.quoted.msg = extractMessageContent(m.quoted.message[m.quoted.type])
      m.quoted.sender = hisoka.decodeJid(m.msg.contextInfo.participant)
      m.quoted.isMedia = !!m.quoted.msg?.mimetype
      m.quoted.download = () => hisoka.downloadMediaMessage(m.quoted)
   }

   return m
}