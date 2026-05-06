import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import bcrypt from 'bcryptjs';

// Since we run from dist or top level
const dbPath = join(process.cwd(), 'pos-database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  const schemaPath = join(process.cwd(), 'backend', 'db', 'schema.sql');
  const schemaStr = readFileSync(schemaPath, 'utf-8');
  
  // Execute schema
  db.exec(schemaStr);

  // Seed default admin if no users exist
  const countStmt = db.prepare('SELECT count(*) as count FROM users');
  const sizeObj = countStmt.get() as { count: number };
  if (sizeObj.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, pin, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `);
    const adminHash = bcrypt.hashSync('admin123', 10);
    // Pin 1234 for quick cashier login
    insertUser.run('u1', 'Admin User', '1234', adminHash, 'admin');

    const cashierHash = bcrypt.hashSync('cashier123', 10);
    insertUser.run('u2', 'Front Desk', '5678', cashierHash, 'cashier');

    // Seed some categories
    const insertCat = db.prepare('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)');
    insertCat.run('c1', 'Appetizers', 1);
    insertCat.run('c2', 'Mains', 2);
    insertCat.run('c3', 'Desserts', 3);
    insertCat.run('c4', 'Drinks', 4);

    // Seed some menu items
    const insertItem = db.prepare('INSERT INTO menu_items (id, category_id, name, description, price) VALUES (?, ?, ?, ?, ?)');
    insertItem.run('m1', 'c1', 'Truffle Fries', 'Shoestring fries with truffle oil and parmesan', 12.00);
    insertItem.run('m2', 'c1', 'Wagyu Beef Tartare', 'Raw wagyu with quail egg and crostini', 28.00);
    
    insertItem.run('m3', 'c2', 'Pan Seared Scallops', 'Jumbo scallops with cauliflower puree', 38.00);
    insertItem.run('m4', 'c2', 'Dry-Aged Ribeye', '16oz cut with garlic herb butter', 65.00);
    insertItem.run('m5', 'c2', 'Lobster Thermidor', 'Classic lobster stuffed with creamy gruyere', 55.00);
    
    insertItem.run('m6', 'c3', 'Chocolate Lava Cake', 'Valrhona chocolate with vanilla gelato', 16.00);
    insertItem.run('m7', 'c4', 'Signature Old Fashioned', 'Bourbon, smoked maple, bitters', 18.00);
    
    // Seed inventory
    const insertInv = db.prepare('INSERT INTO inventory (id, menu_item_id, stock_level, threshold) VALUES (?, ?, ?, ?)');
    ['m1','m2','m3','m4','m5','m6','m7'].forEach((mId, idx) => insertInv.run(`i${idx+1}`, mId, 100, 10));
    
    console.log('Database seeded with default data.');
  } else {
    console.log('Database already initialized.');
  }
}

export default db;
