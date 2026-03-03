# 🏗️ Architectural Design - Gyandeep

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GYANDEEP SYSTEM ARCHITECTURE                           │
│                          Three-Tier Architecture                             │
└─────────────────────────────────────────────────────────────────────────────┘

                            ┌──────────────────────┐
                            │   CLIENT LAYER       │
                            │ (Browser/Mobile)     │
                            └──────────────────────┘
                                     ▲
                                     │ HTTP/WebSocket
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         │                           │                           │
    ┌────▼────┐              ┌────────▼──────┐          ┌────────▼──────┐
    │ Frontend │              │   Backend      │          │  Real-Time    │
    │  Layer   │              │   Services     │          │  Services     │
    │          │              │                │          │  (WebSocket)  │
    │ - React  │              │ - Auth API     │          │               │
    │ - Vite   │              │ - Quiz API     │          │ - Socket.io   │
    │ - Tailwind│             │ - Analytics API│          │ - Live Classes│
    │ - 3D     │              │ - Blockchain   │          │ - Notifications
    │ Graphics │              │   Integration  │          │ - Presence    │
    │ - Canvas │              │ - Chat API     │          │               │
    └──────────┘              └────────────────┘          └───────────────┘
         │                            │                            │
         │                            │                            │
         └────────────────┬───────────┴──────────────┬─────────────┘
                          │                          │
                   ┌──────▼──────────────────────────▼──────┐
                   │      BUSINESS LOGIC LAYER               │
                   │                                        │
                   │ ├─ Authentication Manager             │
                   │ ├─ Quiz Engine                         │
                   │ ├─ Analytics Engine                    │
                   │ ├─ Notification Service               │
                   │ ├─ Blockchain Manager                 │
                   │ └─ AI Integration Service             │
                   │                                        │
                   └──────┬──────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼─────┐     ┌────▼─────┐    ┌───▼──────┐
    │ Database  │     │   Cache   │    │Blockchain│
    │  Layer    │     │  (Redis)  │    │ (Ethers) │
    │           │     │           │    │          │
    │ PostgreSQL│     │  Sessions │    │SmartConts│
    │ Supabase  │     │  API Cache│    │ Ethereum │
    └───────────┘     └───────────┘    └──────────┘
```

---

## Layered Architecture

### 1. **Presentation Layer**

```
┌──────────────────────────────────────────────────────┐
│              PRESENTATION LAYER                       │
└──────────────────────────────────────────────────────┘

┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│   Student   │  │   Teacher   │  │ Admin        │
│  Dashboard  │  │  Dashboard  │  │ Dashboard    │
└─────────────┘  └─────────────┘  └──────────────┘
       │                │                │
       │                │                │
    ┌──▼────────────────▼────────────────▼──┐
    │    React Components (TSX)               │
    │                                         │
    │ ├─ LoginComponent                       │
    │ ├─ QuizComponent                        │
    │ ├─ AttendanceChart                      │
    │ ├─ GradeBook                            │
    │ ├─ Chatbot                              │
    │ └─ 3D Visualizations                    │
    └──┬────────────────────────────────────┘
       │
       └─→ Vite Build Pipeline
            │
            ├─ Code Splitting
            ├─ Hot Module Replacement
            └─ Optimized Bundle
```

### 2. **Business Logic Layer**

```
┌──────────────────────────────────────────────────────┐
│            BUSINESS LOGIC LAYER                       │
│              (API Endpoints)                          │
└──────────────────────────────────────────────────────┘

Express Server (Node.js)
│
├─ Authentication Module
│  ├─ User Registration
│  ├─ Login Validation
│  ├─ Face ID Verification
│  ├─ JWT Token Generation
│  └─ Session Management
│
├─ Quiz Management Module
│  ├─ Quiz Creation
│  ├─ Question Pool Management
│  ├─ AI-Powered Quiz Generation
│  ├─ Answer Evaluation
│  ├─ Score Calculation
│  └─ Analytics Update
│
├─ Attendance Module
│  ├─ Check-in/Check-out
│  ├─ Attendance Report
│  ├─ Blockchain Record
│  └─ Notifications
│
├─ Grading Module
│  ├─ Grade Calculation
│  ├─ GPA Computation
│  ├─ Report Card Generation
│  └─ Blockchain Archive
│
├─ Analytics Module
│  ├─ Performance Metrics
│  ├─ Engagement Analysis
│  ├─ Learning Patterns
│  ├─ Predictive Analysis
│  └─ Dashboard Data
│
├─ Notification Service
│  ├─ Email Service
│  ├─ Push Notifications
│  ├─ SMS Gateway
│  └─ In-App Messages
│
└─ Blockchain Integration
   ├─ Smart Contract Interaction
   ├─ Transaction Management
   ├─ Record Verification
   └─ Wallet Management
```

### 3. **Data Access Layer**

```
┌──────────────────────────────────────────────────────┐
│             DATA ACCESS LAYER                         │
└──────────────────────────────────────────────────────┘

ORM/Query Builder (TypeORM / Knex.js)
│
├─ PostgreSQL Interface
│  ├─ User Queries
│  ├─ Quiz Queries
│  ├─ Response Queries
│  ├─ Analytics Queries
│  └─ Transaction Management
│
├─ Supabase Interface
│  ├─ Authentication
│  ├─ File Storage
│  ├─ Real-time Subscriptions
│  └─ Connection Pooling
│
├─ Cache Layer (Redis)
│  ├─ Session Cache (5 min TTL)
│  ├─ Quiz Cache (1 hour TTL)
│  ├─ Analytics Cache (1 hour TTL)
│  └─ Rate Limiting
│
└─ Blockchain Interface (Ethers.js)
   ├─ Smart Contract ABI
   ├─ Transaction Creation
   ├─ Event Listening
   └─ State Querying
