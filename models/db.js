const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

// Check if the connection string is set
if (!connectionString) {
    console.error("FATAL ERROR: DATABASE_URL is not defined in environment variables.");
    // In a production server, you would exit the process here: process.exit(1);
    // For development, we'll log an error and try to proceed with a dummy pool (or just throw).
    throw new Error("DATABASE_URL must be set to connect to PostgreSQL.");
}

const pool = new Pool({
    connectionString: connectionString,
    // IMPORTANT: For Neon/cloud databases, the connection string typically includes 
    // ?sslmode=require which handles the secure connection. 
    // We remove the redundant 'ssl: { rejectUnauthorized: false }' to avoid conflicts.
    // If the connection still fails, you may need to re-add the ssl object 
    // to force SSL in some environments.
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