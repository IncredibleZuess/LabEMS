import { getDb } from './init.js';

const addSampleRequests = async () => {
  const db = getDb();
  
  console.log('Adding sample equipment requests...');
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Sample request 1 - Pending request from student
      db.run(`
        INSERT OR REPLACE INTO equipment_requests (
          id, user_id, equipment_id, quantity, start_date, end_date, purpose, status
        ) VALUES (
          1, 4, 1, 1, '2025-07-29', '2025-08-05', 'Final year project development', 'pending'
        )
      `);

      // Sample request 2 - Approved request
      db.run(`
        INSERT OR REPLACE INTO equipment_requests (
          id, user_id, equipment_id, quantity, start_date, end_date, purpose, status, lecturer_id, approved_at
        ) VALUES (
          2, 5, 3, 1, '2025-07-28', '2025-08-02', 'Lab assignment microscopy work', 'approved', 2, '2025-07-28 10:30:00'
        )
      `);

      // Sample request 3 - Another pending request
      db.run(`
        INSERT OR REPLACE INTO equipment_requests (
          id, user_id, equipment_id, quantity, start_date, end_date, purpose, status
        ) VALUES (
          3, 6, 5, 1, '2025-07-30', '2025-08-01', 'Presentation for thesis defense', 'pending'
        )
      `);

      // Sample request 4 - Overdue request
      db.run(`
        INSERT OR REPLACE INTO equipment_requests (
          id, user_id, equipment_id, quantity, start_date, end_date, purpose, status, lecturer_id, approved_at
        ) VALUES (
          4, 4, 7, 2, '2025-07-20', '2025-07-27', 'Electronics lab experiment', 'approved', 2, '2025-07-20 09:00:00'
        )
      `);

      // Sample request 5 - Denied request
      db.run(`
        INSERT OR REPLACE INTO equipment_requests (
          id, user_id, equipment_id, quantity, start_date, end_date, purpose, status, lecturer_id, lecturer_notes
        ) VALUES (
          5, 5, 8, 1, '2025-07-25', '2025-07-28', 'Personal project', 'denied', 2, 'Equipment reserved for official coursework only'
        )
      `, (err) => {
        if (err) {
          console.error('Error adding sample requests:', err);
          reject(err);
        } else {
          console.log('Sample requests added successfully!');
          resolve();
        }
      });
    });
  });
};

// Create some sample notifications
const addSampleNotifications = async () => {
  const db = getDb();
  
  console.log('Adding sample notifications...');
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Notification for approved request
      db.run(`
        INSERT OR REPLACE INTO notifications (
          id, user_id, title, message, type, related_request_id
        ) VALUES (
          1, 5, 'Request Approved', 'Your request for Digital Microscope has been approved by Dr. John Smith', 'success', 2
        )
      `);

      // Notification for denied request
      db.run(`
        INSERT OR REPLACE INTO notifications (
          id, user_id, title, message, type, related_request_id
        ) VALUES (
          2, 5, 'Request Denied', 'Your request for Oscilloscope has been denied. Reason: Equipment reserved for official coursework only', 'error', 5
        )
      `);

      // Notification for overdue equipment
      db.run(`
        INSERT OR REPLACE INTO notifications (
          id, user_id, title, message, type, related_request_id
        ) VALUES (
          3, 4, 'Equipment Overdue', 'Your Digital Multimeter equipment is overdue. Please return it immediately.', 'warning', 4
        )
      `, (err) => {
        if (err) {
          console.error('Error adding sample notifications:', err);
          reject(err);
        } else {
          console.log('Sample notifications added successfully!');
          resolve();
        }
      });
    });
  });
};

const runSampleData = async () => {
  try {
    await addSampleRequests();
    await addSampleNotifications();
    console.log('All sample data added successfully!');
  } catch (error) {
    console.error('Error adding sample data:', error);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSampleData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { addSampleRequests, addSampleNotifications, runSampleData };
