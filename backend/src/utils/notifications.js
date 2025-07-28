import { getDb } from '../db/init.js';

export const createNotification = async (userId, title, message, type = 'info', relatedRequestId = null, userRole = null) => {
  const db = getDb();

  if (userId) {
    // Create notification for specific user
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO notifications (user_id, title, message, type, related_request_id)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, title, message, type, relatedRequestId], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  } else if (userRole) {
    // Create notifications for all users with specific role
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT id FROM users WHERE role = ? AND is_active = 1', [userRole], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const notificationPromises = users.map(user => 
      new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO notifications (user_id, title, message, type, related_request_id)
          VALUES (?, ?, ?, ?, ?)
        `, [user.id, title, message, type, relatedRequestId], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      })
    );

    return Promise.all(notificationPromises);
  }
};

export const markNotificationAsRead = async (notificationId, userId) => {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, userId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
};

export const markAllNotificationsAsRead = async (userId) => {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
};

export const getUnreadNotificationCount = async (userId) => {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      }
    );
  });
};
