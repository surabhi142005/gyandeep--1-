<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gyandeep - AI-Powered Classroom System

## ✨ Now 100% Web-Based!

Gyandeep is a completely web-based classroom management system with AI integration, face recognition, and location verification. **No Python or desktop dependencies required!**

### Features
- 👤 **Face ID Authentication** - Browser-based face recognition
- 📍 **Location Verification** - GPS-based attendance verification
- 🤖 **AI Quiz Generation** - Powered by Google Gemini
- 💬 **Smart Chatbot** - AI assistant with location awareness
- 📊 **Analytics** - Performance tracking and insights
- 👨‍🏫 **Multi-Role** - Support for Students, Teachers, and Admins

## Quick Start

### Prerequisites
- Node.js 16+ (that's it!)

### Installation

1. **Clone/download the project**
```bash
cd gyandeep
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment**
Create `.env.local` in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

Get your free Gemini API key: https://aistudio.google.com/

4. **Run locally:**
```bash
npm run dev
```
Visit `http://localhost:5173`

5. **Build for production:**
```bash
npm run build
npm start
```
Visit `http://localhost:3000`

## Architecture

### Frontend
- React 19 + TypeScript
- Vite for fast builds
- Components for all user roles
- Real-time updates

### Backend
- Express.js on Node.js
- RESTful API endpoints
- JSON-based data storage
- Google Gemini integration

### Web Services (No Python!)
- **Face Recognition** - Image comparison
- **Location Verification** - Haversine formula
- **AI Services** - Gemini API

## Project Structure

```
gyandeep/
├── src/
│   ├── components/        # React components
│   ├── services/         # API integrations
│   ├── App.tsx          # Main app
│   └── index.tsx        # Entry point
├── server/
│   ├── production.js    # Express server
│   ├── apis.js         # Web-based handlers
│   └── data/           # JSON storage
├── public/             # Static files
├── dist/               # Production build
└── package.json        # Dependencies
```

## Key Technologies

| Component | Technology |
|-----------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Backend | Node.js, Express, Cors |
| AI | Google Generative AI |
| Charts | Recharts |
| Auth | OAuth 2.0 (Google) |
| Database | JSON (or upgrade to SQL/NoSQL) |

## Available Scripts

```bash
npm run dev       # Dev server on localhost:5173
npm run build     # Build for production
npm run preview   # Preview production build
npm start         # Start production server
npm run host      # Build + start (full production)
```

## API Endpoints

### Authentication
- `POST /api/face/register` - Register user face
- `POST /api/auth/face` - Verify face
- `POST /api/auth/location` - Verify location

### AI Services
- `POST /api/quiz` - Generate quiz from notes
- `POST /api/chat` - AI chatbot

### User Management
- `GET /api/users` - Get all users
- `POST /api/users/bulk` - Bulk user upload

### Class Management
- `GET /api/classes` - Get classes
- `POST /api/classes` - Create classes
- `POST /api/classes/assign` - Assign students

### Question Bank
- `GET /api/question-bank` - Get questions
- `POST /api/question-bank/add` - Add questions
- `POST /api/question-bank/update` - Update question
- `DELETE /api/question-bank/:id` - Delete question

## Deployment

### One-Click Deploy

#### Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-repo%2Fgyandeep)

#### Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

#### Render
[Deploy on Render](https://render.com)

### Manual Deployment

**AWS EC2:**
```bash
npm install
npm run build
npm start
```

**Docker:**
```bash
docker build -t gyandeep .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key gyandeep
```

**Self-hosted:**
Use any Node.js hosting (AWS, Azure, GCP, DigitalOcean, etc.)

## Documentation

- [WEB_BASED_SETUP.md](WEB_BASED_SETUP.md) - Detailed web-based setup guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [TypeScript Types](types.ts) - Data structure definitions

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Camera (Face) | ✅ | ✅ | ✅ | ✅ |
| Geolocation | ✅ | ✅ | ✅ | ✅ |
| WebSocket | ✅ | ✅ | ✅ | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ |

Note: HTTPS required for camera and geolocation (except localhost)

## Environment Variables

```env
# Required
GEMINI_API_KEY=your_api_key

# Optional
PORT=3000
NODE_ENV=production
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Data Storage

- **Users**: `server/data/users.json`
- **Classes**: `server/data/classes.json`
- **Questions**: `server/data/questionBank.json`
- **Faces**: `server/data/faces/` (base64 images)
- **Notes**: `server/storage/notes/`

## Performance

- ✅ Optimized builds with Vite
- ✅ Lazy loading for components
- ✅ API request caching
- ✅ Gzip compression
- ✅ CDN-ready static assets

## Security

- ✅ Environment variable protection
- ✅ CORS configuration
- ✅ Input validation
- ✅ XSS prevention
- ✅ HTTPS support

## Troubleshooting

### Camera not working?
- Grant browser permissions
- Use HTTPS (except localhost)
- Check browser console for errors

### Face authentication failing?
- Ensure good lighting
- Face must be centered
- Re-register if poor quality

### Location not detecting?
- Enable device location services
- Grant browser geolocation permission
- Check GPS availability

### Port already in use?
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
# Or use different port
PORT=3001 npm start
```

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

- 📧 Email: support@gyandeep.com
- 💬 Discord: [Join Community](https://discord.gg/gyandeep)
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/gyandeep/issues)
- 📚 Docs: [Full Documentation](WEB_BASED_SETUP.md)

## Changelog

### v2.0.0 (Current)
- ✅ Converted to 100% web-based
- ✅ Removed Python dependencies
- ✅ Web-based face recognition
- ✅ Improved performance
- ✅ Better deployment options

### v1.0.0
- Initial release with Python backend

---

**Made with ❤️ for educators and students**

**Ready to get started? Follow the [Quick Start](#quick-start) above! 🚀**
