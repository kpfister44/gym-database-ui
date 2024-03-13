import express from 'express';
import pool from '../db'; 

const router = express.Router();

// Route to get all classes
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM Classes';
  pool.query(sql, (error, results) => {
    if (error) {
      console.error('Failed to fetch classes:', error);
      res.status(500).json({ message: 'Failed to fetch classes' });
      return;
    }
    res.json(results);
  });
});

// Route to add a new class
router.post('/', (req, res) => {
  const { className, scheduleTime, attendance, maxParticipants } = req.body;
  const sql = 'INSERT INTO Classes (className, scheduleTime, attendance, maxParticipants) VALUES (?, ?, ?, ?)';
  pool.query(sql, [className, scheduleTime, attendance, maxParticipants], (error, results) => {
    if (error) {
      console.error('Failed to add class:', error);
      res.status(500).json({ message: 'Failed to add class' });
      return;
    }
    res.json({ message: 'Class added successfully', data: results });
  });
});

// Route to update a class by classId
router.put('/:classId', (req, res) => {
  const { classId } = req.params;
  const { className, scheduleTime, attendance, maxParticipants } = req.body;
  const sql = 'UPDATE Classes SET className = ?, scheduleTime = ?, attendance = ?, maxParticipants = ? WHERE classId = ?';
  pool.query(sql, [className, scheduleTime, attendance, maxParticipants, classId], (error, results) => {
    if (error) {
      console.error('Failed to update class:', error);
      res.status(500).json({ message: 'Failed to update class' });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Class not found' });
      return;
    }
    res.json({ message: 'Class updated successfully', data: results });
  });
});

// Route to delete a class by classId
router.delete('/:classId', (req, res) => {
  const { classId } = req.params;
  const sql = 'DELETE FROM Classes WHERE classId = ?';
  pool.query(sql, [classId], (error, results) => {
    if (error) {
      console.error('Failed to delete class:', error);
      res.status(500).json({ message: 'Failed to delete class' });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Class not found' });
      return;
    }
    res.json({ message: 'Class deleted successfully', data: results });
  });
});

export default router;