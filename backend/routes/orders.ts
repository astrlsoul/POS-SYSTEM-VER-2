import { Router } from 'express';
import db from '../db';
import { requireAuth } from '../middleware';
import { getIO } from '../socket';
import { AuthRequest } from '../middleware';

const router = Router();

// Get active orders
router.get('/active', requireAuth, (req, res): any => {
  const orders = db.prepare('SELECT * FROM orders WHERE status NOT IN ("completed", "cancelled") ORDER BY created_at DESC').all();
  
  const ordersWithItems = orders.map((o: any) => {
    o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
    return o;
  });
  
  res.json(ordersWithItems);
});

// Create order
router.post('/', requireAuth, (req: AuthRequest, res): any => {
  const { type, table_number, items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'No items' });
  
  const cashierId = req.user?.id;
  
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  const orderId = 'o' + Date.now();
  
  // Transaction
  const _createOrder = db.transaction(() => {
    db.prepare(`INSERT INTO orders (id, type, table_number, subtotal, tax, total, cashier_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(orderId, type, table_number, subtotal, tax, total, cashierId);
    
    const insertItem = db.prepare(`INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    items.forEach((item: any, idx: number) => {
      insertItem.run(`oi${Date.now()}${idx}`, orderId, item.menu_item_id, item.name, item.price, item.quantity, item.notes);
    });
  });

  _createOrder();
  
  const newOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  newOrder.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  
  // Emit socket event
  getIO().emit('new_order', newOrder);

  res.json(newOrder);
});

// Update status
router.patch('/:id/status', requireAuth, (req, res): any => {
  const { status } = req.body;
  const { id } = req.params;
  
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  
  if (status === 'completed') {
     db.prepare('UPDATE orders SET completed_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  }

  getIO().emit('order_updated', { id, status });
  res.json({ success: true });
});

// Pay
router.post('/:id/pay', requireAuth, (req, res): any => {
  const { method, amount } = req.body;
  const { id } = req.params;
  
  db.prepare('INSERT INTO payments (id, order_id, method, amount) VALUES (?, ?, ?, ?)')
    .run('p' + Date.now(), id, method, amount);
    
  db.prepare('UPDATE orders SET status = "completed", completed_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  
  getIO().emit('order_completed', { id });
  res.json({ success: true });
});

export default router;
