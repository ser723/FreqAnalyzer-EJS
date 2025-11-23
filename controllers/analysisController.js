const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const analysisModel = require('../models/analysisModel'); 

//Determine the path for the Virtual Environment's Python executable
const VENV_PYTHON_PATH = path.join(process.cwd(), 'venv', 'Scripts', 'python');

/**
 * Handles file upload, executes the Python analysis script,
 * saves results to the database, and redirects the user.
 */
async function handleUpload(req, res) {
    if (!req.file) {
        // This should not happen if Multer is configured correctly in the route
        return res.status(400).render('error', { message: 'No file uploaded.' });
    }
    
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    
    // Path to the Python script relative to the project root
    const scriptPath = path.join(__dirname, '..', 'analysis_scripts', 'analysis.py');

    console.log(`Starting analysis for: ${originalName} using interpreter: ${VENV_PYTHON_PATH}`);
    
    // --- EXECUTE PYTHON SCRIPT ---
    // Note: We use 'python' or 'python3' based on what worked in your terminal.
    // Since you used 'python' successfully in PowerShell, we'll start with that.
    const pythonProcess = spawn(VENV_PYTHON_PATH, [scriptPath, filePath]);

    let rawData = '';
    let hasError = false;

    // 1. Capture JSON output from Python's STDOUT
    pythonProcess.stdout.on('data', (data) => {
        rawData += data.toString();
    });

    // 2. Capture error messages from Python's STDERR
    pythonProcess.stderr.on('data', (data) => {
        // Output errors to console, but don't treat them as fatal until the 'close' event
        console.error(`Python STDERR: ${data.toString()}`);
        hasError = true;
    });

    // 3. Process the results when the Python script finishes
    pythonProcess.on('close', async (code) => {
        
        // --- CLEANUP ---
        // Delete the temporary file after processing, regardless of success.
        fs.unlink(filePath, (err) => {
            if (err) console.error("Failed to delete temp file:", err);
        });
        
        if (code !== 0 || hasError) {
            console.error(`Analysis script failed with code ${code}. Raw output: ${rawData}`);
            //parse any error JSON that might have been printed to STDOUT/STDERR
            try {
                const errorResult = JSON.parse(rawData);
                return res.status(500).render('error', { 
                    message: `Analysis failed: ${errorResult.error || 'Check server logs.'}` 
                });
            } catch {
                return res.status(500).render('error', { 
                    message: `Analysis script failed. Code: ${code}` 
                });
            }
        }
        
        // --- SUCCESS PATH ---
        try {
            const analysisResult = JSON.parse(rawData);
            
            if (!analysisResult.success) {
                 return res.status(500).render('error', { 
                    message: `Analysis reported error: ${analysisResult.error}` 
                });
            }

            // 4. Save to Database
            const newAnalysisId = await analysisModel.saveAnalysis(analysisResult);
            
            if (newAnalysisId) {
                // 5. Redirect to the results page
                res.redirect(`/analysis/${newAnalysisId}`);
            } else {
                res.status(500).render('error', { 
                    message: 'Analysis succeeded, but database save failed.' 
                });
            }

        } catch (e) {
            console.error("Critical Node.js Processing Error:", e);
            res.status(500).render('error', { 
                message: 'Internal server error processing analysis results.' 
            });
        }
    });
}


/**
 * Renders the results page by fetching data from the database.
 */
async function getAnalysisResults(req, res) {
    const analysisId = req.params.id;
    
    try {
        const analysis = await analysisModel.getAnalysisById(analysisId);

        if (!analysis) {
            return res.status(404).render('error', { message: `Analysis ID ${analysisId} not found.` });
        }
        
        // Render the results view, passing the retrieved data
        res.render('results', { 
            analysis: analysis 
        });

    } catch (e) {
        console.error("Error fetching analysis:", e);
        res.status(500).render('error', { message: 'Error retrieving analysis results.' });
    }
}


module.exports = {
    handleUpload,
    getAnalysisResults
};