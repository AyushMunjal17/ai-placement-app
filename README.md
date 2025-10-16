# AI Placement Readiness System

A comprehensive platform for coding interview preparation with three modules:

## 🚀 Modules

### 1️⃣ LeetCode-Style Coding Platform ✅ (Active)
- Authentication system with JWT
- Problem browsing and solving
- Real-time code execution via Judge0 API
- Question publishing system
- User dashboard

### 2️⃣ One-to-One AI Interview 🔜 (Coming Soon)
- AI-powered mock interviews
- Real-time feedback and scoring

### 3️⃣ AI Resume Maker 🔜 (Coming Soon)
- AI-assisted resume building
- Industry-specific templates

## 🏗️ Tech Stack

### Backend
- Node.js + Express
- MongoDB with Mongoose
- JWT Authentication
- Judge0 API Integration

### Frontend
- React + Vite
- Tailwind CSS + ShadCN UI
- Monaco Editor for code editing
- Axios for API calls

## 📁 Project Structure

```
ai-placement-readiness-system/
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middlewares/
│   └── server.js
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── utils/
    │   └── main.jsx
    ├── tailwind.config.js
    └── vite.config.js
```

## 🔧 Setup Instructions

Follow the step-by-step instructions provided by the AI assistant to set up the project.

## 🔐 Environment Variables

### Backend (.env)
```
MONGO_URI=<your_database_connection_string>
JWT_SECRET=<any_secret_string>
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com/submissions
JUDGE0_API_KEY=<your_judge0_api_key>
PORT=5000
```

### Frontend (.env)
```
VITE_BACKEND_URL=http://localhost:5000/api
```

## 🚫 Important Notes

- Never commit .env files to GitHub
- Keep hidden test cases secure (server-side only)
- Use environment variables for all sensitive data
