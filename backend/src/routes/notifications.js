import express from 'express';
import { getDb } from '../db/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../utils/notifications.js';

const router = express.Router();

// Get user's notifications
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;
    const db = getDb();

    let whereClause = 'WHERE user_id = ?';
    let params = [req.user.id];

    if (unreadOnly === 'true') {
      whereClause += ' AND is_read = 0';
    }

    const notificationsQuery = `
      SELECT 
        n.*,
        r.status as request_status,
        e.name as equipment_name
      FROM notifications n
      LEFT JOIN equipment_requests r ON n.related_request_id = r.id
      LEFT JOIN equipment e ON r.equipment_id = e.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications n
      ${whereClause}
    `;

    const [notifications, countResult] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all(notificationsQuery, [...params, limit, offset], (err, rows) => {
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
      notifications,
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

// Get unread notification count
router.get('/unread-count', authenticateToken, async (req, res, next) => {
  try {
    const db = getDb();
    
    const result = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        [req.user.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({ unreadCount: result.count });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const success = await markNotificationAsRead(id, req.user.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req, res, next) => {
  try {
    const updatedCount = await markAllNotificationsAsRead(req.user.id);
    
    res.json({ 
      message: 'All notifications marked as read',
      updatedCount 
    });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const result = await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM notifications WHERE id = ? AND user_id = ?',
        [id, req.user.id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
