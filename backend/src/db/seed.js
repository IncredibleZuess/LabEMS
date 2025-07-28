import bcrypt from 'bcryptjs';
import { getDb, initDatabase } from './init.js';
import { addSampleRequests, addSampleNotifications } from './add-sample-requests.js';

const seedData = async () => {
  console.log('Starting database seeding...');
  
  // Initialize database first
  await initDatabase();
  
  const db = getDb();

  try {
    // Hash passwords for demo users
    const adminPassword = await bcrypt.hash('admin123', 12);
    const lecturerPassword = await bcrypt.hash('lecturer123', 12);
    const studentPassword = await bcrypt.hash('student123', 12);

    // Insert demo users
    console.log('Seeding users...');
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // Admin user
        db.run(`
          INSERT OR REPLACE INTO users (
            id, email, password, first_name, last_name, role, department, is_active
          ) VALUES (1, 'admin@labems.com', ?, 'Admin', 'User', 'admin', 'IT Department', 1)
        `, [adminPassword]);

        // Lecturer users
        db.run(`
          INSERT OR REPLACE INTO users (
            id, email, password, first_name, last_name, role, department, is_active
          ) VALUES (2, 'lecturer@labems.com', ?, 'Dr. John', 'Smith', 'lecturer', 'Computer Science', 1)
        `, [lecturerPassword]);

        db.run(`
          INSERT OR REPLACE INTO users (
            id, email, password, first_name, last_name, role, department, is_active
          ) VALUES (3, 'prof.johnson@university.edu', ?, 'Emily', 'Johnson', 'lecturer', 'Engineering', 1)
        `, [lecturerPassword]);

        // Student users
        db.run(`
          INSERT OR REPLACE INTO users (
            id, email, password, first_name, last_name, role, student_number, department, is_active
          ) VALUES (4, 'student@labems.com', ?, 'Alice', 'Wilson', 'student', 'CS2024001', 'Computer Science', 1)
        `, [studentPassword]);

        db.run(`
          INSERT OR REPLACE INTO users (
            id, email, password, first_name, last_name, role, student_number, department, is_active
          ) VALUES (5, 'student2@university.edu', ?, 'Bob', 'Brown', 'student', 'CS2024002', 'Computer Science', 1)
        `, [studentPassword]);

        db.run(`
          INSERT OR REPLACE INTO users (
            id, email, password, first_name, last_name, role, student_number, department, is_active
          ) VALUES (6, 'student3@university.edu', ?, 'Carol', 'Davis', 'student', 'ENG2024001', 'Engineering', 1)
        `, [studentPassword], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Insert equipment categories
    console.log('Seeding equipment categories...');
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run(`
          INSERT OR REPLACE INTO equipment_categories (id, name, description)
          VALUES (1, 'Computers & Laptops', 'Desktop computers, laptops, and related hardware')
        `);

        db.run(`
          INSERT OR REPLACE INTO equipment_categories (id, name, description)
          VALUES (2, 'Laboratory Equipment', 'Microscopes, scales, and other lab instruments')
        `);

        db.run(`
          INSERT OR REPLACE INTO equipment_categories (id, name, description)
          VALUES (3, 'Audio/Visual Equipment', 'Projectors, cameras, microphones, and AV gear')
        `);

        db.run(`
          INSERT OR REPLACE INTO equipment_categories (id, name, description)
          VALUES (4, 'Engineering Tools', 'Measuring instruments, testing equipment, and tools')
        `);

        db.run(`
          INSERT OR REPLACE INTO equipment_categories (id, name, description)
          VALUES (5, 'Networking Equipment', 'Routers, switches, cables, and network tools')
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Insert sample equipment
    console.log('Seeding equipment...');
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // Computers & Laptops
        db.run(`
          INSERT OR REPLACE INTO equipment (
            id, name, description, category_id, serial_number, model, manufacturer,
            condition, location, total_quantity, available_quantity
          ) VALUES (
            1, 'Dell Latitude Laptop', 'High-performance laptop for programming and development',
            1, 'DL2024001', 'Latitude 5520', 'Dell', 'excellent', 'Computer Lab A', 5, 5
          )
        `);

        db.run(`
          INSERT OR REPLACE INTO equipment (
            id, name, description, category_id, serial_number, model, manufacturer,
            condition, location, total_quantity, available_quantity
          ) VALUES (
            2, 'MacBook Pro', 'Apple laptop for mobile development and design',
            1, 'MB2024001', 'MacBook Pro 16"', 'Apple', 'good', 'Computer Lab B', 3, 3
          )
        `);

        // Laboratory Equipment
        db.run(`
          INSERT OR REPLACE INTO equipment (
            id, name, description, category_id, serial_number, model, manufacturer,
            condition, location, total_quantity, available_quantity
          ) VALUES (
            3, 'Digital Microscope', 'High-resolution digital microscope with camera',
            2, 'DM2024001', 'DM-500', 'Olympus', 'excellent', 'Biology Lab', 2, 2
          )
        `);

        db.run(`
          INSERT OR REPLACE INTO equipment (
            id, name, description, category_id, serial_number, model, manufacturer,
            condition, location, total_quantity, available_quantity
          ) VALUES (
            4, 'Analytical Balance', 'Precision weighing scale for chemical measurements',
            2, 'AB2024001', 'Explorer EX224', 'OHAUS', 'good', 'Chemistry Lab', 3, 3
          )
        `);

        // Audio/Visual Equipment
        db.run(`
          INSERT OR REPLACE INTO equipment (
            id, name, description, category_id, serial_number, model, manufacturer,
            condition, location, total_quantity, available_quantity
          ) VALUES (
            5, 'HD Projector', 'High-definition projector for presentations',
            3, 'HP2024001', 'PowerLite 2247U', 'Epson', 'excellent', 'AV Storage', 4, 4
          )
        `);

        db.run(`
          INSERT OR REPLACE INTO equipment (
            id, name, description, category_id, serial_number, model, manufacturer,
            condition, location, total_quantity, available_quantity
          ) VALUES (
            6, 'DSLR Camera', 'Professional camera for documentation and research',
            3, 'DC2024001', 'EOS 90D', 'Canon', 'excellent', 'Media Lab', 2, 2
          )
        `);

        // Engineering Tools
        db.run(`
          INSERT OR REPLACE INTO equipment (
            id, name, description, category_id, serial_number, model, manufacturer,
            condition, location, total_quantity, available_quantity
          ) VALUES (
            7, 'Digital Multimeter', 'Precision electrical measurement tool',
            4, 'DM2024002', 'Fluke 87V', 'Fluke', 'good', 'Electronics Lab', 6, 6
          )
        `);

        db.run(`
          INSERT OR REPLACE INTO equipment (
            id, name, description, category_id, serial_number, model, manufacturer,
            condition, location, total_quantity, available_quantity
          ) VALUES (
            8, 'Oscilloscope', 'Digital storage oscilloscope for signal analysis',
            4, 'OS2024001', 'MSO2024B', 'Rigol', 'excellent', 'Electronics Lab', 2, 2
          )
        `);

        // Networking Equipment
        db.run(`
          INSERT OR REPLACE INTO equipment (
            id, name, description, category_id, serial_number, model, manufacturer,
            condition, location, total_quantity, available_quantity
          ) VALUES (
            9, 'Cisco Router', 'Enterprise-grade router for networking labs',
            5, 'CR2024001', '2921 ISR', 'Cisco', 'good', 'Network Lab', 4, 4
          )
        `);

        db.run(`
          INSERT OR REPLACE INTO equipment (
            id, name, description, category_id, serial_number, model, manufacturer,
            condition, location, total_quantity, available_quantity
          ) VALUES (
            10, 'Network Switch', '24-port managed switch for lab setups',
            5, 'NS2024001', 'SG300-24', 'Cisco', 'excellent', 'Network Lab', 3, 3
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Insert sample equipment requests
    console.log('Seeding equipment requests...');
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // Pending request
        db.run(`
          INSERT OR REPLACE INTO equipment_requests (
            id, user_id, equipment_id, quantity, start_date, end_date, purpose, status
          ) VALUES (
            1, 4, 1, 1, date('now', '+1 day'), date('now', '+7 days'),
            'Final year project development - need laptop for mobile app development', 'pending'
          )
        `);

        // Approved request
        db.run(`
          INSERT OR REPLACE INTO equipment_requests (
            id, user_id, equipment_id, quantity, start_date, end_date, purpose, status,
            lecturer_id, lecturer_notes, approved_at
          ) VALUES (
            2, 5, 3, 1, date('now'), date('now', '+3 days'),
            'Biology research project - microscopic analysis of cell structures', 'approved',
            2, 'Approved for research project. Please handle with care.', datetime('now', '-1 hour')
          )
        `);

        // Denied request
        db.run(`
          INSERT OR REPLACE INTO equipment_requests (
            id, user_id, equipment_id, quantity, start_date, end_date, purpose, status,
            lecturer_id, lecturer_notes
          ) VALUES (
            3, 6, 2, 2, date('now', '+2 days'), date('now', '+14 days'),
            'Group project for mobile app development course', 'denied',
            3, 'Request denied - quantity not available for requested duration. Please submit individual requests.'
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Update equipment availability based on approved requests
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE equipment 
        SET available_quantity = available_quantity - 1 
        WHERE id = 3
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Add sample requests and notifications for demonstration
    await addSampleRequests();
    await addSampleNotifications();

    console.log('Database seeding completed successfully!');
    console.log('\nDemo user credentials:');
    console.log('Admin: admin@labems.com / admin123');
    console.log('Lecturer: lecturer@labems.com / lecturer123');
    console.log('Student: student@labems.com / student123');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedData()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seedData;
