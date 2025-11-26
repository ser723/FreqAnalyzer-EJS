const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();

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