const fetch = require('node-fetch');

// Location to fetch weather for (defaulting to a US city near the user's inferred location)
const DEFAULT_CITY = 'Reidsville, NC, US';

/**
 * Fetches current weather data from OpenWeatherMap API.
 * @returns {Promise<object|null>} Weather data or null on failure.
 */
async function getCurrentWeather(city = DEFAULT_CITY) {
    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
        console.error("WEATHER_API_KEY is not set in environment variables.");
        return { error: "API Key Missing" };
    }
    
    // Use imperial units for Farenheit temperatures
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=imperial`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error(`OpenWeatherMap API returned status: ${response.status}`);
            return { error: `Weather data not available for ${city}.` };
        }

        const data = await response.json();
        
        // Extract only the necessary data for the view
        return {
            city: data.name,
            country: data.sys.country,
            temperature: data.main.temp,
            description: data.weather[0].description,
            icon: data.weather[0].icon // Icon code for weather display
        };

    } catch (e) {
        console.error("Error fetching weather data:", e.message);
        return { error: `Network error: ${e.message}` };
    }
}

module.exports = {
    getCurrentWeather
};