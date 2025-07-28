import express from 'express';
import { getDb } from '../db/init.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role = '', search = '' } = req.query;
    const offset = (page - 1) * limit;
    const db = getDb();

    let whereConditions = [];
    let params = [];

    if (role) {
      whereConditions.push('role = ?');
      params.push(role);
    }

    if (search) {
      whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR student_number LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const usersQuery = `
      SELECT 
        id, email, first_name, last_name, role, student_number, 
        department, phone, is_active, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;

    const [users, countResult] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all(usersQuery, [...params, limit, offset], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(countQuery, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      })
    ]);

    const totalPages = Math.ceil(countResult.total / limit);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: countResult.total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          id, email, first_name, last_name, role, student_number, 
          department, phone, is_active, created_at
        FROM users 
        WHERE id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update user status (admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const db = getDb();

    const result = await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [isActive ? 1 : 0, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (result === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    next(error);
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();

    const [
      totalUsers,
      totalStudents,
      totalLecturers,
      activeUsers
    ] = await Promise.all([
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student'", (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM users WHERE role = 'lecturer'", (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1', (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      })
    ]);

    res.json({
      totalUsers,
      totalStudents,
      totalLecturers,
      activeUsers
    });
  } catch (error) {
    next(error);
  }
});

export default router;
