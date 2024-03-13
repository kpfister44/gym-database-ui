import express from 'express';
import pool from '../db'; 

const router = express.Router();

// Add a new instructor
router.post('/', (req, res) => {
  const { instructorName, specialty } = req.body;
  const sql = 'INSERT INTO Instructors (instructorName, specialty) VALUES (?, ?)';
  pool.query(sql, [instructorName, specialty], (error, results) => {
    if (error) {
      console.error('Failed to add instructor:', error);
      res.status(500).json({ message: 'Failed to add instructor' });
      return;
    }
    res.json({ message: 'Instructor added successfully', data: results });
  });
});

// Get all instructors
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM Instructors';
  pool.query(sql, (error, results) => {
    if (error) {
      console.error('Failed to fetch instructors:', error);
      res.status(500).json({ message: 'Failed to fetch instructors' });
      return;
    }
    res.json(results);
  });
});

// Get a single instructor by ID
router.get('/:instructorId', (req, res) => {
  const { instructorId } = req.params;
  const sql = 'SELECT * FROM Instructors WHERE instructorId = ?';
  pool.query(sql, [instructorId], (error, results) => {
    if (error) {
      console.error('Failed to fetch instructor:', error);
      res.status(500).json({ message: 'Failed to fetch instructor' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'Instructor not found' });
      return;
    }
    res.json(results[0]);
  });
});

// Update an instructor by ID
router.put('/:instructorId', (req, res) => {
  const { instructorId } = req.params;
  const { instructorName, specialty } = req.body;
  const sql = 'UPDATE Instructors SET instructorName = ?, specialty = ? WHERE instructorId = ?';
  pool.query(sql, [instructorName, specialty, instructorId], (error, results) => {
    if (error) {
      console.error('Failed to update instructor:', error);
      res.status(500).json({ message: 'Failed to update instructor' });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Instructor not found' });
      return;
    }
    res.json({ message: 'Instructor updated successfully', data: results });
  });
});

// Delete an instructor by ID
router.delete('/:instructorId', (req, res) => {
  const { instructorId } = req.params;
  const sql = 'DELETE FROM Instructors WHERE instructorId = ?';
  pool.query(sql, [instructorId], (error, results) => {
    if (error) {
      console.error('Failed to delete instructor:', error);
      res.status(500).json({ message: 'Failed to delete instructor' });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Instructor not found' });
      return;
    }
    res.json({ message: 'Instructor deleted successfully', data: results });
  });
});

export default router;