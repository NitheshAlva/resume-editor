# 🧾 Fullstack Resume Editor

A modern, web-based Resume Editor that allows users to upload, parse, and edit resumes with an intuitive interface.

## 🚀 Features

- **File Upload & Parsing**: Support for `.pdf` and `.docx` resume files
- **Real-time Editing**: Interactive resume editor with live preview
- **Modern UI**: Built with Tailwind CSS and shadcn/ui components
- **Fast Performance**: Next.js frontend with FastAPI backend
- **AI Integration**: Optional Gemini AI integration for resume enhancement

## 🛠 Tech Stack

### Frontend
- **Next.js** - React framework for production
- **React** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Re-usable component library
- **pdfjs-dist** - PDF parsing and rendering
- **mammoth** - DOCX file parsing

### Backend
- **FastAPI** - Modern Python web framework
- **Python 3.10+** - Backend language
- **Uvicorn** - ASGI server

## 📁 Project Structure

```
your-project/
├── frontend/              # Next.js application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── backend/               # FastAPI server
│   ├── main.py
│   ├── requirements.txt
│   └── ...
├── .gitignore
└── README.md
```

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python** (3.10 or higher) - [Download here](https://python.org/)
- **pip** (Python package manager)
- **Git** - [Download here](https://git-scm.com/)

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/NitheshAlva/resume-editor.git
cd resume-editor
```

### 2. Frontend Setup (Next.js)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: `http://localhost:3000`

#### Available Frontend Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### 3. Backend Setup (FastAPI)

```bash
# Navigate to backend directory (from project root)
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn main:app --port 8001 --reload
```

The backend API will be available at: `http://localhost:8001`

- **API Documentation**: `http://localhost:8000/docs` (Swagger UI)
- **Alternative Docs**: `http://localhost:8000/redoc` (ReDoc)

## 🌐 Environment Variables

### Backend Configuration

Create a `.env` file in the `backend/` directory:

```bash
# backend/.env
GEMINI_API_KEY="your_gemini_api_key_here"

```


## 🚀 Usage

1. **Start Backend Server**:
   ```bash
   cd backend
   uvicorn main:app --port 8001 --reload
   ```

2. **Start Frontend Server** (in a new terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the Application**:
   - Open your browser and navigate to `http://localhost:3000`
   - Upload a PDF or DOCX resume file
   - Edit and customize your resume using the editor
   - Download or export your updated resume



