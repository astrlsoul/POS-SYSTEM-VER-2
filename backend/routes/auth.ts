import { Router } from 'express';
import db from '../db';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware';

const router = Router();

router.post('/login', (req, res): any => {
  const { pin, password } = req.body;
  if (!pin && !password) return res.status(400).json({ error: 'PIN or password required' });

  let user: any;
  if (pin) {
    user = db.prepare('SELECT id, name, role, password_hash FROM users WHERE pin = ?').get(pin);
  } else {
    return res.status(400).json({ error: 'Only PIN login is mocked for simplicity right now' });
    // In real app, we would search by email/username here
  }

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // For PIN, we just trust the PIN for simplicity of this POS system.
  // Real world: either verify password_hash or just rely on unique PIN.
  // We'll rely on unique PIN for fast cashier switching.

  const token = generateToken({ id: user.id, role: user.role });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

router.get('/me', (req, res): any => {
  res.json({ status: 'unimplemented' });
});

export default router;
