/*
 * API Client Blueprint
 * Wrapper untuk Axios dengan API key management
 * Creator: WiznAlgo
 */

import config from "../config.js"
import axios from "axios"
import FormData from "form-data"

export default class API {
   constructor(name, options) {
      // [Blueprint] Setup axios instance dengan config dari APIs
      this.name = name
      this.URI = (name in config.APIs) ? config.APIs[name].baseURL : name

      this.create = axios.create({
         baseURL: this.URI,
         timeout: 60000,
         headers: options?.headers ? options.headers : {},
         ...options
      })
   }

   // [Blueprint] GET request dengan query + apikey support
   async get(path = '/', query = {}, apikey, options = {}) {
      try {
         const res = await this.create.get(path, {
            // [Blueprint] Append API key ke query jika diberikan
            params: (query || apikey) ? new URLSearchParams(Object.entries({ ...query, ...(apikey ? { [apikey]: config.APIs[this.name].Key } : {}) })) : '',
            ...options
         })
   
         return res.data
      } catch {
         return { status: 400 }
      }
   }

   // [Blueprint] POST request dengan FormData + apikey support
   async post(path = '', data = {}, apikey, options = {}) {
      try {
         if (!!data) {
            // [Blueprint] Buat FormData & append semua properties
            const form = new FormData()
   
            for (let key in data) {
               let valueKey = data[key]
               form.append(key, valueKey)
            }
   
            // [Blueprint] POST dengan API key di URL params
            const res = await this.create.post(path + new URLSearchParams(Object.entries({ ...(apikey ? { [apikey]: config.APIs[this.name].Key } : {}) })), form, { ...options })
   
            return res.data
         } else {
            return { status: 400 }
         }
      } catch {
         return { status: 400 }
      }
   }
}