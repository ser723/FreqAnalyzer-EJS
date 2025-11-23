const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const analysisModel = require('../models/analysisModel'); 

// Determines the path to the VIRTUAL ENVIRONMENT Python ---
// Use path.join to create the most robust path for Windows/Node.js compatibility.
// Explicitly targeting 'python.exe' inside the venv/Scripts directory.
const VENV_PYTHON_PATH = path.join(process.cwd(), 'venv', 'Scripts', 'python.exe');

/**
 * Handles file upload, executes the Python analysis script,
 * saves results to the database, and redirects the user.
 */
async function handleUpload(req, res) {
    if (!req.file) {
        return res.status(400).render('error', { message: 'No file uploaded.' });
    }
    
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    
    // Path to the Python script relative to the project root
    const scriptPath = path.join(__dirname, '..', 'analysis_scripts', 'analysis.py');

    //Check for Python Executable
    if (!fs.existsSync(VENV_PYTHON_PATH)) {
        const errorMsg = `Critical Error: Python executable not found at ${VENV_PYTHON_PATH}. Please ensure your virtual environment is created and activated (venv\\Scripts\\activate) and the path is correct.`;
        console.error(errorMsg);
        // Clean up the uploaded file before exiting
        fs.unlink(filePath, (err) => { if (err) console.error("Failed to delete temp file during error:", err); });
        return res.status(500).render('error', { 
            message: errorMsg 
        });
    }
    
    console.log(`Starting analysis for: ${originalName} using interpreter: ${VENV_PYTHON_PATH}`);
    
    // EXECUTE PYTHON SCRIPT USING VENV PATH 
    //Using explicit .exe suffix and the fully constructed path.
    const pythonProcess = spawn(VENV_PYTHON_PATH, [scriptPath, filePath]);

    let rawData = '';
    let hasError = false;

    // 1. Capture JSON output from Python's STDOUT
    pythonProcess.stdout.on('data', (data) => {
        rawData += data.toString();
    });

    // 2. Capture error messages from Python's STDERR
    pythonProcess.stderr.on('data', (data) => {
        const errorText = data.toString();
        console.error(`Python STDERR: ${errorText}`);
        
        // If librosa/numpy import fails, that's the real error
        if (errorText.includes('No module named') || errorText.includes('ImportError')) {
             console.error("CRITICAL PYTHON ERROR: librosa/numpy failed to import. VENV is not being used correctly.");
        }

        // Set error flag
        hasError = true; 
    });

    // 3. Process the results when the Python script finishes
    pythonProcess.on('close', async (code) => {
        
        // --- CLEANUP ---
        fs.unlink(filePath, (err) => {
            if (err) console.error("Failed to delete temp file:", err);
        });
        
        // Check for non-zero exit code OR an error flag from STDERR
        if (code !== 0 || hasError) {
            console.error(`Analysis script failed with code ${code}. Raw output: ${rawData}`);
            
            // Log the full command used for debugging purposes
            console.error(`Full command executed: ${VENV_PYTHON_PATH} ${scriptPath} ${filePath}`);
            
            //Parse any error JSON that might have been printed to STDOUT/STDERR
            try {
                const errorResult = JSON.parse(rawData);
                return res.status(500).render('error', { 
                    message: `Analysis failed: ${errorResult.error || 'Check server logs.'}` 
                });
            } catch {
                return res.status(500).render('error', { 
                    message: `Analysis script failed. Code: ${code}. Check server console for Python errors.` 
                });
            }
        }
        
        // SUCCESS PATH
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
            console.error("Critical Node.js Processing Error (JSON parsing or redirect):", e);
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