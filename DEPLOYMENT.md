# Gyandeep - AI-Powered Classroom System

## ✨ Fully Web-Based Architecture

This is now a **completely web-based system** with no desktop dependencies. All services run in the browser and on the Node.js backend.

### Key Features

- ✅ **100% Web-Based** - Works purely in the browser
- ✅ **No Python Required** - All services converted to web APIs
- ✅ **Cloud-Ready** - Deploy anywhere (Vercel, Netlify, AWS, Azure, etc.)
- ✅ **Face Recognition** - Web-based image comparison
- ✅ **Location Verification** - Haversine formula for distance calculation
- ✅ **AI Integration** - Google Gemini for quizzes and chat

## Deployment Guide

### Quick Start (Production)

```bash
# Build and start the server
npm run host

# OR build separately then run
npm run build
npm start
```

The application will be available at `http://localhost:3000` (or the port specified in the `PORT` environment variable).

### Environment Variables

Create a `.env.local` file or set these environment variables:

```env
# Required: Google Gemini API Key for AI features
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Port (default: 3000)
PORT=3000

# Optional: Node environment
NODE_ENV=production
```

### Requirements

- **Node.js 16+** ✅ (Only requirement now!)
- 500MB disk space minimum

### Installation

1. **Install Node.js dependencies:**
```bash
npm install
```

2. **Set environment variables:**
```bash
# Linux/Mac
export GEMINI_API_KEY=your_api_key_here

# Windows (PowerShell)
$env:GEMINI_API_KEY="your_api_key_here"

# Or create .env.local file
echo "GEMINI_API_KEY=your_api_key_here" > .env.local
```

3. **Build the project:**
```bash
npm run build
```

4. **Start the server:**
```bash
npm start
```

Access the application at `http://localhost:3000`

## API Endpoints

### Face Authentication (Web-Based)
- **POST** `/api/auth/face` - Verify or register a face
- **POST** `/api/face/register` - Register user's face

### Location Verification (Web-Based)
- **POST** `/api/auth/location` - Verify user location

### Quiz Generation
- **POST** `/api/quiz` - Generate quiz from class notes

### Chat Service
- **POST** `/api/chat` - AI chatbot with location awareness

### User Management
- **GET** `/api/users` - Fetch all users
- **POST** `/api/users/bulk` - Bulk upload users

### Class Management
- **GET** `/api/classes` - Fetch all classes
- **POST** `/api/classes` - Create/update classes
- **POST** `/api/classes/assign` - Assign student to class

### Question Bank
- **GET** `/api/question-bank` - Fetch question bank
- **POST** `/api/question-bank/add` - Add questions
- **POST** `/api/question-bank/upsert-quiz` - Add generated quiz questions
- **POST** `/api/question-bank/update` - Update a question
- **DELETE** `/api/question-bank/:id` - Delete a question

### Notes Management
- **POST** `/api/notes/upload` - Upload class notes
- **GET** `/api/notes/list` - List notes for a class/subject

## Cloud Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel login
vercel --prod
```

Set environment variables in Vercel dashboard: `Settings > Environment Variables`

### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### AWS/Azure/GCP
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting service
3. Set up environment variables in your hosting platform
4. Ensure Node.js backend runs on your server

### Docker

```dockerfile
# Use provided Dockerfile
docker build -t gyandeep .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key gyandeep
```

## Architecture

### Frontend (React + TypeScript)
- Components for Student, Teacher, Admin dashboards
- Quiz system with AI generation
- Attendance tracking
- Performance analytics
- Real-time chatbot

### Backend (Node.js + Express)
- REST API for all services
- File storage for user data and faces
- Quiz question bank management
- Session management

### Web-Based Services (No Desktop Dependencies)
- **Face Recognition**: Image comparison and validation
- **Location Verification**: GPS coordinate validation
- **AI Services**: Google Gemini integration

## Data Storage

- **Users**: `server/data/users.json`
- **Classes**: `server/data/classes.json`
- **Question Bank**: `server/data/questionBank.json`
- **Stored Faces**: `server/data/faces/` (Base64 encoded images)
- **Notes**: `server/storage/notes/`

## Features

### For Students
- 👤 Face ID registration and verification
- 📍 Location-based attendance
- 📚 Quiz generation from class notes
- 📊 Performance tracking
- 💬 AI Chatbot assistance

### For Teachers
- 📋 Class management
- 👥 Student attendance tracking
- 📊 Performance analytics
- 🎯 Quiz creation and distribution
- 📝 Notes management

### For Administrators
- 🔧 System setup and configuration
- 👨‍💼 User management
- 📚 Question bank management
- 📊 Analytics and reports

## Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### GEMINI_API_KEY Not Found
- Ensure `.env.local` exists in root directory
- Or set environment variable: `export GEMINI_API_KEY=your_key`
- Restart the server after setting

### Face Recognition Not Working
- Ensure camera permissions are granted in browser
- Check that image data is valid base64
- Face must be clearly visible in the image

### Location Verification Issues
- Ensure GPS is enabled in device
- Check browser geolocation permissions
- Verify coordinates are in correct format (lat/lng)

## Support & Documentation

For more information, see:
- [README.md](README.md)
- API documentation in inline comments
- Component documentation in TypeScript files

## Migration from Python Backend

If you were using the Python backend previously:

1. **Python services are now web-based** - No need to install Python
2. **Face data format unchanged** - Existing face images are compatible
3. **Database format unchanged** - User and class data remain the same
4. **API endpoints compatible** - Same request/response format

Simply stop the Python service and use the Node.js server instead.

3. **Create environment file:**
```bash
cp .env.local.example .env.local
# Edit .env.local and add your GEMINI_API_KEY
```

4. **Build the frontend:**
```bash
npm run build
```

5. **Start the production server:**
```bash
npm start
```

### Architecture

**Frontend:**
- React 19 with Vite bundler
- TypeScript for type safety
- Tailwind CSS for styling
- Lazy-loaded dashboard components

**Backend:**
- Express.js REST API
- File-based storage (users, classes, notes)
- Google Gemini AI integration
- CORS-enabled for cross-origin requests

**Face Recognition (Separate Service):**
- Python Flask service on port 5001
- OpenCV for face detection
- Multi-algorithm face verification
- Histogram, ORB, and template matching

### File Structure

```
gyandeep/
├── dist/                    # Production build (auto-generated)
├── components/              # React components
├── services/               # API services
├── server/
│   ├── production.js       # Production server
│   ├── index.js           # Development server
│   └── data/              # JSON data files
├── python/
│   ├── app.py             # Flask face recognition service
│   ├── data/faces/        # Stored face images
│   └── requirements.txt
├── package.json
└── vite.config.ts
```

### Running Multiple Services

**Option 1: All-in-One (Recommended for Single Machine)**
```bash
# Terminal 1: Start production server
npm start

