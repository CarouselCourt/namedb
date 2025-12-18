import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

function apiMiddlewarePlugin(): Plugin {
  const dataDir = path.resolve(__dirname, 'data');
  
  const readBody = (req: any) => new Promise<string>((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: any) => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', (err: any) => reject(err));
  });

  return {
    name: 'api-middleware',
    configureServer(server) {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

      const namesFile = path.join(dataDir, 'names.json');
      const categoriesFile = path.join(dataDir, 'categories.json');
      const blockedPairsFile = path.join(dataDir, 'blocked-pairs.json');

      if (!fs.existsSync(namesFile)) fs.writeFileSync(namesFile, JSON.stringify([], null, 2));
      if (!fs.existsSync(categoriesFile)) fs.writeFileSync(categoriesFile, JSON.stringify([], null, 2));
      if (!fs.existsSync(blockedPairsFile)) fs.writeFileSync(blockedPairsFile, JSON.stringify([], null, 2));

      server.middlewares.use('/api/names', async (req: any, res: any, next: any) => {
        console.log(`[dev-api] ${req.method} /api/names`);
        try {
          if (req.method === 'GET') {
            const raw = fs.readFileSync(namesFile, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.end(raw);
            return;
          }
          if (req.method === 'POST') {
            const bodyText = await readBody(req);
            let payload: any;
            try {
              payload = JSON.parse(bodyText || 'null');
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'invalid JSON' }));
              return;
            }
            if (!Array.isArray(payload)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'expected an array of names' }));
              return;
            }
            fs.writeFileSync(namesFile, JSON.stringify(payload, null, 2));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            return;
          }
          res.statusCode = 405;
          res.end();
        } catch (err) {
          console.error('API /api/names error', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'internal' }));
        }
      });

      server.middlewares.use('/api/categories', async (req: any, res: any, next: any) => {
        console.log(`[dev-api] ${req.method} /api/categories`);
        try {
          if (req.method === 'GET') {
            const raw = fs.readFileSync(categoriesFile, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.end(raw);
            return;
          }
          if (req.method === 'POST') {
            const bodyText = await readBody(req);
            let payload: any;
            try {
              payload = JSON.parse(bodyText || 'null');
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'invalid JSON' }));
              return;
            }
            if (!Array.isArray(payload)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'expected an array of categories' }));
              return;
            }
            fs.writeFileSync(categoriesFile, JSON.stringify(payload, null, 2));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            return;
          }
          res.statusCode = 405;
          res.end();
        } catch (err) {
          console.error('API /api/categories error', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'internal' }));
        }
      });

      server.middlewares.use('/api/blocked-pairs', async (req: any, res: any, next: any) => {
        console.log(`[dev-api] ${req.method} /api/blocked-pairs`);
        try {
          if (req.method === 'GET') {
            const raw = fs.readFileSync(blockedPairsFile, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.end(raw);
            return;
          }
          if (req.method === 'POST') {
            const bodyText = await readBody(req);
            let payload: any;
            try {
              payload = JSON.parse(bodyText || 'null');
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'invalid JSON' }));
              return;
            }
            if (!Array.isArray(payload)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'expected an array of blocked pairs' }));
              return;
            }
            fs.writeFileSync(blockedPairsFile, JSON.stringify(payload, null, 2));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            return;
          }
          res.statusCode = 405;
          res.end();
        } catch (err) {
          console.error('API /api/blocked-pairs error', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'internal' }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
  plugins: [
    react(),
    apiMiddlewarePlugin(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
