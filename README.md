# Gyandeep 🕯️

**AI-Powered Smart Classroom System**

Gyandeep is an advanced educational platform that integrates AI, biometric authentication, and blockchain technology to create a secure and engaging learning environment.

## 🌟 Key Features
- **Biometric Security**: Face ID login with liveness detection.
- **AI-Powered Learning**: Automated quiz generation from notes and a context-aware smart chatbot.
- **Offline Resilience**: Works seamlessly with local storage fallbacks when the backend is unavailable.
- **Unified Dashboards**: Tailored experiences for Students, Teachers, and Administrators.
- **Immutable Records**: Optional blockchain integration for attendance and grades.

## 🚀 Getting Started

### Local Development
1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure AI**:
   Create a `.env.local` file and add your `GEMINI_API_KEY`.
3. **Launch**:
   ```bash
   npm run dev
   ```

### Production Deployment
For detailed instructions on deploying to the cloud or self-hosting, please see [DEPLOYMENT.md](DEPLOYMENT.md).

## 🛠 Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, Socket.io
- **AI**: Google Gemini Pro & Flash
- **Biometrics**: OpenCV (Standard) or Web-Image Analysis (Lite)
- **Blockchain**: Ethers.js, Solidity, Hardhat

---
*Empowering education through technology.*
