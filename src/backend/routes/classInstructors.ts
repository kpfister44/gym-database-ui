import express from 'express';
import pool from '../db'; 

const router = express.Router();

// Add a new class instructor
router.post('/', (req, res) => {
  const { classId, instructorId } = req.body;
  const sql = 'INSERT INTO ClassInstructors (classId, instructorId) VALUES (?, ?)';
  pool.query(sql, [classId, instructorId], (error, results) => {
    if (error) {
      console.error('Failed to add class instructor:', error);
      res.status(500).json({ message: 'Failed to add class instructor' });
      return;
    }
    res.json({ message: 'Class Instructor added', data: results });
  });
});

// Get all class instructors
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM ClassInstructors';
  pool.query(sql, (error, results) => {
    if (error) {
      console.error('Failed to fetch class instructors:', error);
      res.status(500).json({ message: 'Failed to fetch class instructors' });
      return;
    }
    res.json(results);
  });
});

// Get a single class instructor by ID
router.get('/:classInstructorId', (req, res) => {
  const { classInstructorId } = req.params;
  const sql = 'SELECT * FROM ClassInstructors WHERE classInstructorId = ?';
  pool.query(sql, [classInstructorId], (error, results) => {
    if (error) {
      console.error('Failed to fetch class instructor:', error);
      res.status(500).json({ message: 'Failed to fetch class instructor' });
      return;
    }
    res.json(results[0] || { message: 'Class Instructor not found' });
  });
});

// Update a class instructor by ID
router.put('/:classInstructorId', (req, res) => {
  const { classInstructorId } = req.params;
  const { classId, instructorId } = req.body;
  const sql = 'UPDATE ClassInstructors SET classId = ?, instructorId = ? WHERE classInstructorId = ?';
  pool.query(sql, [classId, instructorId, classInstructorId], (error, results) => {
    if (error) {
      console.error('Failed to update class instructor:', error);
      res.status(500).json({ message: 'Failed to update class instructor' });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Class Instructor not found' });
      return;
    }
    res.json({ message: 'Class Instructor updated', data: results });
  });
});

// Delete a class instructor by ID
router.delete('/:classInstructorId', (req, res) => {
  const { classInstructorId } = req.params;
  const sql = 'DELETE FROM ClassInstructors WHERE classInstructorId = ?';
  pool.query(sql, [classInstructorId], (error, results) => {
    if (error) {
      console.error('Failed to delete class instructor:', error);
      res.status(500).json({ message: 'Failed to delete class instructor' });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Class Instructor not found' });
      return;
    }
    res.json({ message: 'Class Instructor deleted successfully', data: results });
  });
});

export default router;