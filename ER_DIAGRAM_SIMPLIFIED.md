# Gyandeep ER Diagram (Simplified)

## Entities

### Strong Entities
| Entity | PK | Description |
|--------|-----|-------------|
| CLASS | id | Student class/grade |
| SUBJECT | id | Academic subjects |
| USER | id | Students, Teachers, Admins |
| CLASSSESSION | id | Active class sessions |
| TIMETABLEENTRY | id | Scheduled class slots |
| QUIZ | id | Teacher-created quizzes |
| CENTRALIZEDNOTE | id | Shared learning notes |
| ATTENDANCE | id | Student attendance |
| GRADE | id | Student grades |
| TICKET | id | Support tickets |
| NOTIFICATION | id | User notifications |
| ANNOUNCEMENT | id | Class announcements |

### Weak Entities
| Weak Entity | Owner | Description |
|-------------|-------|-------------|
| CLASSSUBJECT | CLASS + SUBJECT | Class-subject linking |
| SESSIONNOTE | CLASSSESSION | Session-specific notes |
| QUIZQUESTION | QUIZ | Quiz questions |
| QUIZATTEMPT | QUIZ + USER | Student quiz attempts |
| ATTEMPTANSWER | QUIZATTEMPT | Question answers |
| TICKETREPLY | TICKET | Ticket responses |
| USERSUBJECT | USER + SUBJECT | Teacher expertise |

---

## Relationships

```
CLASS ──────────1:N──────────► USER (enrolled students)
CLASS ──────────1:N──────────► CLASSSESSION (class sessions)
CLASS ──────────1:N──────────► CLASSSUBJECT (subjects offered)
CLASS ──────────1:N──────────► CENTRALIZEDNOTE (class notes)
CLASS ──────────1:N──────────► TICKET (class tickets)
CLASS ──────────1:N──────────► ANNOUNCEMENTS (class announcements)

SUBJECT ────────1:N──────────► CLASSSESSION (sessions covering subject)
SUBJECT ────────1:N──────────► CLASSSUBJECT (class offerings)
SUBJECT ────────1:N──────────► CENTRALIZEDNOTE (subject notes)
SUBJECT ────────1:N──────────► GRADE (subject grades)
SUBJECT ────────1:N──────────► ANNOUNCEMENT (subject announcements)

USER ───────────1:N──────────► CLASSSESSION (teacher sessions)
USER ───────────1:N──────────► QUIZ (teacher quizzes)
USER ───────────1:N──────────► CENTRALIZEDNOTE (uploaded notes)
USER ───────────1:N──────────► SESSIONNOTE (authored notes)
USER ───────────1:N──────────► GRADE (given/received grades)
USER ───────────1:N──────────► ATTENDANCE (marked/verified)
USER ───────────1:N──────────► QUIZATTEMPT (student attempts)
USER ───────────1:N──────────► TICKET (created/assigned)
USER ───────────1:N──────────► TICKETREPLY (replied)
USER ───────────1:N──────────► NOTIFICATION (received)
USER ───────────1:N──────────► ANNOUNCEMENT (posted)
USER ───────────1:N──────────► USERSUBJECT (subject expertise)

CLASSSESSION ──1:N──────────► SESSIONNOTE (session notes)
CLASSSESSION ──1:N──────────► QUIZ (session quizzes)
CLASSSESSION ──1:N──────────► ATTENDANCE (student attendance)
CLASSSESSION ──1:N──────────► GRADE (session grades)
CLASSSESSION ──1:N──────────► CENTRALIZEDNOTE (linked notes)

QUIZ ──────────1:N──────────► QUIZQUESTION (quiz questions)
QUIZ ──────────1:N──────────► QUIZATTEMPT (student attempts)

QUIZATTEMPT ──1:N──────────► ATTEMPTANSWER (question answers)

QUIZQUESTION ──1:N──────────► ATTEMPTANSWER (attempted answers)

TICKET ────────1:N──────────► TICKETREPLY (ticket replies)
```

---

## Cardinality Summary

