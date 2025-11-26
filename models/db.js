const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

// Check if the connection string is set
if (!connectionString) {
    console.error("FATAL ERROR: DATABASE_URL is not defined in environment variables.");
    throw new Error("DATABASE_URL must be set to connect to PostgreSQL.");
}

const pool = new Pool({
    connectionString: connectionString,
    // Re-adding the explicit SSL configuration to resolve the 
    // "Connection terminated unexpectedly" error caused by TLS handshake issues.
    ssl: {
        rejectUnauthorized: false, // Allows connections without a verified CA (common in dev)
    },
});

pool.on('connect', () => {
    console.log('PostgreSQL client connected successfully.');
});

pool.on('error', (err) => {
    // A critical error occurred with an idle client
    console.error('Unexpected error on idle PostgreSQL client:', err);
    // The application should likely exit or try to gracefully restart the pool
});

module.exports = {
    // Export a wrapper for pool.query for simpler execution in models
    query: (text, params) => pool.query(text, params),
    // Export the pool itself, in case direct client management is needed
    pool,
};