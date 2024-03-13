import express from 'express';
import pool from '../db'; 

const router = express.Router();

// Route to get all maintenance requests
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM MaintenanceRequests';
  pool.query(sql, (error, results) => {
    if (error) {
      console.error('Failed to fetch maintenance requests:', error);
      res.status(500).json({ message: 'Failed to fetch maintenance requests' });
      return;
    }
    res.json(results);
  });
});

// Route to add a new maintenance request
router.post('/', (req, res) => {
  const { equipmentId, requestDate, resolved } = req.body;
  const sql = 'INSERT INTO MaintenanceRequests (equipmentId, requestDate, resolved) VALUES (?, ?, ?)';
  pool.query(sql, [equipmentId, requestDate, resolved], (error, results) => {
    if (error) {
      console.error('Failed to add maintenance request:', error);
      res.status(500).json({ message: 'Failed to add maintenance request' });
      return;
    }
    res.json({ message: 'Maintenance request added successfully', data: results });
  });
});

// Route to update a maintenance request by requestId
router.put('/:requestId', (req, res) => {
  const { requestId } = req.params;
  const { equipmentId, requestDate, resolved } = req.body;
  const sql = 'UPDATE MaintenanceRequests SET equipmentId = ?, requestDate = ?, resolved = ? WHERE requestId = ?';
  pool.query(sql, [equipmentId, requestDate, resolved, requestId], (error, results) => {
    if (error) {
      console.error('Failed to update maintenance request:', error);
      res.status(500).json({ message: 'Failed to update maintenance request' });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Maintenance request not found' });
      return;
    }
    res.json({ message: 'Maintenance request updated successfully', data: results });
  });
});

// Route to delete a maintenance request by requestId
router.delete('/:requestId', (req, res) => {
  const { requestId } = req.params;
  const sql = 'DELETE FROM MaintenanceRequests WHERE requestId = ?';
  pool.query(sql, [requestId], (error, results) => {
    if (error) {
      console.error('Failed to delete maintenance request:', error);
      res.status(500).json({ message: 'Failed to delete maintenance request' });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Maintenance request not found' });
      return;
    }
    res.json({ message: 'Maintenance request deleted successfully', data: results });
  });
});

export default router;