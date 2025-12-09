const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// --- Multer Configuration ---
// Define the directory for temporary uploads
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
        // Create a unique filename using a timestamp + original name
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

// --- Routes (Full CRUD) ---

// 1. Main Upload Form (GET /) - READ (list/home)
router.get('/', analysisController.showUploadForm); 

// 2. File Upload and Analysis Execution (POST /analyze) - CREATE
// Uses multer middleware to handle file upload before calling the controller
router.post('/analyze', upload.single('audioFile'), analysisController.runAnalysis);

// 3. Retrieve Analysis Results by ID (GET /analysis/:id) - READ (single item)
router.get('/analysis/:id', analysisController.getAnalysis); 

// 4. Update Analysis Summary (PATCH /analysis/:id) - UPDATE
// This route will update a specific field (e.g., the summary/notes) for an analysis record.
router.patch('/analysis/:id', analysisController.updateAnalysis);

// 5. Delete Analysis Record (DELETE /analysis/:id) - DELETE
// This route permanently removes an analysis record from the database.
router.delete('/analysis/:id', analysisController.deleteAnalysis);

// 6. WEATHER API  ( GET /api/weather) - READ (weather data)
router.get('/api/weather', analysisController.getWeatherApi);

// 6. Generic Error Page
router.get('/error', (req, res) => {
    res.render('error', { message: 'An unexpected error occurred. Please try again.' });
});


module.exports = router;