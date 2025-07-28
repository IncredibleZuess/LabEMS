import express from 'express';
import Joi from 'joi';
import { getDb } from '../db/init.js';
import { authenticateToken, requireLecturerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const equipmentSchema = Joi.object({
  name: Joi.string().min(2).required(),
  description: Joi.string().allow(''),
  categoryId: Joi.number().integer().required(),
  serialNumber: Joi.string().allow(''),
  model: Joi.string().allow(''),
  manufacturer: Joi.string().allow(''),
  purchaseDate: Joi.date().allow(null),
  purchasePrice: Joi.number().min(0).allow(null),
  condition: Joi.string().valid('excellent', 'good', 'fair', 'poor', 'damaged').default('good'),
  location: Joi.string().allow(''),
  totalQuantity: Joi.number().integer().min(1).default(1),
  imageUrl: Joi.string().uri().allow(''),
  notes: Joi.string().allow('')
});

const categorySchema = Joi.object({
  name: Joi.string().min(2).required(),
  description: Joi.string().allow('')
});

// Get all equipment with filtering and pagination
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      available = '',
      condition = ''
    } = req.query;

    const offset = (page - 1) * limit;
    const db = getDb();

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push('(e.name LIKE ? OR e.description LIKE ? OR e.manufacturer LIKE ? OR e.model LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (category) {
      whereConditions.push('e.category_id = ?');
      params.push(category);
    }

    if (available !== '') {
      if (available === 'true') {
        whereConditions.push('e.available_quantity > 0');
      } else {
        whereConditions.push('e.available_quantity = 0');
      }
    }

    if (condition) {
      whereConditions.push('e.condition = ?');
      params.push(condition);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get equipment with category information
    const equipmentQuery = `
      SELECT 
        e.*,
        c.name as category_name,
        c.description as category_description
      FROM equipment e
      LEFT JOIN equipment_categories c ON e.category_id = c.id
      ${whereClause}
      ORDER BY e.name
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM equipment e
      LEFT JOIN equipment_categories c ON e.category_id = c.id
      ${whereClause}
    `;

    const [equipment, countResult] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all(equipmentQuery, [...params, limit, offset], (err, rows) => {
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
      equipment,
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

// Get equipment by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const equipment = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          e.*,
          c.name as category_name,
          c.description as category_description
        FROM equipment e
        LEFT JOIN equipment_categories c ON e.category_id = c.id
        WHERE e.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json(equipment);
  } catch (error) {
    next(error);
  }
});

// Create equipment (lecturers and admins only)
router.post('/', authenticateToken, requireLecturerOrAdmin, async (req, res, next) => {
  try {
    const { error, value } = equipmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      name, description, categoryId, serialNumber, model, manufacturer,
      purchaseDate, purchasePrice, condition, location, totalQuantity,
      imageUrl, notes
    } = value;

    const db = getDb();

    // Check if category exists
    const category = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM equipment_categories WHERE id = ?', [categoryId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!category) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const equipmentId = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO equipment (
          name, description, category_id, serial_number, model, manufacturer,
          purchase_date, purchase_price, condition, location, total_quantity,
          available_quantity, image_url, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, description, categoryId, serialNumber, model, manufacturer,
        purchaseDate, purchasePrice, condition, location, totalQuantity,
        totalQuantity, imageUrl, notes
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Get created equipment with category info
    const createdEquipment = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          e.*,
          c.name as category_name
        FROM equipment e
        LEFT JOIN equipment_categories c ON e.category_id = c.id
        WHERE e.id = ?
      `, [equipmentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json({
      message: 'Equipment created successfully',
      equipment: createdEquipment
    });
  } catch (error) {
    next(error);
  }
});

// Update equipment
router.put('/:id', authenticateToken, requireLecturerOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = equipmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      name, description, categoryId, serialNumber, model, manufacturer,
      purchaseDate, purchasePrice, condition, location, totalQuantity,
      imageUrl, notes
    } = value;

    const db = getDb();

    // Check if equipment exists
    const existingEquipment = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM equipment WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingEquipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // Calculate new available quantity
    const quantityDiff = totalQuantity - existingEquipment.total_quantity;
    const newAvailableQuantity = existingEquipment.available_quantity + quantityDiff;

    if (newAvailableQuantity < 0) {
      return res.status(400).json({ 
        error: 'Cannot reduce total quantity below currently borrowed items' 
      });
    }

    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE equipment SET
          name = ?, description = ?, category_id = ?, serial_number = ?,
          model = ?, manufacturer = ?, purchase_date = ?, purchase_price = ?,
          condition = ?, location = ?, total_quantity = ?, available_quantity = ?,
          image_url = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name, description, categoryId, serialNumber, model, manufacturer,
        purchaseDate, purchasePrice, condition, location, totalQuantity,
        newAvailableQuantity, imageUrl, notes, id
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get updated equipment
    const updatedEquipment = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          e.*,
          c.name as category_name
        FROM equipment e
        LEFT JOIN equipment_categories c ON e.category_id = c.id
        WHERE e.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({
      message: 'Equipment updated successfully',
      equipment: updatedEquipment
    });
  } catch (error) {
    next(error);
  }
});

// Delete equipment
router.delete('/:id', authenticateToken, requireLecturerOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Check if equipment has active requests
    const activeRequests = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count 
        FROM equipment_requests 
        WHERE equipment_id = ? AND status IN ('pending', 'approved')
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (activeRequests.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete equipment with active requests' 
      });
    }

    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM equipment WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Equipment Categories Routes

// Get all categories
router.get('/categories/all', authenticateToken, async (req, res, next) => {
  try {
    const db = getDb();
    
    const categories = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          c.*,
          COUNT(e.id) as equipment_count
        FROM equipment_categories c
        LEFT JOIN equipment e ON c.id = e.category_id
        GROUP BY c.id
        ORDER BY c.name
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// Create category
router.post('/categories', authenticateToken, requireLecturerOrAdmin, async (req, res, next) => {
  try {
    const { error, value } = categorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, description } = value;
    const db = getDb();

    const categoryId = await new Promise((resolve, reject) => {
      db.run('INSERT INTO equipment_categories (name, description) VALUES (?, ?)', 
        [name, description], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    const category = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM equipment_categories WHERE id = ?', [categoryId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    next(error);
  }
});

export default router;
