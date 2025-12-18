import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Add a dev-only middleware that exposes /api/names to read/write data/names.json
  configureServer(server: any) {
    const dataDir = path.resolve(__dirname, 'data');
    const dataFile = path.join(dataDir, 'names.json');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify([], null, 2));

    // small helper to read request body
    const readBody = (req: any) => new Promise<string>((resolve, reject) => {
      let data = '';
      req.on('data', (chunk: any) => data += chunk);
      req.on('end', () => resolve(data));
      req.on('error', (err: any) => reject(err));
    });

    server.middlewares.use('/api/names', async (req: any, res: any, next: any) => {
      console.log(`[dev-api] ${req.method} /api/names`);
      try {
        if (req.method === 'GET') {
          const raw = fs.readFileSync(dataFile, 'utf8');
          res.setHeader('Content-Type', 'application/json');
          res.end(raw);
          return;
        }

        if (req.method === 'POST') {
          console.log('[dev-api] writing data/names.json');
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

          fs.writeFileSync(dataFile, JSON.stringify(payload, null, 2));

          // Also append a timestamped snapshot to a history file so changes are versioned
          try {
            const historyFile = path.join(dataDir, 'names-history.jsonl');
            const snapshot = {
              ts: new Date().toISOString(),
              data: payload,
            };
            fs.appendFileSync(historyFile, JSON.stringify(snapshot) + '\n');
          } catch (hfErr) {
            console.error('Failed to write names-history', hfErr);
          }

          // optional auto-commit when VITE_AUTO_COMMIT is set
          // Use environment variable at dev time for safety
          if ((process.env.VITE_AUTO_COMMIT || process.env.AUTO_COMMIT)) {
            const msg = process.env.VITE_COMMIT_MESSAGE || process.env.COMMIT_MESSAGE || 'Update names.json from dev server';
            const author = process.env.VITE_COMMIT_AUTHOR || process.env.COMMIT_AUTHOR;
            // check for git availability first
            exec('git --version', (gitErr) => {
              if (gitErr) {
                console.error('git not available; skipping auto-commit');
                return;
              }
              // Build commit command. Use --no-verify to avoid hooks blocking the dev flow.
              const fileRel = path.relative(process.cwd(), dataFile).replace(/\\/g, '/');
              const authorArg = author ? `--author="${author}" ` : '';
              const cmd = `git add "${fileRel}" && git commit ${authorArg}-m "${msg}" --no-verify`;
              exec(cmd, (err, stdout, stderr) => {
                if (err) console.error('git commit failed', err, stderr);
                else console.log('Committed changes to git:', stdout.trim());
              });
            });
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // other methods not allowed
        res.statusCode = 405;
        res.end();
      } catch (err) {
        console.error('API /api/names error', err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'internal' }));
      }
    });

    // API endpoint for categories
    const categoriesFile = path.join(dataDir, 'categories.json');
    if (!fs.existsSync(categoriesFile)) fs.writeFileSync(categoriesFile, JSON.stringify([], null, 2));

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
          console.log('[dev-api] writing data/categories.json');
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

          // optional auto-commit for categories
          if ((process.env.VITE_AUTO_COMMIT || process.env.AUTO_COMMIT)) {
            const msg = process.env.VITE_COMMIT_MESSAGE || process.env.COMMIT_MESSAGE || 'Update categories.json from dev server';
            const author = process.env.VITE_COMMIT_AUTHOR || process.env.COMMIT_AUTHOR;
            exec('git --version', (gitErr) => {
              if (gitErr) {
                console.error('git not available; skipping auto-commit');
                return;
              }
              const fileRel = path.relative(process.cwd(), categoriesFile).replace(/\\/g, '/');
              const authorArg = author ? `--author="${author}" ` : '';
              const cmd = `git add "${fileRel}" && git commit ${authorArg}-m "${msg}" --no-verify`;
              exec(cmd, (err, stdout, stderr) => {
                if (err) console.error('git commit failed', err, stderr);
                else console.log('Committed changes to git:', stdout.trim());
              });
            });
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // other methods not allowed
        res.statusCode = 405;
        res.end();
      } catch (err) {
        console.error('API /api/categories error', err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'internal' }));
      }
    });
  }
}));
