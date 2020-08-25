const mysql = require('mysql')
const connection = mysql.createPool({
  connectionLimit: 40,
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'store'
})

module.exports = connection
