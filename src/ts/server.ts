import express from 'express';
import connection from './db';

const app = express();
const PORT =  3000;

app.use(express.json()); // Middleware to parse JSON bodies

// Example READ operation: Fetch all instructors
app.get('/instructors', (req, res) => {
    connection.query('SELECT * FROM instructors', (error, results) => {
      if (error) throw error;
      res.json(results);
    });
  });

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});