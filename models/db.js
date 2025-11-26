const db = require('./db'); // Imports { query, pool } from models/db.js

/**
 * Ensures the analysis results table exists in the database.
 * This runs once when the application starts.
 */
async function initializeDatabase() {
    console.log('Initializing PostgreSQL table...');
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS analyses (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            duration NUMERIC(10, 2),
            analysis_count INTEGER,
            patterns JSONB NOT NULL,
            summary TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        // Use the pool's query method for creation
        await db.query(createTableQuery); 
        console.log("PostgreSQL table 'analyses' ensured.");
    } catch (e) {
        // If this fails, the app should likely crash or signal a critical error.
        console.error('Error ensuring analyses table exists:', e);
    }
}

// Call initialization once at module load
initializeDatabase();


/**
 * Saves a new analysis result to the database.
 * @param {object} analysisResult - The result object from the Python script.
 * @returns {Promise<number|null>} The ID of the newly created row, or null on failure.
 */
async function saveAnalysis(analysisResult) {
    if (!analysisResult || !analysisResult.success) {
        console.error("Attempted to save an invalid analysis result.");
        return null;
    }
    
    try {
        const patternsData = analysisResult.patterns || []; 
        
        const queryText = `
            INSERT INTO analyses (filename, duration, analysis_count, patterns, summary)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        
        const values = [
            analysisResult.filename,
            analysisResult.duration,
            analysisResult.analysis_count,
            // JSON.stringify is mandatory when saving complex JS objects to a JSONB column
            JSON.stringify(patternsData), 
            analysisResult.summary || 'No summary provided.' 
        ];

        // Use the pool's query method
        const res = await db.query(queryText, values);
        
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
 * @param {string} id - The database ID (SERIAL primary key) of the analysis.
 * @returns {Promise<object|null>} The analysis data, or null if not found.
 */
async function getAnalysisById(id) {
    try {
        const queryText = `
            SELECT id, filename, duration, analysis_count, patterns, summary, created_at
            FROM analyses
            WHERE id = $1;
        `;
        
        // Use the pool's query method
        const res = await db.query(queryText, [id]);

        if (res.rows.length > 0) {
            const data = res.rows[0];
            // PostgreSQL automatically converts JSONB back into a JS object/array
            return {
                id: data.id,
                filename: data.filename,
                duration: data.duration,
                analysis_count: data.analysis_count,
                patterns: data.patterns, 
                summary: data.summary,
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