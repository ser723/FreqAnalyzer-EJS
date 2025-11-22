import sys
import json
import librosa
import numpy as np
import os

# Configuration
# Set the time interval for analysis in seconds
# Sample every 0.1 seconds for a detailed analysis of pitch contours
ANALYSIS_INTERVAL = 0.1

def analyze_audio_file(audio_path):
    """
    Loads on audio file and performs a dominant frequency analysis.
    
    Args:
        audio_path (str): The full path to the audio file.

    Returns:
        dict: A dictionary containing the analysis results.
    """
    try:
        # 1. Load the audio file
        # sr=None preserves the original sample rate, which is a good practice for analysis.
        y, sr = librosa.load(audio_path, sr=None)

        # 2. Calculate basis metadata
        duration = librosa.get_duration(y=y, sr=sr)

        # 3. Frequency Analysis (Simplified Pitch for Tracking for MVP)
        # piptrack detects pitches and their magnitudes per short-time frame.
        pitches, magnitudes = librosa.core.piptrack(y=y, sr=sr)

        analysis_data = []

        # Determine how many frames (samples) make up the ANALYSIS_INTERVAL
        # Convert seconds to frames for iteration
        frames_per_interval = int(librosa.time_to_frames(ANALYSIS_INTERVAL, sr=sr))

        # Iterate over the pitch frames, skipping according to the analysis interval
        for i in range (0, pitches.shape[1], frames_per_interval):
            # Find the peak magnitude in the current frame
            index = magnitudes[:, i].argmax()
            pitch = pitches[index, i]

            # Convert from index back to time in seconds
            time_s = librosa.frames_to_time(i, sr=sr)

            #Only record frequencies greater than a certain threshold to avoid noise (50 Hz)
            if pitch > 50:
                analysis_data.append({
                    "time_s": round(float(time_s), 2),
                    "dominant_hz": round(float(pitch), 2)
                })

        # 4. Final Results Dictionary
        results = {
            "suscess": True,
            "filename": os.path.basename(audio_path),
            "duration": round(duration,2),
            "analysis_count": len(analysis_data),
            "patterns": analysis_data
        }

        return results
    
    except Exception as e:
        #If any step fails( file not found, unsupported format, etc)
        # return an error message.
        return {
            "success": False,
            "error": f"Analysis failed: {str(e)}",
            "filename": os.path.basename(audio_path) if audio_path else "Unknown"
        }
    
# Main execution
if __name__ == "__main__":
    # First argument (sys.argv[0]) is the script name itself.
    #Except the file path to be the second argument(sys.argv[1])
    audio_file_path = None

    if len(sys.argv) < 2:
          error_msg = {"success": False, "error": "Missing audio file path argument."}
          print(json.dumps(error_msg), file=sys.stderr)
          sys.exit(1)

    audio_file_path = sys.argv[1]

     # Run the analysis
    final_result = analyze_audio_file(audio_file_path)

    # Print the result as a single line of JSON to STDOUT
    print(json.dumps(final_result))
    
    # Exit with code 0 if successful, or 1 if there was a fatal error
    if not final_result.get("success", True):
        sys.exit(1)
    else:
        sys.exit(0)