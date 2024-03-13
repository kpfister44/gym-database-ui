import mysql from 'mysql';

const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'classmysql.engr.oregonstate.edu',
  user: 'cs340_pfisterk', 
  password: '2997',
  database: 'cs340_pfisterk' 
});

// Attempt to get a connection from the pool to test if the connection is successful
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Successfully connected to the database.");
  connection.release(); // Release the connection back to the pool
});

export default pool;