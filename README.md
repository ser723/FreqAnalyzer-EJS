# FreqAnalyzer-EJS

Deployed Site: https://freqanalyzer-ejs.onrender.com

This project provides a backend server for analyzing audio files for specific sound patterns. It uses a Python script for the heavy lifting (audio analysis) and a Node.js/Express server for API routing, file handling, and database persistence.

The persistence layer uses PostgreSQL (via the pg library), designed to connect with cloud services like Neon.

# 🚀 Getting Started

To run this application, you must correctly configure both the Node.js (JavaScript) and Python environments.

# 1. Prerequisite Checks

Ensure you have the following installed:

Node.js (LTS version)

Python 3.x

A running PostgreSQL database instance (e.g., a Neon project).

# 2. Node.js Setup (Backend/API)

The server requires the following dependencies:

Package

Purpose

express

Main web server framework.

dotenv

Loads environment variables from .env file.

pg

PostgreSQL client for database connection.

ejs

Templating engine for views.

multer

Middleware for handling file uploads.

# Installation:

npm install express dotenv pg ejs multer


# 3. Python Setup (Analysis Script)

The audio analysis script (analysis.py) relies on standard scientific and audio processing libraries.

Installation (Required):

Create and Activate Virtual Environment: This step is crucial for isolating Python dependencies and resolving common script path errors.

# Create the environment
python3 -m venv venv

# Activate the environment (Linux/macOS)
source venv/bin/activate
# OR (Windows Command Prompt)
# venv\Scripts\activate


Install Python Libraries: Install the necessary packages. Ensure you have a requirements.txt file, or run the command below:

# Ensure your venv is active before running this command
pip install librosa numpy pandas scipy


# 4. Environment Configuration

The server initialization fails if the database connection string is not set.

Action: Create a file named .env in your project root directory and populate it with your database credentials and port.

# .env
# Replace the placeholder with your actual Neon/PostgreSQL connection string.
# The 'sslmode=require' parameter ensures a secure connection.
DATABASE_URL="postgres://user:password@host.neon.tech/database_name?sslmode=require"

# Port on which the server will run
PORT=3000


# 5. Running the Application

Once all dependencies are installed and the .env file is configured:

Start the Express server:

node server.js


The server will first call analysisModel.initializeDatabase() to ensure the analyses table exists, and then it will start listening on the configured port.

PostgreSQL client connected successfully.
PostgreSQL table 'analyses' ensured.
Server listening on port 3000
Open http://localhost:3000 in your browser


# 🧩 Core Application Files

File

Role

Status

server.js

Main entry point. Initializes database, loads environment variables, and starts the Express server.

Stable

models/db.js

PostgreSQL Connection Pool. Manages the pg connection pool, handles SSL, and exports a simple query function.

Finalized

models/analysisModel.js

Data Access Layer. Contains the logic for initializeDatabase(), saveAnalysis(), and getAnalysisById(). Uses JSON.stringify for the patterns field.

Finalized

routes/analysisRoutes.js

Defines API endpoints (e.g., /analyze, /analysis/:id).

Stable

controllers/analysisController.js

Business Logic. Handles file upload, calls the Python analysis script, and manages the database save/fetch via analysisModel.js.

Needs testing

analysis.py

Python Script. The actual audio processing logic. Requires librosa and other scientific packages.

Needs testing


# Project Reflection: FreqAnalyzer-EJS

This project developed a full-stack web application designed to analyze audio files and visualize their dominant frequency contours over time, using a combination of Node.js/Express, Python analysis scripts, and a PostgreSQL database.

# 1. Challenges and Learnings

The most significant challenges encountered during this project were related to integration and environment management, specifically the interoperability between Node.js and Python, and establishing persistent database connectivity.

# A. Cross-Language Communication and Error Handling

The core functionality relies on successfully spawning a Python script from the Express server using child_process.

The Challenge: Establishing the correct execution path for the Python interpreter (especially when using a virtual environment, e.g., venv/Scripts/python.exe on Windows) and ensuring the data flow between the two languages was reliable. Initial attempts often resulted in the Python script failing silently or the Node.js process throwing an error during JSON parsing.

The Learning: We learned the critical importance of robust error handling in the analysisController.js. This involved:

Explicitly directing the child_process to use the absolute path of the Python interpreter inside the virtual environment.

Capturing both stdout (for successful JSON output) and stderr (for Python errors/tracebacks) to provide meaningful feedback to the user.

# B. Database Integration and Persistence

Migrating the storage from mock data to a persistent PostgreSQL database introduced environmental and structural hurdles.

The Challenge: We faced recurring Error: Cannot find module 'pg' and connection failures. Additionally, ensuring the complex analysis data (the array of frequency patterns) was correctly saved to and retrieved from a PostgreSQL JSONB column was non-trivial.

The Learning: This forced us to solidify the architectural pattern:

Creating the dedicated models/db.js file to handle the PostgreSQL connection pool, which is the correct pattern for high-performance server applications.

Using the dotenv package correctly to ensure the DATABASE_URL is available before any database operation begins in server.js's startup sequence.

Implementing JSON.stringify() in the analysisModel.saveAnalysis function to correctly serialize the data for PostgreSQL's JSONB column.

# 2. Areas of Pride

# A. Functional Full-Stack Pipeline

I am most proud of successfully creating the end-to-end pipeline. The application flow is seamless and robust:

<img width="791" height="37" alt="image" src="https://github.com/user-attachments/assets/d5cb0e86-e18a-4230-94e0-3a2dcb094e28" />

This demonstrates a strong command of Express routing, middleware (Multer), and multi-process architecture.

# B. Data Visualization and Responsiveness

The presentation of the results in the EJS template is a highlight. By using a robust charting library, the complex frequency data is immediately understandable to the user (as shown in the completed analysis view). Furthermore, the application is designed with Tailwind CSS to be fully responsive, ensuring a consistent user experience across mobile and desktop devices.

# 3. Future Features and Next Steps

To move beyond the Minimum Viable Product (MVP), the following features are planned:

User Authentication (Required for Full Project): Implement basic login/logout using a service like Firebase or dedicated PostgreSQL tables to allow users to save and view their personal analysis history.

Comparative Analysis: Add the ability for a user to select two previous analysis results and display their frequency contours on the same chart, enabling direct comparison of sound files.

Real-Time Progress Indicator: Replace the current waiting screen with a WebSocket-based progress indicator to update the user as the Python script progresses through the analysis steps, improving perceived performance for large files.

Audio Playback: Integrate a simple HTML audio player on the results page, allowing the user to play the original uploaded file while viewing the corresponding frequency graph.

