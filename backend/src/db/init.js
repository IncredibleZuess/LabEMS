import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure data directory exists
const dataDir = join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || join(dataDir, 'lab_ems.db');

// Database connection
let db = null;

export const getDb = () => {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');
      }
    });
  }
  return db;
};

export const initDatabase = async () => {
  const database = getDb();
  
  return new Promise((resolve, reject) => {
    // Create tables
    const createTables = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('student', 'lecturer', 'admin')),
        student_number TEXT,
        department TEXT,
        phone TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Equipment categories table
      CREATE TABLE IF NOT EXISTS equipment_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Equipment table
      CREATE TABLE IF NOT EXISTS equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category_id INTEGER NOT NULL,
        serial_number TEXT UNIQUE,
        model TEXT,
        manufacturer TEXT,
        purchase_date DATE,
        purchase_price DECIMAL(10,2),
        condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
        location TEXT,
        is_available BOOLEAN DEFAULT 1,
        total_quantity INTEGER DEFAULT 1,
        available_quantity INTEGER DEFAULT 1,
        image_url TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES equipment_categories (id)
      );

      -- Equipment requests table
      CREATE TABLE IF NOT EXISTS equipment_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        purpose TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'returned', 'overdue')),
        lecturer_id INTEGER,
        lecturer_notes TEXT,
        approved_at DATETIME,
        returned_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (equipment_id) REFERENCES equipment (id),
        FOREIGN KEY (lecturer_id) REFERENCES users (id)
      );

      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
        is_read BOOLEAN DEFAULT 0,
        related_request_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (related_request_id) REFERENCES equipment_requests (id)
      );

      -- Equipment usage history table
      CREATE TABLE IF NOT EXISTS equipment_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        request_id INTEGER NOT NULL,
        checkout_date DATETIME NOT NULL,
        return_date DATETIME,
        condition_before TEXT,
        condition_after TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipment_id) REFERENCES equipment (id),
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (request_id) REFERENCES equipment_requests (id)
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category_id);
      CREATE INDEX IF NOT EXISTS idx_equipment_available ON equipment(is_available);
      CREATE INDEX IF NOT EXISTS idx_requests_user ON equipment_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_requests_equipment ON equipment_requests(equipment_id);
      CREATE INDEX IF NOT EXISTS idx_requests_status ON equipment_requests(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
    `;

    database.exec(createTables, (err) => {
      if (err) {
        console.error('Error creating tables:', err);
        reject(err);
      } else {
        console.log('Database tables created successfully');
        resolve();
      }
    });
  });
};

export const closeDb = () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
    db = null;
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
