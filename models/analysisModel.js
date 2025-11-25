const { getFirestore, doc, addDoc, collection, getDoc } = require('firebase/firestore');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithCustomToken, signInAnonymously } = require('firebase/auth');

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase App
let app;
let db;
let auth;
let userId = 'anonymous'; // Default user ID until authenticated

if (Object.keys(firebaseConfig).length > 0) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
    } catch (e) {
        console.error("Firebase initialization failed:", e);
    }
} else {
    console.warn("Firebase config not available. Database operations will be mocked.");
}

/**
 * Ensures Firebase is authenticated and sets the user ID.
 * Must be called before any database operation.
 */
async function ensureAuth() {
    if (!auth) return; // Skip if Firebase is not initialized

    if (auth.currentUser) {
        userId = auth.currentUser.uid;
        return;
    }

    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            // Sign in anonymously if no custom token is provided
            await signInAnonymously(auth);
        }
        userId = auth.currentUser.uid;
        console.log(`Firebase authenticated. User ID: ${userId}`);
    } catch (error) {
        console.error("Firebase authentication failed:", error);
    }
}

/**
 * Saves a new analysis result to the database.
 * @param {object} analysisResult - The result object from the Python script.
 * @returns {string|null} The ID of the newly created document, or null on failure.
 */
async function saveAnalysis(analysisResult) {
    if (!db) return null; // Prevent execution if DB is not ready

    await ensureAuth();

    try {
        // Python output uses the key 'patterns' for the data array.
        // We ensure we access the correct key from the result object.
        const patternsData = analysisResult.patterns || []; 
        
        // Firestore path for public data: /artifacts/{appId}/public/data/analyses
        const analysisCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'analyses');

        const docRef = await addDoc(analysisCollectionRef, {
            filename: analysisResult.filename,
            duration: analysisResult.duration,
            analysis_count: analysisResult.analysis_count,
            patterns: JSON.stringify(patternsData), 
            userId: userId,
            createdAt: new Date()
        });
        
        console.log("Analysis successfully saved with ID: ", docRef.id);
        return docRef.id;

    } catch (e) {
        console.error("Error saving analysis to Firestore:", e);
        return null;
    }
}

/**
 * Retrieves an analysis result by ID.
 * @param {string} id - The document ID.
 * @returns {object|null} The analysis data, or null if not found.
 */
async function getAnalysisById(id) {
    if (!db) return null;
    await ensureAuth();
    
    try {
        const analysisCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'analyses');
        const docRef = doc(analysisCollectionRef, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Parse the JSON string back into a JavaScript object/array
            data.patterns = JSON.parse(data.patterns); 
            return {
                id: docSnap.id,
                ...data
            };
        } else {
            return null;
        }
    } catch (e) {
        console.error("Error fetching analysis from Firestore:", e);
        return null;
    }
}

module.exports = {
    saveAnalysis,
    getAnalysisById
};