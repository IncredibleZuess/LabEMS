import express from 'express';
import Joi from 'joi';
import { getDb } from '../db/init.js';
import { authenticateToken, requireLecturerOrAdmin } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

// Validation schemas
const requestSchema = Joi.object({
  equipmentId: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(1).default(1),
  startDate: Joi.date().min('now').required(),
  endDate: Joi.date().greater(Joi.ref('startDate')).required(),
  purpose: Joi.string().min(10).required()
});

const updateRequestSchema = Joi.object({
  status: Joi.string().valid('approved', 'denied').required(),
  lecturerNotes: Joi.string().allow('')
});

// Get requests (with filtering based on user role)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      equipmentId = '',
      userId = ''
    } = req.query;

    const offset = (page - 1) * limit;
    const db = getDb();

    let whereConditions = [];
    let params = [];

    // Students can only see their own requests
    if (req.user.role === 'student') {
      whereConditions.push('r.user_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'lecturer' && userId) {
      // Lecturers can filter by user if specified
      whereConditions.push('r.user_id = ?');
      params.push(userId);
    }

    if (status) {
      whereConditions.push('r.status = ?');
      params.push(status);
    }

    if (equipmentId) {
      whereConditions.push('r.equipment_id = ?');
      params.push(equipmentId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const requestsQuery = `
      SELECT 
        r.*,
        u.first_name || ' ' || u.last_name as student_name,
        u.email as student_email,
        u.student_number,
        e.name as equipment_name,
        e.model as equipment_model,
        e.manufacturer as equipment_manufacturer,
        lecturer.first_name || ' ' || lecturer.last_name as lecturer_name
      FROM equipment_requests r
      JOIN users u ON r.user_id = u.id
      JOIN equipment e ON r.equipment_id = e.id
      LEFT JOIN users lecturer ON r.lecturer_id = lecturer.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM equipment_requests r
      JOIN users u ON r.user_id = u.id
      JOIN equipment e ON r.equipment_id = e.id
      ${whereClause}
    `;

    const [requests, countResult] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all(requestsQuery, [...params, limit, offset], (err, rows) => {
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
      requests,
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

// Get active loans (approved requests that haven't been returned)
router.get('/activeLoans', authenticateToken, requireLecturerOrAdmin, async (req, res, next) => {
  try {
    console.log("Fetching active loans...");
    const db = getDb();

    const activeLoansQuery = `
      SELECT 
        r.*,
        u.first_name || ' ' || u.last_name as student_name,
        u.email as student_email,
        u.student_number,
        e.name as equipment_name,
        e.model as equipment_model,
        e.manufacturer as equipment_manufacturer,
        e.location as equipment_location,
        lecturer.first_name || ' ' || lecturer.last_name as lecturer_name
      FROM equipment_requests r
      JOIN users u ON r.user_id = u.id
      JOIN equipment e ON r.equipment_id = e.id
      LEFT JOIN users lecturer ON r.lecturer_id = lecturer.id
      WHERE r.status = 'approved' AND r.returned_at IS NULL
      ORDER BY r.end_date ASC
    `;

    const activeLoans = await new Promise((resolve, reject) => {
      db.all(activeLoansQuery, [], (err, rows) => {
        if (err) {
            console.log(err);
            reject(err)
        }
        else resolve(rows);
      });
    });

    res.json({
      requests: activeLoans
    });
  } catch (error) {
    next(error);
  }
});

// Get request by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const request = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          r.*,
          u.first_name || ' ' || u.last_name as student_name,
          u.email as student_email,
          u.student_number,
          u.phone as student_phone,
          e.name as equipment_name,
          e.model as equipment_model,
          e.manufacturer as equipment_manufacturer,
          e.serial_number,
          e.location,
          lecturer.first_name || ' ' || lecturer.last_name as lecturer_name
        FROM equipment_requests r
        JOIN users u ON r.user_id = u.id
        JOIN equipment e ON r.equipment_id = e.id
        LEFT JOIN users lecturer ON r.lecturer_id = lecturer.id
        WHERE r.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Students can only view their own requests
    if (req.user.role === 'student' && request.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
});

// Create equipment request (students only)
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can create equipment requests' });
    }

    const { error, value } = requestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { equipmentId, quantity, startDate, endDate, purpose } = value;
    const db = getDb();

    // Check if equipment exists and has enough availability
    const equipment = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM equipment WHERE id = ? AND is_available = 1', [equipmentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found or not available' });
    }

    if (equipment.available_quantity < quantity) {
      return res.status(400).json({ 
        error: `Not enough equipment available. Only ${equipment.available_quantity} units available.` 
      });
    }

    // Check for overlapping requests for the same equipment
    const overlappingRequests = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count
        FROM equipment_requests
        WHERE equipment_id = ? 
        AND status = 'approved'
        AND (
          (start_date <= ? AND end_date >= ?) OR
          (start_date <= ? AND end_date >= ?) OR
          (start_date >= ? AND end_date <= ?)
        )
      `, [equipmentId, startDate, startDate, endDate, endDate, startDate, endDate], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (overlappingRequests.count > 0) {
      return res.status(400).json({ 
        error: 'Equipment is already reserved for the requested time period' 
      });
    }

    // Create the request
    const requestId = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO equipment_requests (
          user_id, equipment_id, quantity, start_date, end_date, purpose
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [req.user.id, equipmentId, quantity, startDate, endDate, purpose], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Get the created request with full details
    const createdRequest = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          r.*,
          u.first_name || ' ' || u.last_name as student_name,
          e.name as equipment_name
        FROM equipment_requests r
        JOIN users u ON r.user_id = u.id
        JOIN equipment e ON r.equipment_id = e.id
        WHERE r.id = ?
      `, [requestId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Create notification for lecturers
    await createNotification(
      null, // Will notify all lecturers
      'New Equipment Request',
      `${createdRequest.student_name} has requested ${equipment.name}`,
      'info',
      requestId,
      'lecturer'
    );

    // Emit real-time notification to lecturers
    const io = req.app.get('io');
    io.to('lecturers').emit('new-request', {
      id: requestId,
      studentName: createdRequest.student_name,
      equipmentName: equipment.name,
      requestDate: createdRequest.request_date
    });

    res.status(201).json({
      message: 'Equipment request created successfully',
      request: createdRequest
    });
  } catch (error) {
    next(error);
  }
});

