const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();

// --- Database Model Import ---
const analysisModel = require('./models/analysisModel'); // Import the model

// --- Configuration ---
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Routes ---
// The main router handles all application routes
const analysisRoutes = require('./routes/analysisRoutes');
app.use('/', analysisRoutes);

// --- Server Startup Sequence ---
const PORT = process.env.PORT || 3000;

/**
 * Initializes the database structure and starts the server.
 */
async function startServer() {
    try {
        // 1. Initialize Database: Ensure the 'analyses' table exists.
        // This MUST happen before the server starts to handle requests.
        await analysisModel.initializeDatabase();
        
        // 2. Start Express Server
        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
            console.log(`Open http://localhost:${PORT} in your browser`);
        });

    } catch (error) {
        // If DB initialization fails (e.g., connection error), log and exit.
        console.error('FATAL ERROR: Could not initialize database or start server:', error);
        process.exit(1);
    }
}
// Invoke the startup sequence
startServer();