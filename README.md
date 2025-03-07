# Vyoma AI

## 🚀 Revolutionizing Conversational AI & Voice Commerce

Vyoma AI is redefining AI-driven sales and customer engagement through intelligent, real-time voice commerce solutions. Designed for scalability, personalization, and business impact, Vyoma AI transforms every conversation into a potential sale.

---

## 📌 Installation & Setup

### 🔧 Backend Setup
1. **Navigate to the backend directory:**
   ```sh
   cd Backend
   ```
2. **Install required dependencies:**
   ```sh
   pip install -r requirements.txt
   ```
3. **Create a `.env` file** and add the following API keys:
   ```sh
   GROQ_API_KEY=your_groq_api_key
   LLAMAPARSE_API_KEY=your_llamaparse_api_key
   COHERE_API_KEY=your_cohere_api_key
   ```
4. **Start the chatbot server:**
   ```sh
   hypercorn --reload --bind 0.0.0.0:8000 stella:app
   ```

### 📁 File Uploader Setup
Once the backend is running:
1. **Start the file uploader application:**
   ```sh
   streamlit run manager.py
   ```
2. **Create a collection name** in the interface.
3. **Upload files** to your collection.

### 🎨 Frontend Setup
1. **Navigate to the frontend directory:**
   ```sh
   cd Frontend
   ```
2. **Install necessary npm packages:**
   ```sh
   npm install
   ```
3. **Create a `.env` file** and add the following API keys:
   ```sh
   REACT_APP_GROQ_API_KEY=your_groq_api_key
   REACT_APP_ELEVENLABS_API_KEY=your_elevenlabs_api_key
   REACT_APP_TOGETHERAI_API_KEY=your_togetherai_api_key
   ```
4. **Start the frontend application:**
   ```sh
   npm start
   ```

---

## 🎯 System Requirements
- **Python 3.x**
- **Node.js & npm**
- **Internet connection** for API access

---

## 🚀 Vyoma AI – The Future of AI-Driven Sales

### Why Vyoma AI?
💡 **Not just another AI chatbot** – Vyoma AI is a revenue-driven AI engine designed for businesses looking to scale customer engagement and boost conversions through real-time conversational intelligence.

✅ **Real-Time AI Voice Commerce** – Customers engage instantly via auto-dial and voice-activated transactions.  
✅ **Intelligent Learning & Memory** – AI remembers user preferences and improves interactions dynamically.  
✅ **Scalability Across Industries** – Retail, D2C brands, fintech, and e-commerce giants can integrate Vyoma AI seamlessly.  

---

## 🎯 Join Us in Building the Future
Vyoma AI is more than a product—it's an evolution in AI-driven sales and customer engagement. Be part of the journey as we scale, innovate, and revolutionize voice commerce. 
