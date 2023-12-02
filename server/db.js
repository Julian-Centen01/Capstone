const Pool = require("pg").Pool


const pool = new Pool({
    user: "postgres",
    password:"Julianjc2",
    host: "localhost",
    port: 5432,
    database: "DuelingMasters"
});

module.exports = pool;