import express from 'express';
import pool from '../db'; 

const router = express.Router();

// Add a new member class
router.post('/', (req, res) => {
  const { memberId, classId, registrationDate } = req.body;
  const sql = 'INSERT INTO MemberClasses (memberId, classId, registrationDate) VALUES (?, ?, ?)';
  pool.query(sql, [memberId, classId, registrationDate], (error, results) => {
    if (error) {
      console.error('Failed to add member class:', error);
      res.status(500).json({ message: 'Failed to add member class' });
      return;
    }
    res.json({ message: 'Member class added successfully', data: results });
  });
});

// Get all member classes
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM MemberClasses';
  pool.query(sql, (error, results) => {
    if (error) {
      console.error('Failed to fetch member classes:', error);
      res.status(500).json({ message: 'Failed to fetch member classes' });
      return;
    }
    res.json(results);
  });
});

// Get a single member class by ID
router.get('/:memberClassId', (req, res) => {
  const { memberClassId } = req.params;
  const sql = 'SELECT * FROM MemberClasses WHERE memberClassId = ?';
  pool.query(sql, [memberClassId], (error, results) => {
    if (error) {
      console.error('Failed to fetch member class:', error);
      res.status(500).json({ message: 'Failed to fetch member class' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'Member class not found' });
      return;
    }
    res.json(results[0]);
  });
});

// Update a member class by ID
router.put('/:memberClassId', (req, res) => {
  const { memberClassId } = req.params;
  const { memberId, classId, registrationDate } = req.body;
  const sql = 'UPDATE MemberClasses SET memberId = ?, classId = ?, registrationDate = ? WHERE memberClassId = ?';
  pool.query(sql, [memberId, classId, registrationDate, memberClassId], (error, results) => {
    if (error) {
      console.error('Failed to update member class:', error);
      res.status(500).json({ message: 'Failed to update member class' });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Member class not found' });
      return;
    }
    res.json({ message: 'Member class updated successfully', data: results });
  });
});

// Delete a member class by ID
router.delete('/:memberClassId', (req, res) => {
  const { memberClassId } = req.params;
  const sql = 'DELETE FROM MemberClasses WHERE memberClassId = ?';
  pool.query(sql, [memberClassId], (error, results) => {
    if (error) {
      console.error('Failed to delete member class:', error);
      res.status(500).json({ message: 'Failed to delete member class' });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Member class not found' });
      return;
    }
    res.json({ message: 'Member class deleted successfully', data: results });
  });
});

export default router;