const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const analysisModel = require('../models/analysisModel'); // Import all model functions

// --- Configuration ---
const PYTHON_SCRIPT_PATH = path.join(__dirname, '..', 'analysis_scripts', 'analysis.py');
const UPLOADS_DIR = path.join(__dirname, '..', 'analysis_scripts', 'uploads');
const PYTHON_EXECUTABLE = path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe'); // Path to venv Python

/**
 * Renders the main upload form. (GET /)
 */
exports.showUploadForm = (req, res) => {
    res.render('index', { title: 'Audio Frequency Analyzer' });
};


/**
 * Runs the Python analysis script and saves the result to the DB. (POST /analyze)
 * This is the CREATE operation.
 */
exports.runAnalysis = (req, res) => {
    // 1. Check if a file was actually uploaded
    if (!req.file) {
        return res.status(400).render('error', { message: 'No audio file uploaded.' });
    }

    const audioPath = req.file.path;
    const originalFilename = req.file.originalname;

    console.log(`Starting analysis for: ${originalFilename} using interpreter: ${PYTHON_EXECUTABLE}`);

    // 2. Spawn the Python process
    const pythonProcess = spawn(PYTHON_EXECUTABLE, [PYTHON_SCRIPT_PATH, audioPath]);
    let pythonOutput = '';
    let pythonError = '';

    // Capture stdout (the JSON result)
    pythonProcess.stdout.on('data', (data) => {
        pythonOutput += data.toString();
    });

    // Capture stderr (any Python errors or warnings)
    pythonProcess.stderr.on('data', (data) => {
        pythonError += data.toString();
    });

    // 3. Handle process close/exit
    pythonProcess.on('close', async (code) => {
        // Always attempt to delete the temporary file after processing
        fs.unlink(audioPath, (err) => {
            if (err) console.error('Error deleting temp file:', err);
            else console.log(`Deleted temp file: ${audioPath}`);
        });
        
        // Check for Python script execution failure
        if (code !== 0) {
            console.error(`Python script failed with code ${code}. Error: ${pythonError}`);
            return res.status(500).render('error', { 
                message: 'Analysis script failed.', 
                details: `Error Code: ${code}. Output: ${pythonError.substring(0, 300)}...` 
            });
        }
        
        // 4. Process the JSON output
        try {
            const result = JSON.parse(pythonOutput);

            // Check if the Python script explicitly reported a failure (e.g., file not supported)
            if (result.success === false) {
                 return res.status(500).render('error', { 
                    message: 'Analysis failed internally.', 
                    details: `Python reported: ${result.error || 'Unknown error'}` 
                });
            }

            // 5. Save the result to the PostgreSQL database
            const newId = await analysisModel.saveAnalysis({
                ...result,
                filename: originalFilename // Use original name for storage
            });

            if (newId) {
                // Success: Redirect to the results page
                res.redirect(`/analysis/${newId}`);
            } else {
                // Database save failed
                return res.status(500).render('error', { 
                    message: 'Analysis succeeded, but database save failed.' 
                });
            }

        } catch (e) {
            console.error('Critical Node.js Processing Error (JSON parsing or redirect):', e);
            console.error('Raw Python Output:', pythonOutput);
            return res.status(500).render('error', { 
                message: 'Internal processing error after analysis.',
                details: e.message 
            });
        }
    });

    // Handle initial process spawn errors (e.g., Python not found)
    pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        return res.status(500).render('error', { 
            message: 'Failed to start analysis tool.', 
            details: `Check Python venv/executable path. Error: ${err.message}` 
        });
    });
};


/**
 * Retrieves and renders a single analysis result. (GET /analysis/:id)
 * This is the READ operation.
 */
exports.getAnalysis = async (req, res) => {
    const analysisId = req.params.id;
    try {
        const data = await analysisModel.getAnalysisById(analysisId);
        
        if (data) {
            // Success: Render the results page
            res.render('results', { analysis: data, title: `Analysis ID: ${analysisId}` });
        } else {
            // Not Found
            res.status(404).render('error', { message: `Analysis ID ${analysisId} not found.` });
        }
    } catch (e) {
        console.error(`Error fetching analysis ${analysisId}:`, e);
        res.status(500).render('error', { message: "Database query error." });
    }
};


/**
 * Updates the summary field of an existing analysis record. (PATCH /analysis/:id)
 * This is the UPDATE operation.
 */
exports.updateAnalysis = async (req, res) => {
    const analysisId = req.params.id;
    const { summary } = req.body; // Expects JSON body: { "summary": "..." }

    if (!summary || typeof summary !== 'string') {
        return res.status(400).json({ success: false, message: "Summary text is required for update." });
    }

    try {
        // Call the new model function to update the record
        const success = await analysisModel.updateAnalysisSummary(analysisId, summary);

        if (success) {
            // 200 OK with success message
            res.json({ success: true, message: `Analysis ${analysisId} summary updated.` });
        } else {
            // Record not found or update failed
            res.status(404).json({ success: false, message: `Analysis ${analysisId} not found or update failed.` });
        }
    } catch (e) {
        console.error("Update failed:", e);
        // Send internal server error
        res.status(500).json({ success: false, message: "Server error during update." });
    }
};


/**
 * Deletes an analysis record from the database. (DELETE /analysis/:id)
 * This is the DELETE operation.
 */
exports.deleteAnalysis = async (req, res) => {
    const analysisId = req.params.id;
    
    try {
        // Call the new model function to delete the record
        const success = await analysisModel.deleteAnalysis(analysisId);

        if (success) {
            // Success: 204 No Content is standard for successful deletion
            res.status(204).end(); 
        } else {
            // Record not found
            res.status(404).json({ success: false, message: `Analysis ${analysisId} not found.` });
        }
    } catch (e) {
        console.error("Delete failed:", e);
        // Send internal server error
        res.status(500).json({ success: false, message: "Server error during deletion." });
    }
};