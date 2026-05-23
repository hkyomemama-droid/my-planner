import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.resolve('./planner-data.json')

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'planner-data-api',
      configureServer(server) {
        // GET /api/data — 全データ取得
        // POST /api/data — 全データ保存
        server.middlewares.use('/api/data', (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          if (req.method === 'GET') {
            const data = fs.existsSync(DATA_FILE)
              ? fs.readFileSync(DATA_FILE, 'utf8')
              : '{}'
            res.end(data)
          } else if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              try {
                fs.writeFileSync(DATA_FILE, body)
                res.end('{"ok":true}')
              } catch(e) {
                res.statusCode = 500
                res.end('{"ok":false}')
              }
            })
          } else {
            res.statusCode = 405
            res.end('{}')
          }
        })
      }
    }
  ],
})
