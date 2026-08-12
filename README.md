# voila
AI-Powered Social Support Analytics &amp; Voice-of-Customer Intelligence Platform  The proposed solution is an AI-powered analytics platform that transforms large volumes of raw social-media customer-support conversations into actionable Voice-of-Customer insights. The system reconstructs customer-support conversations and uses NLP/ML models 

## Getting Started

This repository includes a sample React frontend, a FastAPI backend, example dataset files, and model training notes.

### Backend

1. Install Python dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Start the backend server:
   ```bash
   uvicorn backend.app:app --reload
   ```
3. The API will be available at `http://127.0.0.1:8000`

### Frontend

1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the React development server:
   ```bash
   npm run dev
   ```
3. Open the app in the browser at `http://127.0.0.1:5173`

### Sample Data

- `database/sample_data.json` contains example conversation JSON structure.
- `dataset/sample_dataset.csv` contains sample labeled utterances for model training.
- `model/sample_training_notes.md` explains how to use the dataset and where to store model artifacts.

### Notes

- The frontend fetches sample items from `http://127.0.0.1:8000/items`.
- Keep generated files and virtual environment folders out of source control using `.gitignore`.

