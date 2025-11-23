const { Pool } = require('pg');
require('dotenv').config();

//Initialize PostgreSQL connection strin from .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

/**
 * Saves the analysis result to the PostgreSQL database.
 * analysisData {object} should contain: the JSON object returned by the Python script.
 * {string null} The ID of the newly created analysis recored, or null on failure.
 */
async function saveAnalysis(analysisData) {
    // Storing the compliex 'patterns' array as a JSON string in the DB.
    const patternJson = JSON.stringify(analysisData.patterns);

    const query = `
        INSERT INTO analyses (
            filename,
            duration,
            analysis_count,
            patterns
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id;
    `;

    const values = [
        analysisData.filename,
        analysisData.duration,
        analysisData.analysis_count,
        patternsJson
    ];

    try {
        const result = await pool.query(query, values);
        console.log(`Succefully saved analysis with ID: ${result.rows[0].id}`);
        return result.rows[0].id;
    } catch (error) {
        console.error("Databse error in saveAnalysis:", error);
        return null;
    }
}

/**
 * Retrieves a single analysis record by its ID.
 * {string} id - The ID of the analysis
 * {object null} The anlysis record, or null if not found.
 */
async function getAnalysisById(id) {
    try {
        const query = 'SELECT * FROM analyses WHER id = $1';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        const analysis = result.rows[0];
        // The 'patterns' data is stored as a JSON string (JSONB), so it can be parsed back.
        if (analysis.patterns && typeof analysis.patterns === 'string') {
            analysis.patterns = JSON.parse(analysis.patterns);
        }
        
        return analysis;
    } catch (error) {
        console.error("Database Error in getAnalysisById:", error);
        return null;
    }
}

module.exports = {
    saveAnalysis,
    getAnalysisById
};
