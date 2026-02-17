# Gyandeep - Advanced Features Quick Start Guide

## 🚀 Starting the Application

### 1. Start Backend Server (Port 3001)
```bash
cd "c:\Users\SUNIL KORE\Downloads\gyandeep (1)"
node server/index.js
```

### 2. Start WebSocket Server (Port 3002)
```bash
npm run websocket
```

### 3. Start Frontend (Port 5173)
```bash
npm run dev
```

### 4. (Optional) Start Blockchain Local Node
```bash
npm run blockchain:node
```

### 5. (Optional) Deploy Smart Contracts
```bash
npm run blockchain:deploy
```

---

## 📦 New Features Available

### 1. Real-Time Analytics 📊
- **Location**: Available in all dashboards
- **Components**: `RealtimeAnalytics`, `EngagementMetrics`, `PerformanceChart`
- **Features**:
  - Live performance trends
  - Real-time attendance visualization
  - Engagement metrics tracking
  - Subject-wise analytics

### 2. Digital Twin 3D Visualization 🏗️
- **Components**: `DigitalClassroom`, `StudentLearningTwin`
- **Features**:
  - 3D virtual classroom with student positions
  - Interactive learning profile visualization
  - Real-time status indicators
  - Orbit controls for navigation

### 3. Blockchain Integration ⛓️
- **Component**: `BlockchainWallet`
- **Smart Contracts**:
  - AttendanceRecord.sol - Immutable attendance
  - AcademicCredentials.sol - NFT certificates
  - GradingSystem.sol - Transparent grading
- **Requirements**: MetaMask wallet installed

---

## 🔧 How to Use New Features

### Real-Time Analytics
1. Login as Teacher/Student/Admin
2. WebSocket automatically connects
3. View live updates in dashboard
4. Charts update automatically with new data

### Digital Twin Classroom
1. Teacher starts a class session
2. Students mark attendance
3. View 3D classroom representation
4. See real-time student positions and status

### Blockchain Features
1. Click "Connect Wallet" button
2. Approve MetaMask connection
3. Select network (Mumbai/Sepolia/Localhost)
4. Use blockchain features:
   - Record attendance on-chain
   - Issue NFT certificates
   - Verify records

---

## 📁 New Files Created

### Components
- `components/RealtimeAnalytics.tsx` - Main analytics dashboard
- `components/EngagementMetrics.tsx` - Engagement tracking
- `components/BlockchainWallet.tsx` - Wallet connection UI
- `components/DigitalClassroom.tsx` - 3D classroom
- `components/StudentLearningTwin.tsx` - 3D learning profile

### Services
- `services/websocketService.ts` - Real-time communication
- `services/blockchainService.ts` - Blockchain interactions

### Smart Contracts
- `contracts/AttendanceRecord.sol`
- `contracts/AcademicCredentials.sol`
- `contracts/GradingSystem.sol`

### Infrastructure
- `server/websocket-server.js` - WebSocket server
- `hardhat.config.cjs` - Blockchain configuration
- `scripts/deploy.js` - Contract deployment

---

## 🎨 Integration Examples

### Adding Analytics to Dashboard
```typescript
import RealtimeAnalytics from './components/RealtimeAnalytics';

// In your dashboard component
<RealtimeAnalytics 
  userId={currentUser.id}
  userRole={currentUser.role}
  theme={theme}
/>
```

### Adding Digital Classroom
```typescript
import DigitalClassroom from './components/DigitalClassroom';

<DigitalClassroom
  classroomId="class-1"
  students={students}
  teacherPresent={true}
  activeSession={classSession.code !== null}
/>
```

### Adding Blockchain Wallet
```typescript
import BlockchainWallet from './components/BlockchainWallet';

<BlockchainWallet 
  onWalletConnected={(wallet) => console.log('Connected:', wallet)}
/>
```

---

## 🐛 Troubleshooting

### WebSocket Not Connecting
- Ensure WebSocket server is running on port 3002
- Check browser console for connection errors
- Verify CORS settings

### Blockchain Issues
- Install MetaMask browser extension
- Ensure you're on correct network
- Get test tokens from faucet for testnets

### 3D Rendering Issues
- Update graphics drivers
- Try different browser (Chrome recommended)
- Check WebGL support

---

## 📊 Testing the Features

### Test Real-Time Updates
1. Open two browser windows
2. Login as teacher in one, student in another
3. Mark attendance in student window
4. See live update in teacher's analytics dashboard

### Test Digital Twin
1. Login as teacher
2. Start a class session
3. Have students mark attendance
4. View 3D classroom - see students appear

### Test Blockchain
1. Install MetaMask
2. Connect wallet
3. Record test attendance
4. Check transaction on blockchain explorer

---

## 🔐 Security Notes

- Private keys stored in `.env` file (never commit!)
- Smart contracts use OpenZeppelin for security
- WebSocket connections authenticated by user ID
- Blockchain transactions require wallet approval

---

## 📈 Next Steps

1. Deploy contracts to testnet
2. Integrate components into existing dashboards
3. Add IPFS for certificate metadata
4. Implement campus digital twin
5. Add more analytics visualizations

---

## 💡 Tips

- Use localhost blockchain for testing (free, fast)
- Real-time features work best with WebSocket server running
- 3D features may impact performance on low-end devices
- Blockchain features require test ETH/MATIC tokens

---

For more details, see `walkthrough.md` and `implementation_plan.md`
