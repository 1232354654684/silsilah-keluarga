import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory failed attempts tracking for brute-force lockout
  // Map of identifier (username or IP or email) -> { attempts: number, lockedUntil: number }
  const loginAttempts = new Map<string, { attempts: number; lockedUntil: number }>();

  // API Route: Login Attempt Checker & Record
  app.post('/api/auth/record-attempt', (req: Request, res: Response) => {
    const { identifier, success } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier wajib diisi' });
    }

    const key = String(identifier).trim().toLowerCase();
    const now = Date.now();
    const current = loginAttempts.get(key) || { attempts: 0, lockedUntil: 0 };

    if (current.lockedUntil > now) {
      const waitMinutes = Math.ceil((current.lockedUntil - now) / 60000);
      return res.status(429).json({
        locked: true,
        waitMinutes,
        error: `Akun dikunci sementara karena 5 kali percobaan gagal. Coba lagi dalam ${waitMinutes} menit.`,
      });
    }

    if (success) {
      loginAttempts.delete(key);
      return res.json({ locked: false, attempts: 0 });
    } else {
      current.attempts += 1;
      if (current.attempts >= 5) {
        current.lockedUntil = now + 15 * 60 * 1000; // Lock for 15 minutes
        loginAttempts.set(key, current);
        return res.status(429).json({
          locked: true,
          waitMinutes: 15,
          error: 'Terlalu banyak percobaan gagal. Akun dikunci sementara selama 15 menit untuk keamanan.',
        });
      }
      loginAttempts.set(key, current);
      return res.json({
        locked: false,
        remainingAttempts: 5 - current.attempts,
        error: `Password atau username salah. Sisa percobaan: ${5 - current.attempts}.`,
      });
    }
  });

  // API Route: Check if user is locked
  app.post('/api/auth/check-lock', (req: Request, res: Response) => {
    const { identifier } = req.body;
    if (!identifier) return res.json({ locked: false });

    const key = String(identifier).trim().toLowerCase();
    const now = Date.now();
    const current = loginAttempts.get(key);

    if (current && current.lockedUntil > now) {
      const waitMinutes = Math.ceil((current.lockedUntil - now) / 60000);
      return res.json({
        locked: true,
        waitMinutes,
        error: `Akun dikunci sementara. Coba lagi dalam ${waitMinutes} menit.`,
      });
    }

    return res.json({ locked: false });
  });

  // API Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Setup Vite middlewares in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Silsilah Keluarga berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal menjalankan server:', err);
  process.exit(1);
});
