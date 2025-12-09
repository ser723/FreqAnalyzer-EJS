const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const analysisRoutes = require('./routes/analysisRoutes'); // <--- 1. IMPORT ROUTES

// Middleware setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// Middleware to parse JSON bodies (needed for future API updates)
app.use(express.json());

// Set up static file serving (for CSS, client-side JS, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Use the analysis routes
app.use('/', analysisRoutes); // <--- 2. USE ROUTES (Handles /analysis/:id, /api/weather, etc.)

// Basic index route (handled by the controller, but adding a fallback)
app.get('/', (req, res) => {
    // Assuming analysisController.showUploadForm handles this route
    res.redirect('/upload'); 
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});