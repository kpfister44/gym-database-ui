import express from 'express';
import pool from '../db'; 

const router = express.Router();

// Route to add a new member
router.post('/', (req, res) => {
    const { memberName, email, dateJoined, membershipType } = req.body;
    const sql = 'INSERT INTO Members (memberName, email, dateJoined, membershipType) VALUES (?, ?, ?, ?)';
    pool.query(sql, [memberName, email, dateJoined, membershipType], (error, results) => {
      if (error) {
        console.error('Failed to add member:', error);
        res.status(500).json({ message: 'Failed to add member' });
        return;
      }
      res.json({ message: 'Member added successfully', data: results });
    });
  });
  
  // Route to get all members
  router.get('/', (req, res) => {
    const sql = 'SELECT * FROM Members';
    pool.query(sql, (error, results) => {
      if (error) {
        console.error('Failed to fetch members:', error);
        res.status(500).json({ message: 'Failed to fetch members' });
        return;
      }
      res.json(results);
    });
  });
  
  // Route to get a single member by memberId
  router.get('/:memberId', (req, res) => {
    const { memberId } = req.params;
    const sql = 'SELECT * FROM Members WHERE memberId = ?';
    pool.query(sql, [memberId], (error, results) => {
      if (error) {
        console.error('Failed to fetch member:', error);
        res.status(500).json({ message: 'Failed to fetch member' });
        return;
      }
      if (results.length === 0) {
        res.status(404).json({ message: 'Member not found' });
        return;
      }
      res.json(results[0]);
    });
  });
  
  // Route to update a member by memberId
  router.put('/:memberId', (req, res) => {
    const { memberId } = req.params;
    const { memberName, email, dateJoined, membershipType } = req.body;
    const sql = 'UPDATE Members SET memberName = ?, email = ?, dateJoined = ?, membershipType = ? WHERE memberId = ?';
    pool.query(sql, [memberName, email, dateJoined, membershipType, memberId], (error, results) => {
      if (error) {
        console.error('Failed to update member:', error);
        res.status(500).json({ message: 'Failed to update member' });
        return;
      }
      if (results.affectedRows === 0) {
        res.status(404).json({ message: 'Member not found' });
        return;
      }
      res.json({ message: 'Member updated successfully', data: results });
    });
  });
  
  // Route to delete a member by memberId
  router.delete('/:memberId', (req, res) => {
    const { memberId } = req.params;
    const sql = 'DELETE FROM Members WHERE memberId = ?';
    pool.query(sql, [memberId], (error, results) => {
      if (error) {
        console.error('Failed to delete member:', error);
        res.status(500).json({ message: 'Failed to delete member' });
        return;
      }
      if (results.affectedRows === 0) {
        res.status(404).json({ message: 'Member not found' });
        return;
      }
      res.json({ message: 'Member deleted successfully', data: results });
    });
  });

export default router;