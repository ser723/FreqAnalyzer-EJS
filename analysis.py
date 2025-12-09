import sys
import json
import librosa
import numpy as np
import os
import warnings

# Configuration
# Set the time interval for analysis in seconds
ANALYSIS_INTERVAL = 0.1

def analyze_audio(audio_path, original_filename):
    warnings.filterwarnings('ignore', category=FutureWarning)
    
    try:
        # Load the audio file
        # sr=None tells librosa to use the file's native sample rate
        y, sr = librosa.load(audio_path, sr=None)
        
        # Calculate the duration in seconds
        duration = librosa.get_duration(y=y, sr=sr)
        
        # Calculate the fundamental frequency (pitch contour)
        # Using PYIN for robust pitch tracking
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y, 
            fmin=librosa.note_to_hz('C2'), 
            fmax=librosa.note_to_hz('C6'), 
            sr=sr,
            frame_length=2048 # Increased frame length for better pitch resolution
        )

        # Identify the time stamps corresponding to the f0 estimates
        times = librosa.times_like(f0)
        
        patterns = []
        analysis_count = 0
        
        # Only saving data points where a pitch was confidently detected (voiced_flag is True)
        for i, time_s in enumerate(times):
            if voiced_flag[i]:
                # Find the dominant frequency (pitch) at this time stamp
                dominant_hz = f0[i]
                
                patterns.append({
                    "time_s": round(float(time_s), 2),
                    "dominant_hz": round(float(dominant_hz), 2)
                })
                analysis_count += 1
        
        # Prepare the final JSON output
        result = {
            "success": True,
            "filename": original_filename,
            "duration": round(float(duration), 2),
            "analysis_count": analysis_count,
            "patterns": patterns
        }
        
        return json.dumps(result, indent=None)

    except Exception as e:
        # Catch any other runtime error (e.g., file not found, bad format)
        error_result = {
            "success": False,
            "error": f"Analysis failed: {str(e)}",
            "filename": original_filename
        }
        return json.dumps(error_result, indent=None)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No audio file path provided."}))
        sys.exit(1)
        
    audio_file_path = sys.argv[1]
    
    # Extract the original filename from the full path for the output
    original_filename = os.path.basename(audio_file_path)

    # The file path passed to Python is the full temporary path from Multer
    output_json = analyze_audio(audio_file_path, original_filename)
    
    # Print the result to STDOUT so Node.js can capture it
    print(output_json)
    
    # Note: Do NOT exit with a non-zero code here if you've already printed a success:false JSON, 
    # as the Node.js controller will handle the JSON error internally.
    # The 'close' event is enough to stop the process.