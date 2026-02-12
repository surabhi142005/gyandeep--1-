# Quick Reference: Web-Based Gyandeep

## ⚡ Quick Start (60 seconds)

```bash
# 1. Get Node.js (if needed)
# Download from https://nodejs.org/

# 2. Install dependencies
npm install

# 3. Set up environment
echo "GEMINI_API_KEY=your_key_here" > .env.local

# 4. Start
npm run build
npm start

# 5. Open browser
# Visit: http://localhost:3000
```

## 🔑 Commands

```bash
npm run dev        # Development mode (hot reload)
npm run build      # Build for production
npm start          # Start production server
npm run host       # Build + start (one command)
npm run preview    # Preview production build
```

## 📍 URLs

| Purpose | URL |
|---------|-----|
| Application | http://localhost:3000 |
| Dev Server | http://localhost:5173 |
| API | http://localhost:3000/api |
| Health Check | curl http://localhost:3000/api/users |

## 🌐 Environment Variables

```env
GEMINI_API_KEY=your_api_key           # Required
PORT=3000                             # Optional
NODE_ENV=production                   # Optional
GOOGLE_CLIENT_ID=your_client_id       # Optional (OAuth)
GOOGLE_CLIENT_SECRET=your_secret      # Optional (OAuth)
```

## 🛠️ Project Structure

```
gyandeep/
├── src/              # React frontend
├── server/           # Express backend
│   ├── production.js # Main server
│   ├── apis.js      # Web-based APIs
│   └── data/        # JSON storage
├── services/         # API services
├── components/       # React components
├── dist/            # Built frontend
└── package.json     # Dependencies
```

## 📡 API Quick Reference

### Face
```bash
# Register
curl -X POST http://localhost:3000/api/face/register \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user1","image":"data:image/jpeg;base64,..."}'

# Authenticate
curl -X POST http://localhost:3000/api/auth/face \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user1","image":"data:image/jpeg;base64,..."}'
```

### Location
```bash
curl -X POST http://localhost:3000/api/auth/location \
  -H "Content-Type: application/json" \
  -d '{"lat":40.7128,"lng":-74.0060,"target_lat":40.7130,"target_lng":-74.0061,"radius_m":100}'
```

### Quiz
```bash
curl -X POST http://localhost:3000/api/quiz \
  -H "Content-Type: application/json" \
  -d '{"notesText":"...content...","subject":"Math"}'
```

## 🚀 Deployment

### Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
# Set env vars in dashboard
```

### Railway
1. Connect GitHub repo
2. Add environment variables
3. Deploy

### AWS EC2
```bash
npm install
npm run build
npm start
```

### Docker
```bash
docker build -t gyandeep .
docker run -p 3000:3000 -e GEMINI_API_KEY=key gyandeep
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | `lsof -i :3000` then `kill -9 PID` |
| API key not found | Create `.env.local` with `GEMINI_API_KEY=key` |
| Camera not working | Grant browser permissions, use HTTPS |
| Build fails | Delete `node_modules` and `dist`, then `npm install && npm run build` |
| Location fails | Enable GPS on device, grant permissions |

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| README_WEB.md | Overview & quick start |
| WEB_BASED_SETUP.md | Detailed setup & architecture |
| DEPLOYMENT.md | Production deployment |
| MIGRATION_GUIDE.md | Migration from Python |
| COMPLETED.md | What changed summary |

## 🔗 Useful Links

- **Gemini API**: https://aistudio.google.com/
- **Node.js**: https://nodejs.org/
- **Express**: https://expressjs.com/
- **React**: https://react.dev/
- **Vite**: https://vitejs.dev/

## 💾 Data Locations

```
server/data/
├── users.json           # User data
├── classes.json         # Class data
├── questionBank.json    # Questions
└── faces/              # Face images
    └── user_id.jpg     # User's face

server/storage/
└── notes/              # Uploaded notes
```

## 🧪 Quick Test

```bash
# 1. Start server
npm start

# 2. Open another terminal
# 3. Test API
curl http://localhost:3000/api/users

# 4. Should see: []
# 5. Success! API is working
```

## ⏱️ Common Tasks

### Add a new user
```bash
curl -X POST http://localhost:3000/api/users/bulk \
  -H "Content-Type: application/json" \
  -d '[{"id":"user1","name":"John","role":"student"}]'
```

### Create a class
```bash
curl -X POST http://localhost:3000/api/classes \
  -H "Content-Type: application/json" \
  -d '[{"id":"class1","name":"Math 101","teacher":"teacher1"}]'
```

### Add questions
```bash
curl -X POST http://localhost:3000/api/question-bank/add \
  -H "Content-Type: application/json" \
  -d '{"questions":[{"question":"2+2?","options":["3","4","5"],"correctAnswer":"4"}]}'
```

## 🎨 Customization

### Change port
```bash
PORT=4000 npm start
```

### Change theme
See `App.tsx` for theme configuration

### Enable debug logging
```bash
DEBUG=* npm start
```

## 🔐 Security Tips

1. ✅ Never commit `.env.local`
2. ✅ Use HTTPS in production
3. ✅ Keep API keys secret
4. ✅ Validate all inputs
5. ✅ Use strong authentication

## 📈 Performance Tips

1. Enable gzip compression
2. Use CDN for static files
3. Add database (SQL/NoSQL)
4. Implement caching
5. Monitor with APM tools

## 🆘 Getting Help

**Before posting issues:**
1. Check documentation
2. Look at error messages
3. Check browser console (F12)
4. Run `npm install` again
5. Delete `dist/` and rebuild

**Still stuck?**
- Check MIGRATION_GUIDE.md
- Review WEB_BASED_SETUP.md
- Open GitHub issue
- Join community Discord

---

**Everything you need on one page! 📋**

Keep this for quick reference while developing! 🚀
