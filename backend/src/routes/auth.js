import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { getDb } from '../db/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).required(),
  lastName: Joi.string().min(2).required(),
  role: Joi.string().valid('student', 'lecturer').required(),
  studentNumber: Joi.string().when('role', {
    is: 'student',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  department: Joi.string().optional(),
  phone: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, firstName, lastName, role, studentNumber, department, phone } = value;
    const db = getDb();

    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user
    const userId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (email, password, first_name, last_name, role, student_number, department, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [email, hashedPassword, firstName, lastName, role, studentNumber, department, phone],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Get created user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, email, first_name, last_name, role, student_number, department FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        studentNumber: user.student_number,
        department: user.department
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;
    const db = getDb();

    // Get user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ? AND is_active = 1', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        studentNumber: user.student_number,
        department: user.department
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const db = getDb();
    
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, email, first_name, last_name, role, student_number, department, phone FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      studentNumber: user.student_number,
      department: user.department,
      phone: user.phone
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  const token = generateToken(req.user);
  res.json({ token });
});

export default router;
