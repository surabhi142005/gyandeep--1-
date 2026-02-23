# Context Level Diagram (Level 0 DFD) - Gyandeep 🕯️

## 📊 Colorful Context Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        🎨 GYANDEEP CONTEXT DIAGRAM                          │
│                            (Level 0 DFD)                                     │
└─────────────────────────────────────────────────────────────────────────────┘

                                👨‍🎓 STUDENT
                                   🔵
                                   │
                    ┌──────────────┴──────────────┐
                    │    Login, Quiz Responses     │
                    │        Data Flows           │
                    └──────────────┬──────────────┘
                                   │
    ┌──────────────────────────────┼──────────────────────────────┐
    │                              │                              │
    │    👩‍🏫 TEACHER           🕯️ GYANDEEP            👨‍💼 ADMIN    │
    │       🟢                   SYSTEM                    🟣       │
    │       │                      │                        │       │
    │  Create Quiz              ┌──┴──┐                 Config     │
    │  Upload Notes             │     │                 Manage    │
    │                           │     │                          │
    │                           │     │                          │
    │   👨‍👩‍👧 PARENT          │     │           🤖 AI SERVICE    │
    │      🟠                  │     │             🔴           │
    │      │                  │     │             │             │
    │  View Progress           │     │       AI Responses       │
    └──────────────────────────┴─────┴─────────────────────────────┘
                                       │
                                       │
                                  ⛓️ BLOCKCHAIN
                                     ⚫
                                     │
                              Immutable Records
```

## 🎨 Color Coding

| Color | Entity | Description |
|-------|--------|-------------|
| 🔵 Blue | Student | Learners using the platform |
| 🟢 Green | Teacher | Educators creating content |
| 🟣 Purple | Administrator | System managers |
| 🟠 Orange | Parent | Guardians monitoring progress |
| 🔴 Pink | AI Service | Google Gemini AI |
| ⚫ Gray | Blockchain | Immutable records |
| 🔵 Gradient | Gyandeep | Central System |

## 🔄 Data Flows

### From External Entities to Gyandeep System:
```
Student     → Login requests, Quiz answers, Chat messages
Teacher     → Quiz creation, Notes upload, Student management
Admin       → System configuration, User management
Parent      → Progress monitoring requests
AI Service  → Generated content, Quiz questions
Blockchain  → Record verification requests
```

### From Gyandeep System to External Entities:
```
Student     ← Quiz results, AI responses, Grades
Teacher     ← Analytics, Student performance data
Admin       ← Reports, System status
Parent      ← Progress reports, Notifications
AI Service  ← Content for processing
Blockchain  ← Records to store
```

## 📋 Entity Descriptions

### 👨‍🎓 Student
- **Role**: Primary learner user
- **Interactions**: 
  - Face ID login
  - Take AI-generated quizzes
  - Chat with smart chatbot
  - View grades and attendance
  - Access learning materials

### 👩‍🏫 Teacher
- **Role**: Content creator and educator
- **Interactions**:
  - Create and manage quizzes
  - Upload study notes
  - View student analytics
  - Manage classroom

### 👨‍💼 Administrator
- **Role**: System administrator
- **Interactions**:
  - System configuration
  - User management
  - View comprehensive reports
  - Manage permissions

### 👨‍👩‍👧 Parent
- **Role**: Guardian/observer
- **Interactions**:
  - Monitor child progress
  - Receive notifications
  - View attendance records

### 🤖 AI Service (Gemini)
- **Role**: External AI provider
- **Interactions**:
  - Generate quizzes from notes
  - Power chatbot responses
  - Content analysis

### ⛓️ Blockchain
- **Role**: Immutable record storage
- **Interactions**:
  - Store attendance records
  - Verify grades
  - Immutable audit trail

## 🎯 Key Points

1. **Single Process**: Gyandeep is represented as a single process
2. **External Entities**: All users and services outside the system boundary
3. **Data Flows**: Bidirectional communication between entities and system
4. **No Internal Details**: Shows only external interactions
5. **Foundation for Level 1**: This context diagram expands into Level 1 DFD

## 🔗 Related Diagrams

- **Level 1 DFD**: [DFD_LEVEL1.md](./DFD_LEVEL1.md) - Detailed process breakdown
- **Visual Diagram**: [context-diagram.html](./context-diagram.html) - Interactive HTML version
