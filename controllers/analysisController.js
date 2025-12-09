const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const analysisModel = require('../models/analysisModel'); 
const weatherService = require('../api/weatherService'); // <-- Dependency

// --- Configuration ---
const PYTHON_SCRIPT_PATH = path.join(__dirname, '..', 'analysis_scripts', 'analysis.py');
const PYTHON_EXECUTABLE = path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe');

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

            // Check if the Python script explicitly reported a failure
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
 * This function handles the main page load.
 */
exports.getAnalysis = async (req, res) => {
    const analysisId = req.params.id;
    try {
        const analysisData = await analysisModel.getAnalysisById(analysisId);
        
        if (analysisData) {
            // Render the page. Weather data is now fetched via AJAX on the client side.
            res.render('results', { 
                analysis: analysisData, 
                title: `Analysis ID: ${analysisId}` 
            });
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
 * Dedicated API endpoint to return only weather data (GET /api/weather)
 * This is the function that was missing the 'exports.' prefix.
 */
exports.getWeatherApi = async (req, res) => { // <-- CRITICAL: Must use 'exports.'
    try {
        const weatherData = await weatherService.getCurrentWeather();
        // Return JSON response directly
        res.json(weatherData); 
    } catch (e) {
        console.error("Error fetching weather for API endpoint:", e);
        res.status(500).json({ error: "Failed to retrieve weather data from external API." });
    }
};

/**
 * Updates the summary field of an existing analysis record. (PATCH /analysis/:id)
 * This is the UPDATE operation.
 */
exports.updateAnalysis = async (req, res) => {
    const analysisId = req.params.id;
    const { summary } = req.body; 

    if (!summary || typeof summary !== 'string') {
        return res.status(400).json({ success: false, message: "Summary text is required for update." });
    }

    try {
        const success = await analysisModel.updateAnalysisSummary(analysisId, summary);

        if (success) {
            res.json({ success: true, message: `Analysis ${analysisId} summary updated.` });
        } else {
            res.status(404).json({ success: false, message: `Analysis ${analysisId} not found or update failed.` });
        }
    } catch (e) {
        console.error("Update failed:", e);
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
        const success = await analysisModel.deleteAnalysis(analysisId);

        if (success) {
            res.status(204).end(); 
        } else {
            res.status(404).json({ success: false, message: `Analysis ${analysisId} not found.` });
        }
    } catch (e) {
        console.error("Delete failed:", e);
        res.status(500).json({ success: false, message: "Server error during deletion." });
    }
};