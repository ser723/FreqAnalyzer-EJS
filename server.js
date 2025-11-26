const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();
// Explicitly check for the __FIREBASE_CONFIG 
// and expose it as the expected global variable __firebase_config

if (process.env.__FIREBASE_CONFIG) {
    global.__firebase_config = process.env.__FIREBASE_CONFIG;
} else if (process.env.FIREBASE_CONFIG) {
    // Fallback for systems that drop the underscores or rename it
    global.__firebase_config = process.env.FIREBASE_CONFIG;
}
    global.__app_id = '1:681695652598:web:3447d3c3df787026345ad7'; // from process.env 

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


// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});