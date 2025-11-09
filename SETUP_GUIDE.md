# 🚀 AI Placement System - Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Git

---

## 📦 Installation Steps

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/AyushMunjal17/ai-placement-app.git
cd ai-placement-app
```

### 2️⃣ Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:
```env
MONGO_URI=mongodb://localhost:27017/ai-placement
# OR use MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-placement

JWT_SECRET=your_super_secret_jwt_key_here
PORT=5000
NODE_ENV=development
```

**Note:** Piston API is used for code execution (no API key needed, unlimited submissions!)

Start the backend:
```bash
npm run dev
```

Backend should be running on `http://localhost:5000`

---

### 3️⃣ Frontend Setup

Open a new terminal:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:
```bash
npm run dev
```

Frontend should be running on `http://localhost:5173`

---

## 🎯 Quick Test

1. Open browser: `http://localhost:5173`
2. Register a new account
3. Try solving a problem
4. Submit code (unlimited submissions!)

---

## 🔧 Common Issues

### Issue: "Route not found"
**Solution:** Make sure backend is running on port 5000 and frontend `.env` has correct `VITE_API_URL`

### Issue: "Cannot connect to MongoDB"
**Solution:** 
- Check if MongoDB is running locally: `mongod`
- Or use MongoDB Atlas and update `MONGO_URI` in backend `.env`

### Issue: "Module not found"
**Solution:** Run `npm install` in both backend and frontend folders

### Issue: Code execution not working
**Solution:** Piston API is used (no setup needed). Check backend logs for errors.

---

## 📝 Default Accounts

After setup, register as:
- **Admin**: Select "Admin" role during registration to create/manage problems
- **Student**: Select "Student" role to solve problems

---

## 🌟 Features

✅ **Unlimited Code Execution** - Using Piston API  
✅ **Multiple Languages** - Python, JavaScript, Java, C, C++  
✅ **Real-time Feedback** - Instant test case results  
✅ **Progress Tracking** - Dashboard with statistics  
✅ **Company & Topic Filters** - Find problems by company/topic  
✅ **Admin Dashboard** - Manage problems and users  

---

## 🆘 Need Help?

If you encounter any issues:
1. Check backend logs in terminal
2. Check browser console (F12)
3. Ensure both backend and frontend are running
4. Verify `.env` files are created correctly

---

## 📚 Tech Stack

- **Backend:** Node.js, Express, MongoDB, Piston API
- **Frontend:** React, Vite, TailwindCSS, Monaco Editor
- **Authentication:** JWT
- **Code Execution:** Piston API (unlimited, free)