// Update request status (lecturers and admins only)
router.put('/:id', authenticateToken, requireLecturerOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = updateRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { status, lecturerNotes } = value;
    const db = getDb();

    // Get the request
    const request = await new Promise((resolve, reject) => {
      db.get(`
        SELECT r.*, e.name as equipment_name, e.available_quantity,
               u.first_name || ' ' || u.last_name as student_name,
               u.email as student_email
        FROM equipment_requests r
        JOIN equipment e ON r.equipment_id = e.id
        JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be updated' });
    }

    // If approving, check equipment availability again
    if (status === 'approved') {
      if (request.available_quantity < request.quantity) {
        return res.status(400).json({ 
          error: 'Equipment no longer available in requested quantity' 
        });
      }

      // Update equipment availability
      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE equipment 
          SET available_quantity = available_quantity - ?
          WHERE id = ?
        `, [request.quantity, request.equipment_id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Update request
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE equipment_requests 
        SET status = ?, lecturer_id = ?, lecturer_notes = ?, 
            approved_at = CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, req.user.id, lecturerNotes, status, id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Create notification for student
    const notificationTitle = status === 'approved' 
      ? 'Request Approved' 
      : 'Request Denied';
    const notificationMessage = status === 'approved'
      ? `Your request for ${request.equipment_name} has been approved`
      : `Your request for ${request.equipment_name} has been denied. ${lecturerNotes}`;

    await createNotification(
      request.user_id,
      notificationTitle,
      notificationMessage,
      status === 'approved' ? 'success' : 'error',
      id
    );

    // Emit real-time notification to student
    const io = req.app.get('io');
    io.emit('request-updated', {
      userId: request.user_id,
      requestId: id,
      status,
      message: notificationMessage
    });

    // Get updated request
    const updatedRequest = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          r.*,
          u.first_name || ' ' || u.last_name as student_name,
          e.name as equipment_name,
          lecturer.first_name || ' ' || lecturer.last_name as lecturer_name
        FROM equipment_requests r
        JOIN users u ON r.user_id = u.id
        JOIN equipment e ON r.equipment_id = e.id
        LEFT JOIN users lecturer ON r.lecturer_id = lecturer.id
        WHERE r.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({
      message: `Request ${status} successfully`,
      request: updatedRequest
    });
  } catch (error) {
    next(error);
  }
});

// Mark equipment as returned
router.post('/:id/return', authenticateToken, requireLecturerOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { condition, notes } = req.body;
    const db = getDb();

    // Get the request
    const request = await new Promise((resolve, reject) => {
      db.get(`
        SELECT r.*, e.name as equipment_name,
               u.first_name || ' ' || u.last_name as student_name
        FROM equipment_requests r
        JOIN equipment e ON r.equipment_id = e.id
        JOIN users u ON r.user_id = u.id
        WHERE r.id = ? AND r.status = 'approved'
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!request) {
      return res.status(404).json({ error: 'Approved request not found' });
    }

    // Update request status to returned
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE equipment_requests 
        SET status = 'returned', returned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update equipment availability
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE equipment 
        SET available_quantity = available_quantity + ?
        WHERE id = ?
      `, [request.quantity, request.equipment_id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Log usage history
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO equipment_usage (
          equipment_id, user_id, request_id, checkout_date, return_date, 
          condition_after, notes
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
      `, [
        request.equipment_id, request.user_id, id,
        request.approved_at, condition, notes
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Create notification for student
    await createNotification(
      request.user_id,
      'Equipment Returned',
      `Your return of ${request.equipment_name} has been processed`,
      'success',
      id
    );

    res.json({ message: 'Equipment marked as returned successfully' });
  } catch (error) {
    next(error);
  }
});

// Get dashboard statistics
router.get('/stats/dashboard', authenticateToken, requireLecturerOrAdmin, async (req, res, next) => {
  try {
    const db = getDb();

    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      overdueRequests,
      totalEquipment,
      availableEquipment
    ] = await Promise.all([
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM equipment_requests', (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM equipment_requests WHERE status = 'pending'", (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM equipment_requests WHERE status = 'approved'", (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(`
          SELECT COUNT(*) as count 
          FROM equipment_requests 
          WHERE status = 'approved' AND end_date < date('now')
        `, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM equipment', (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM equipment WHERE available_quantity > 0', (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      })
    ]);

    res.json({
      totalRequests,
      pendingRequests,
      approvedRequests,
      overdueRequests,
      totalEquipment,
      availableEquipment
    });
  } catch (error) {
    next(error);
  }
});

export default router;
