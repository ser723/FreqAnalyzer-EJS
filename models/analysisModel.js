const db = require('./db'); // Ensure this points to your PostgreSQL client setup file

/**
 * Ensures the analysis results table exists in the database.
 * This function is called from server.js upon startup.
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
        await db.query(createTableQuery); 
        console.log("PostgreSQL table 'analyses' ensured.");
    } catch (e) {
        console.error('FATAL ERROR: Could not ensure analyses table exists:', e);
        throw e; 
    }
}

/**
 * Saves a new analysis result to the database (CREATE).
 * @param {object} analysisResult - The result object from the Python script.
 * @returns {Promise<number|null>} The ID of the newly created row, or null on failure.
 */
async function saveAnalysis(analysisResult) {
    if (!analysisResult) return null;
    
    try {
        const patternsData = analysisResult.patterns || []; 
        const summaryText = analysisResult.summary || 'Analysis complete. Review the data for patterns.';
        
        const queryText = `
            INSERT INTO analyses (filename, duration, analysis_count, patterns, summary)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        
        const values = [
            analysisResult.filename,
            analysisResult.duration,
            analysisResult.analysis_count,
            // JSONB requires the data to be stringified
            JSON.stringify(patternsData), 
            summaryText 
        ];

        const res = await db.query(queryText, values);
        console.log(`Analysis successfully saved with ID: ${res.rows[0].id}`);
        return res.rows[0].id;

    } catch (e) {
        console.error("Critical Error saving analysis to Neon:", e);
        // Throw the error so the controller can catch it and display a proper failure message
        throw e;
    }
}

/**
 * Retrieves an analysis result by ID (READ).
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
        
        const res = await db.query(queryText, [id]);

        if (res.rows.length > 0) {
            const data = res.rows[0];
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

/**
 * Updates an analysis result's summary (UPDATE).
 * @param {number} id - The ID of the analysis to update.
 * @param {string} newSummary - The new summary text.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function updateAnalysisSummary(id, newSummary) {
    try {
        const queryText = `
            UPDATE analyses
            SET summary = $1
            WHERE id = $2
            RETURNING id;
        `;
        const res = await db.query(queryText, [newSummary, id]);
        
        // Check if any row was actually updated
        return res.rowCount > 0;
    } catch (e) {
        console.error("Error updating analysis summary:", e);
        return false;
    }
}

/**
 * Deletes an analysis result by ID (DELETE).
 * @param {number} id - The ID of the analysis to delete.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function deleteAnalysis(id) {
    try {
        const queryText = `
            DELETE FROM analyses
            WHERE id = $1
            RETURNING id;
        `;
        const res = await db.query(queryText, [id]);
        
        // Check if any row was actually deleted
        return res.rowCount > 0;
    } catch (e) {
        console.error("Error deleting analysis:", e);
        return false;
    }
}


// Export all model functions
module.exports = {
    saveAnalysis,
    getAnalysisById,
    updateAnalysisSummary,
    deleteAnalysis,
    initializeDatabase 
};