| Parent | Child | Cardinality |
|--------|-------|-------------|
| CLASS | USER | 1:N |
| CLASS | CLASSSESSION | 1:N |
| CLASS | CLASSSUBJECT | 1:N |
| CLASS | CENTRALIZEDNOTE | 1:N |
| CLASS | TICKET | 1:N |
| CLASS | ANNOUNCEMENT | 1:N |
| SUBJECT | CLASSSESSION | 1:N |
| SUBJECT | CLASSSUBJECT | 1:N |
| SUBJECT | CENTRALIZEDNOTE | 1:N |
| SUBJECT | GRADE | 1:N |
| USER | CLASSSESSION | 1:N |
| USER | QUIZ | 1:N |
| USER | CENTRALIZEDNOTE | 1:N |
| USER | SESSIONNOTE | 1:N |
| USER | GRADE | 1:N |
| USER | ATTENDANCE | 1:N |
| USER | QUIZATTEMPT | 1:N |
| USER | TICKET | 1:N |
| USER | TICKETREPLY | 1:N |
| USER | NOTIFICATION | 1:N |
| USER | ANNOUNCEMENT | 1:N |
| USER | USERSUBJECT | 1:N |
| CLASSSESSION | SESSIONNOTE | 1:N |
| CLASSSESSION | QUIZ | 1:N |
| CLASSSESSION | ATTENDANCE | 1:N |
| CLASSSESSION | GRADE | 1:N |
| CLASSSESSION | CENTRALIZEDNOTE | 1:N |
| QUIZ | QUIZQUESTION | 1:N |
| QUIZ | QUIZATTEMPT | 1:N |
| QUIZATTEMPT | ATTEMPTANSWER | 1:N |
| QUIZQUESTION | ATTEMPTANSWER | 1:N |
| TICKET | TICKETREPLY | 1:N |

---

## Relationship Descriptions

| Relationship | Description |
|--------------|-------------|
| CLASS → USER | Students enrolled in one class |
| CLASS → CLASSSESSION | Class has multiple sessions over time |
| CLASS → CLASSSUBJECT | Class offers multiple subjects |
| CLASS → CENTRALIZEDNOTE | Class shares notes |
| CLASS → TICKET | Class has support tickets |
| CLASS → ANNOUNCEMENT | Class receives announcements |
| SUBJECT → CLASSSESSION | Subject taught in sessions |
| SUBJECT → CLASSSUBJECT | Subject offered to classes |
| SUBJECT → CENTRALIZEDNOTE | Subject has study notes |
| SUBJECT → GRADE | Subject has grade records |
| USER → CLASSSESSION | Teacher conducts sessions |
| USER → QUIZ | Teacher creates quizzes |
| USER → CENTRALIZEDNOTE | Teacher uploads notes |
| USER → GRADE | Teacher gives / student receives grades |
| USER → ATTENDANCE | Teacher verifies / student marked |
| USER → QUIZATTEMPT | Student attempts quizzes |
| USER → TICKET | User creates / admin assigned tickets |
| USER → NOTIFICATION | User receives notifications |
| CLASSSESSION → SESSIONNOTE | Session has notes |
| CLASSSESSION → QUIZ | Session has quizzes |
| CLASSSESSION → ATTENDANCE | Session tracks attendance |
| CLASSSESSION → GRADE | Session has grades |
| QUIZ → QUIZQUESTION | Quiz contains questions |
| QUIZ → QUIZATTEMPT | Quiz attempted by students |
| QUIZATTEMPT → ATTEMPTANSWER | Attempt answers questions |
| TICKET → TICKETREPLY | Ticket has replies |

---

## Visual Diagram

```
        ┌──────────┐
        │  CLASS   │◄───────────────────────────────┐
        └────┬─────┘                                │
             │ 1:N                                   │
    ┌────────┼────────┐              ┌──────────────┐│
    │        │        │              │    USER      ││
    ▼        ▼        ▼              └───────┬──────┘│
┌───────┐ ┌───────┐ ┌────────┐               │ 1:N   │
│SESSION│ │ NOTES │ │TICKETS │               │       │
└───┬───┘ └───┬───┘ └───┬────┘               │       │
    │1:N      │1:N      │1:N                  │       │
    ▼         ▼         ▼                     ▼       ▼
┌─────────┐ ┌─────────┐ ┌────────┐    ┌──────────────────────┐
│  QUIZ   │ │ ATTEND │ │ GRADE  │    │     ANNOUNCEMENT    │
└────┬────┘ └────┬────┘ └───┬────┘    └──────────────────────┘
     │1:N         │1:N        │1:N
     ▼            ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│QUESTION │ │ANSWER  │ │ NOTIF   │
└────┬────┘ └────┬────┘ └─────────┘
     │1:N         │1:N
     ▼            ▼
┌─────────┐ ┌─────────┐
│ATTEMPT  │ │ TICKET  │
└────┬────┘ │ REPLY   │
     │1:N   └─────────┘
     ▼
┌─────────┐
│ANSWERS  │
└─────────┘

◄───────1:N───────► = One-to-Many relationship
```
