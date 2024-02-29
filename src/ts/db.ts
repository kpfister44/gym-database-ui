import mysql from 'mysql';

const connection = mysql.createConnection({
  host: 'classmysql.engr.oregonstate.edu', 
  user: 'pfisterk',
  password: '9776',
  database: 'cs340_pfisterk'
});

connection.connect(error => {
  if (error) throw error;
  console.log("Successfully connected to the database.");
});

export default connection;