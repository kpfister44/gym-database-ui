import express from 'express';
import path from 'path';
import connection from './db';

const app = express();
const PORT = 5515;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'dist' directory
app.use(express.static('dist'));

// API Routes
app.post('/api/classInstructors', (req, res) => {
  const { classId, instructorId } = req.body;
  const sql = 'INSERT INTO ClassInstructors (classId, instructorId) VALUES (?, ?)';
  connection.query(sql, [classId, instructorId], (error, results) => {
    if (error) throw error;
    res.json({ message: 'Class Instructor added', data: results });
  });
});

app.get('/api/classInstructors/:classId/:instructorId', (req, res) => {
  const { classId, instructorId } = req.params;
  const sql = 'SELECT * FROM ClassInstructors WHERE classId = ? AND instructorId = ?';
  connection.query(sql, [classId, instructorId], (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

//Route to get all classes
app.get('/api/classes', (req, res) => {
  const sql = 'SELECT * FROM Classes';
  connection.query(sql, (error, results) => {
    if (error) {
      console.error('Failed to fetch classes:', error);
      res.status(500).json({ message: 'Failed to fetch classes' });
      return;
    }
    res.json(results);
  });
});

//Route to get all instructors
app.get('/api/instructors', (req, res) => {
  const sql = 'SELECT * FROM Instructors';
  connection.query(sql, (error, results) => {
    if (error) {
      console.error('Failed to fetch instructors:', error);
      res.status(500).json({ message: 'Failed to fetch instructors' });
      return;
    }
    res.json(results);
  });
});

app.delete('/api/classInstructors/:classId/:instructorId', (req, res) => {
  const { classId, instructorId } = req.params;
  const sql = 'DELETE FROM ClassInstructors WHERE classId = ? AND instructorId = ?';
  connection.query(sql, [classId, instructorId], (error, results) => {
    if (error) throw error;
    res.json({ message: 'Class Instructor removed', data: results });
  });
});

app.put('/api/classInstructors/:classId', (req, res) => {
  const { classId } = req.params;
  const { instructorId } = req.body;
  const sql = 'UPDATE ClassInstructors SET instructorId = ? WHERE classId = ?';
  connection.query(sql, [instructorId, classId], (error, results) => {
    if (error) throw error;
    res.json({ message: 'Class Instructor updated', data: results });
  });
});

// Client-side routing fallback: Serve index.html for unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});