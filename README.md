# 🎯 AI Placement Readiness System

A comprehensive platform for coding interview preparation featuring unlimited code execution, progress tracking, and admin management.

## ✨ Features

### 🔥 Active Features
- ✅ **Unlimited Code Execution** - Powered by Piston API (no limits!)
- ✅ **5 Programming Languages** - Python, JavaScript, Java, C, C++
- ✅ **Real-time Feedback** - Instant test case results
- ✅ **Progress Dashboard** - Track your submissions and achievements
- ✅ **Company & Topic Filters** - Find problems by company or topic
- ✅ **Admin Dashboard** - Create and manage problems
- ✅ **JWT Authentication** - Secure user accounts

### 🔜 Coming Soon
- 🚧 One-to-One AI Interview
- 🚧 AI Resume Maker

## 🏗️ Tech Stack

### Backend
- Node.js + Express
- MongoDB with Mongoose
- JWT Authentication
- **Piston API** for code execution (unlimited, free!)

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

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/AyushMunjal17/ai-placement-app.git
cd ai-placement-app
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env if backend is not on localhost:5000
npm run dev
```

### 4. Open in browser
```
http://localhost:5173
```

📖 **For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)**

## 🔐 Environment Variables

### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/ai-placement
JWT_SECRET=your_super_secret_jwt_key
PORT=5000
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

**Note:** No API keys needed! Piston API provides unlimited code execution for free.

## 📝 Important Notes

- ✅ Unlimited code submissions (Piston API)
- ✅ No API key required
- ✅ Works 24/7 for all users
- 🔒 Never commit .env files to GitHub
