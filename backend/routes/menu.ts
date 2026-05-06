import { Router } from 'express';
import db from '../db';
import { requireAuth, requireAdmin } from '../middleware';

const router = Router();

router.get('/', requireAuth, (req, res): any => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  const items = db.prepare('SELECT * FROM menu_items ORDER BY name').all();
  
  // Group items by category optionally, or just return both
  res.json({ categories, items });
});

router.post('/items', requireAdmin, (req, res): any => {
  const { category_id, name, description, price, image_url } = req.body;
  const id = 'm' + Date.now();
  
  const stmt = db.prepare('INSERT INTO menu_items (id, category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(id, category_id, name, description, price, image_url);
  
  res.json({ id });
});

export default router;
