const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// --- Multer Configuration ---
const UPLOADS_DIR = path.join(__dirname, '..', 'analysis_scripts', 'uploads');

// Ensure the upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR); 
    },
    filename: (req, file, cb) => {
        // Create a unique filename to prevent clashes
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

// --- Routes ---

// 1. Home Page / Upload Form
router.get('/', (req, res) => {
    res.render('upload'); 
});

// 2. File Upload and Analysis Execution (The Core Route)
router.post('/analysis', upload.single('audioFile'), analysisController.handleUpload);

// 3. View Results
router.get('/analysis/:id', analysisController.getAnalysisResults);

// Placeholder for a generic error page (required by controller error paths)
router.get('/error', (req, res) => {
    res.render('error', { message: 'An unexpected error occurred.' });
});

module.exports = router;