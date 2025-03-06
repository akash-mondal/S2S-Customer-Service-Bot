
## Installation and Setup

### Backend Setup

1. Navigate to the Backend directory:
   ```bash
   cd Backend
   ```

2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file with the following API keys:
   ```
   GROQ_API_KEY=your_groq_api_key
   LLAMAPARSE_API_KEY=your_llamaparse_api_key
   COHERE_API_KEY=your_cohere_api_key
   ```

4. Start the chatbot server:
   ```bash
   hypercorn --reload --bind 0.0.0.0:8000 stella:app
   ```

### File Uploader Setup

Once the backend is running:

1. Start the file uploader application:
   ```bash
   streamlit run manager.py
   ```

2. Create a collection name in the interface
3. Upload files to your collection

### Frontend Setup

1. Navigate to the Frontend directory from the main folder:
   ```bash
   cd Frontend
   ```

2. Install the necessary npm packages:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following API keys:
   ```
   REACT_APP_GROQ_API_KEY=your_groq_api_key
   REACT_APP_ELEVENLABS_API_KEY=your_elevenlabs_api_key
   REACT_APP_TOGETHERAI_API_KEY=your_togetherai_api_key
   ```

4. Start the frontend application:
   ```bash
   npm start
   ```

## Congratulations!

If you've followed all the steps correctly, your AI Assistant should now be running successfully.

## System Requirements

- Python 3.x
- Node.js and npm
- Internet connection for API access