```

---

## API Gateway Pattern

```
┌─────────────────────────────────────────────────────────┐
│              API GATEWAY ARCHITECTURE                    │
└─────────────────────────────────────────────────────────┘

                    Client Requests
                         │
                         ▼
         ┌───────────────────────────────┐
         │    API Gateway (Express)      │
         │                               │
         │ - Request Validation          │
         │ - Authentication              │
         │ - Rate Limiting               │
         │ - Request Routing             │
         │ - Response Formatting         │
         └───────────────────────────────┘
                         │
         ┌───────────────┼────────────────┐
         │               │                │
    ┌────▼─────┐  ┌─────▼──────┐  ┌─────▼─────┐
    │ /api/auth │  │ /api/quiz  │  │/api/      │
    │ Routes    │  │ Routes     │  │analytics  │
    │           │  │            │  │ Routes    │
    │ - POST    │  │ - GET      │  │           │
    │   /login  │  │   /quizzes │  │ - GET     │
    │ - POST    │  │ - POST     │  │   /metrics│
    │   /logout │  │   /submit  │  │ - POST    │
    │ - DELETE  │  │ - PUT      │  │   /reports│
    │   /auth   │  │   /grade   │  │           │
    └────┬──────┘  └─────┬──────┘  └─────┬─────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
              (Routing to appropriate controller)
```

---

## Microservices Architecture (Optional - Future Scale)

```
┌──────────────────────────────────────────────────────────────┐
│           MICROSERVICES ARCHITECTURE (FUTURE)                │
└──────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│              API Gateway / Load Balancer                    │
└────────────────────────────────────────────────────────────┘
              │
    ┌─────────┼─────────┬──────────┬──────────┐
    │         │         │          │          │
┌───▼──┐ ┌────▼───┐ ┌──▼────┐ ┌──▼────┐ ┌──▼────┐
│Auth  │ │Quiz    │ │       │ │       │ │Notifi-│
│Service│ │Service │ │Analytics│Analytics│cation │
│      │ │        │ │Service│ │Service│ │Service│
└─┬────┘ └───┬────┘ └──┬─────┘ └──┬────┘ └──┬────┘
  │          │         │          │         │
  └──────────┼─────────┼──────────┼─────────┘
             │
    ┌────────▼─────────┐
    │  Message Queue   │
    │  (RabbitMQ/Kafka)│
    └─────────┬────────┘
              │
    ┌─────────┴──────────┐
    │   Service Registry │
    │   (Consul/Eureka)  │
    └────────────────────┘
```

---

## Communication Patterns

### Synchronous Communication

```
Client Request
    │
    ▼
HTTP/REST API
    │
    ├─ Request Headers (Auth Token)
    │
    ├─ Request Body (JSON)
    │
    ├─ Processing (Controller → Service → Repository)
    │
    └─ Response (HTTP Status + JSON)
       │
       ├─ 200 OK (Success)
       ├─ 201 Created (Resource Created)
       ├─ 400 Bad Request (Validation Error)
       ├─ 401 Unauthorized (Auth Failed)
       ├─ 403 Forbidden (Permission Denied)
       ├─ 404 Not Found (Resource Missing)
       └─ 500 Internal Server Error
```

### Asynchronous Communication

```
Client → WebSocket Connection (Socket.io)
         │
         └─→ Real-time Events
             │
             ├─ Attendance Marked (Broadcast to Class)
             ├─ Quiz Started (Notify all students)
             ├─ New Message (Chat notification)
             ├─ Performance Update (Dashboard refresh)
             └─ System Alert (Urgent notification)
```

---

## Deployment Architecture

```
┌──────────────────────────────────────────────────────┐
│           DEPLOYMENT ARCHITECTURE                     │
└──────────────────────────────────────────────────────┘

                  Development
                      │
                      ▼
        ┌─────────────────────────────┐
        │  Local Development Server   │
        │ - npm run dev               │
        │ - Hot Reload Enabled        │
        └─────────────────────────────┘
                      │
                      ▼
                  Staging
                      │
                      ▼
        ┌─────────────────────────────┐
        │  Docker Container           │
        │ - Dockerfile                │
        │ - docker-compose.yml        │
        └─────────────────────────────┘
                      │
                      ▼
              Production
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────▼──┐   ┌────▼──┐  ┌──────▼────┐
    │Vercel │   │Docker │  │ AWS/Azure  │
    │CDN    │   │Swarm/ │  │ Cloud      │
    │       │   │Kube   │  │            │
    └───────┘   └───────┘  └────────────┘
         │            │            │
         └────────────┼────────────┘
                      │
              ┌───────▼────────┐
              │  Load Balancer │
              │  (Nginx/HAProxy)│
              └────────────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
     ┌────▼──┐ ┌─────▼──┐ ┌──────▼──┐
     │Instance│ │Instance │ │Instance  │
     │   1    │ │   2     │ │   3      │
     └────────┘ └─────────┘ └──────────┘
```

---

## Technology Stack Mapping

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Three.js |
| **Backend** | Node.js, Express, TypeScript |
| **Real-time** | Socket.io, WebSockets |
| **Database** | PostgreSQL, Supabase |
| **Cache** | Redis |
| **Blockchain** | Ethers.js, Solidity, Hardhat, Ethereum |
| **Authentication** | JWT, Face Recognition (OpenCV) |
| **AI/ML** | Google Gemini Pro & Flash |
| **File Storage** | Supabase Storage, AWS S3 |
| **Containerization** | Docker, Docker Compose |
| **Deployment** | Vercel, AWS, Azure, or self-hosted |

