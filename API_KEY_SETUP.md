# 🚀 GYANDEEP IS RUNNING! Setup Instructions

## ✅ Server Status: RUNNING

Your Gyandeep server is now running on **http://localhost:3000**

But you need to add your Gemini API key to make it fully functional.

---

## 🔑 Step 1: Get Your Gemini API Key

1. **Visit**: https://aistudio.google.com/
2. **Sign in** with your Google account (create one if needed)
3. **Click**: "Get API Key" button
4. **Copy** the API key

---

## 📝 Step 2: Add API Key to .env.local

**Option A: Using Editor**
1. Open: `.env.local` in the project root
2. Find this line:
   ```env
   GEMINI_API_KEY=
   ```
3. Replace with:
   ```env
   GEMINI_API_KEY=your_actual_key_here
   ```
4. Save the file

**Option B: Using Terminal (Windows PowerShell)**
```powershell
# Replace 'your_key_here' with your actual key
$content = Get-Content '.env.local'
$content = $content -replace 'GEMINI_API_KEY=$', 'GEMINI_API_KEY=your_key_here'
Set-Content '.env.local' $content
```

**Option C: Using Terminal (Linux/Mac/Git Bash)**
```bash
sed -i 's/GEMINI_API_KEY=$/GEMINI_API_KEY=your_key_here/' .env.local
```

---

## 🔄 Step 3: Restart Server

1. **Stop current server**: Press `Ctrl+C` in terminal
2. **Start fresh**:
   ```bash
   npm start
   ```
3. You should see:
   ```
   ✓ Gyandeep Server running on http://localhost:3000
   ```
   (WITHOUT the WARNING about missing API key)

---

## 🌐 Step 4: Open in Browser

Visit: **http://localhost:3000**

You should see the Gyandeep login page!

---

## ✨ Features to Test

Once running, try:
- ✅ **Student Login** - Use demo credentials
- ✅ **Face Registration** - Grant camera permission
- ✅ **Location Check** - Allow geolocation
- ✅ **Quiz Generation** - Generate from notes
- ✅ **Chatbot** - Ask questions

---

## 🆘 Troubleshooting

### Issue: "Cannot find module 'server/apis.js'"
**Solution**: Ensure the file exists at `server/apis.js`
```bash
ls server/apis.js  # Check if file exists
npm install        # Reinstall if missing
```

### Issue: "Port 3000 already in use"
**Solution**: Kill the process or use different port
```bash
# Windows PowerShell
Get-Process | Where-Object {$_.Port -eq 3000}

# Or use different port
$env:PORT=3001; npm start
```

### Issue: "API key still not working"
**Solution**: Make sure to:
1. Save `.env.local` after editing
2. Restart the server with `Ctrl+C` then `npm start`
3. Check that key is pasted completely (no extra spaces)

### Issue: "Camera/Location not working"
**Solution**:
- Grant browser permissions when prompted
- Check browser console for errors (F12)
- Refresh page (Ctrl+R)

---

## 📚 Next Steps

1. ✅ Add API key (above)
2. ✅ Restart server
3. ✅ Test in browser
4. ✅ Create test users
5. 📖 Read [WEB_BASED_SETUP.md](WEB_BASED_SETUP.md)
6. 🚀 Deploy to production (see [DEPLOYMENT.md](DEPLOYMENT.md))

---

## 🎯 Common Commands

```bash
# Development (hot reload)
npm run dev

# Production build + start
npm run build
npm start

# Just start (uses existing build)
npm start

# Preview production build
npm run preview

# Stop server
# Press: Ctrl+C

# Use different port
$env:PORT=4000; npm start
```

---

## 💡 What to Do While Server is Running

### In Another Terminal:

Test the API:
```bash
# Check if API is responding
curl http://localhost:3000/api/users

# Should return: []
```

Or in browser:
```
http://localhost:3000/api/users
```

---

## 📍 Key URLs

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Main application |
| http://localhost:3000/api/users | Test API |
| http://localhost:3000/api/quiz | Quiz endpoint |
| http://localhost:3000/api/chat | Chatbot endpoint |

---

## ✅ Verification Checklist

- [ ] API key obtained from Google
- [ ] .env.local file updated with key
- [ ] Server restarted
- [ ] http://localhost:3000 loads in browser
- [ ] Login page visible
- [ ] No errors in browser console (F12)
- [ ] API responds to /api/users

---

## 🚀 Once Everything Works

1. **Test Features**
   - Register a face
   - Verify location
   - Generate quiz
   - Chat with AI

2. **Deploy**
   - Choose platform (Vercel, Railway, AWS, etc.)
   - Follow [DEPLOYMENT.md](DEPLOYMENT.md)

3. **Customize**
   - Add your school branding
   - Customize themes
   - Add more users

---

## 📞 Need Help?

1. **Check Error Messages**
   - Terminal output
   - Browser console (F12)
   - Network tab (F12 → Network)

2. **Read Documentation**
   - [README_WEB.md](README_WEB.md)
   - [WEB_BASED_SETUP.md](WEB_BASED_SETUP.md)
   - [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

3. **Common Issues**
   - Check [QUICK_REFERENCE.md#Troubleshooting](QUICK_REFERENCE.md)
   - Check [WEB_BASED_SETUP.md#Troubleshooting](WEB_BASED_SETUP.md)

---

**Your Gyandeep system is ready to go! 🎉**

Get that API key and restart → Done! ✅
