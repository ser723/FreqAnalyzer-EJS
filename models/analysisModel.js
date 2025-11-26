const { Client } = require('pg');

// Initialize the PostgreSQL Client using the DATABASE_URL environment variable
let client;
if (process.env.DATABASE_URL) {
    client = new Client({
        connectionString: process.env.DATABASE_URL,
        // Neon requires SSL for connection
        ssl: {
            rejectUnauthorized: false,
        },
    });
    // Connect to the database
    client.connect()
        .then(() => console.log('Successfully connected to Neon PostgreSQL database.'))
        .catch(err => console.error('Neon connection error:', err));
} else {
    console.error("DATABASE_URL environment variable is not set. Cannot connect to Neon.");
}

// --- Create the Table if it doesn't exist (Runs once on startup) ---
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS analyses (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        duration FLOAT,
        analysis_count INTEGER,
        patterns JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
`;

if (client) {
    client.query(createTableQuery)
        .then(() => console.log("PostgreSQL table 'analyses' ensured."))
        .catch(err => console.error("Error creating analyses table:", err));
}

/**
 * Saves a new analysis result to the database.
 * @param {object} analysisResult - The result object from the Python script.
 * @returns {number|null} The ID of the newly created row, or null on failure.
 */
async function saveAnalysis(analysisResult) {
    if (!client) return null;

    try {
        const patternsData = analysisResult.patterns || []; 
        
        const query = `
            INSERT INTO analyses (filename, duration, analysis_count, patterns)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        
        const values = [
            analysisResult.filename,
            analysisResult.duration,
            analysisResult.analysis_count,
            JSON.stringify(patternsData) // Store complex data as JSONB
        ];

        const res = await client.query(query, values);
        
        const newId = res.rows[0].id;
        console.log("Analysis successfully saved to Neon with ID: ", newId);
        return newId;

    } catch (e) {
        console.error("Error saving analysis to Neon:", e);
        return null;
    }
}

/**
 * Retrieves an analysis result by ID.
 * @param {string} id - The document ID.
 * @returns {object|null} The analysis data, or null if not found.
 */
async function getAnalysisById(id) {
    if (!client) return null;
    
    try {
        const query = `
            SELECT id, filename, duration, analysis_count, patterns, created_at
            FROM analyses
            WHERE id = $1;
        `;
        
        const res = await client.query(query, [id]);

        if (res.rows.length > 0) {
            const data = res.rows[0];
            // PostgreSQL automatically parses JSONB, so that only object is returned
            return {
                id: data.id,
                filename: data.filename,
                duration: data.duration,
                analysis_count: data.analysis_count,
                patterns: data.patterns, // patterns is already an array/object
                createdAt: data.created_at
            };
        } else {
            return null;
        }
    } catch (e) {
        console.error("Error fetching analysis from Neon:", e);
        return null;
    }
}

module.exports = {
    saveAnalysis,
    getAnalysisById
};