# Terminal 2: Start Python face recognition service
cd python && python app.py
```

**Option 2: Development Mode**
```bash
# Terminal 1: Vite dev server (with hot reload)
npm run dev

# Terminal 2: Node backend API
node server/index.js

# Terminal 3: Python face recognition
cd python && python app.py
```

### Features

✅ **User Management**
- Admin, Teacher, and Student roles
- Email/Password login
- Face ID authentication

✅ **Classroom Management**
- Class creation and student assignment
- Subject configuration
- Attendance tracking with multiple verification methods

✅ **AI-Powered Features**
- Quiz generation from class notes
- AI chatbot with location awareness
- Performance analytics

✅ **Face Recognition**
- Face registration during setup
- Multi-frame liveness detection
- Histogram + ORB + Template matching

✅ **Accessibility**
- High contrast mode
- Adjustable font scaling
- Multi-language support (English, Hindi, Marathi)
- i18n ready

### API Endpoints

**Authentication:**
- `POST /api/auth/otp/send` - Send OTP
- `POST /api/auth/otp/verify` - Verify OTP
- `POST /api/auth/face` - Face recognition login
- `POST /face/register` - Register face

**Users:**
- `GET /api/users` - Get all users
- `POST /api/users/bulk` - Bulk update users

**Classes:**
- `GET /api/classes` - Get classes
- `POST /api/classes` - Update classes
- `POST /api/classes/assign` - Assign student to class

**Notes:**
- `POST /api/notes/upload` - Upload class notes
- `GET /api/notes/list` - List notes

**Quiz Generation:**
- `POST /api/quiz` - Generate quiz from notes

**AI Chat:**
- `POST /api/chat` - Chat with AI assistant

### Performance Considerations

1. **Frontend Optimization:**
   - Lazy loading of dashboard components
   - Code splitting by route
   - Gzip compression enabled

2. **Backend Optimization:**
   - File-based storage (can be replaced with DB)
   - Static file serving from dist
   - CORS configured for efficiency

3. **Face Recognition:**
   - Efficient face detection with Haar cascades
   - Frame compression for API calls
   - Normalized face storage

### Deployment to Cloud

**Heroku:**
```bash
heroku create gyandeep-app
heroku config:set GEMINI_API_KEY=your_key
git push heroku main
```

**AWS:**
Use Elastic Beanstalk or EC2 with PM2:
```bash
npm install -g pm2
pm2 start npm --name "gyandeep" -- start
pm2 save
pm2 startup
```

**Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Troubleshooting

**Port Already in Use:**
```bash
# Change port
PORT=8080 npm start

# Or kill existing process
lsof -ti:3000 | xargs kill -9
```

**Missing GEMINI_API_KEY:**
- Add to `.env.local` file
- Or set as environment variable
- Quiz and chat features will fail without it

**Face Recognition Not Working:**
- Ensure Python service is running on port 5001
- Check Python dependencies installed
- Verify webcam permissions granted

### Support

For issues and feature requests, visit the GitHub repository.

---

**Made with ❤️ for educators and learners**
