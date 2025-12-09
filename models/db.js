// This module sets up and exports the PostgreSQL client pool.
const { Pool } = require('pg');

/* *
 * We are configuring the 'ssl' object to force the use of TLS/SSL, which is mandatory
 * for services like Neon.
 */

const connectionString = process.env.DATABASE_URL;

// Check if the connection string is set
if (!connectionString) {
    console.error("FATAL ERROR: DATABASE_URL is not defined in environment variables.");
    throw new Error("DATABASE_URL must be set to connect to PostgreSQL.");
}

const pool = new Pool({
    connectionString: connectionString,
    //Explicitly setting SSL configuration to resolve TLS handshake errors 
    // like "self signed certificate in certificate chain" and "Connection terminated unexpectedly".
    ssl: {
        // Setting 'true' mandates the use of SSL/TLS.
        // The 'rejectUnauthorized: false' allows connections to proceed even if the CA
        // cannot be verified, which is necessary for many deployment environments.
        rejectUnauthorized: false,
    },
});

pool.on('connect', () => {
    console.log('PostgreSQL client connected successfully.');
});

pool.on('error', (err) => {
    // A critical error occurred with an idle client
    console.error('FATAL DB ERROR: Unexpected connection error on PostgreSQL pool:', err);
    // xit the process on a critical error to force a restart 
    // by the hosting environment/process manager (like nodemon or PM2).
    process.exit(1);
});

module.exports = {
    // Export a wrapper for pool.query for simpler execution in models
    query: (text, params) => pool.query(text, params),
    // Export the pool itself, in case direct client management is needed
    pool,
};