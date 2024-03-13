import express from 'express';
import pool from '../db'; 

const router = express.Router();

// Route to add a new piece of equipment
router.post('/', (req, res) => {
  const { equipmentType, purchaseDate, maintenanceSchedule, lifespan } = req.body;
  const sql = 'INSERT INTO Equipment (equipmentType, purchaseDate, maintenanceSchedule, lifespan) VALUES (?, ?, ?, ?)';
  pool.query(sql, [equipmentType, purchaseDate, maintenanceSchedule, lifespan], (error, results) => {
    if (error) {
      console.error('Failed to add equipment:', error);
      res.status(500).json({ message: 'Failed to add equipment' });
      return;
    }
    res.json({ message: 'Equipment added successfully', data: results });
  });
});

// Route to get all equipment
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM Equipment';
  pool.query(sql, (error, results) => {
    if (error) {
      console.error('Failed to fetch equipment:', error);
      res.status(500).json({ message: 'Failed to fetch equipment' });
      return;
    }
    res.json(results);
  });
});

// Route to get a single piece of equipment by equipmentId
router.get('/:equipmentId', (req, res) => {
  const { equipmentId } = req.params;
  const sql = 'SELECT * FROM Equipment WHERE equipmentId = ?';
  pool.query(sql, [equipmentId], (error, results) => {
    if (error) {
      console.error('Failed to fetch equipment:', error);
      res.status(500).json({ message: 'Failed to fetch equipment' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'Equipment not found' });
      return;
    }
    res.json(results[0]);
  });
});

// Route to update equipment by equipmentId
router.put('/:equipmentId', (req, res) => {
  const { equipmentId } = req.params;
  const { equipmentType, purchaseDate, maintenanceSchedule, lifespan } = req.body;
  const sql = 'UPDATE Equipment SET equipmentType = ?, purchaseDate = ?, maintenanceSchedule = ?, lifespan = ? WHERE equipmentId = ?';
  pool.query(sql, [equipmentType, purchaseDate, maintenanceSchedule, lifespan, equipmentId], (error, results) => {
    if (error) {
      console.error('Failed to update equipment:', error);
      res.status(500).json({ message: 'Failed to update equipment' });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Equipment not found' });
      return;
    }
    res.json({ message: 'Equipment updated successfully', data: results });
  });
});

// Route to delete equipment by equipmentId
router.delete('/:equipmentId', (req, res) => {
  const { equipmentId } = req.params;
  const sql = 'DELETE FROM Equipment WHERE equipmentId = ?';
  pool.query(sql, [equipmentId], (error, results) => {
    if (error) {
      console.error('Failed to delete equipment:', error);
      res.status(500).json({ message: 'Failed to delete equipment' });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Equipment not found' });
      return;
    }
    res.json({ message: 'Equipment deleted successfully', data: results });
  });
});

export default router;