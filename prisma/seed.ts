import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function generateOdId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function main() {
  console.log('Starting seed...');

  // Clean existing data
  await prisma.activityLog.deleteMany();
  await prisma.userNoteAccess.deleteMany();
  await prisma.attemptAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quizSubmission.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.ticketReply.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.teacherInsight.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.sessionNote.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.centralizedNote.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.timetableEntry.deleteMany();
  await prisma.userSubject.deleteMany();
  await prisma.classSubject.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.defaultSubject.deleteMany();

  console.log('Creating default subjects...');
  const defaultSubjects = await Promise.all([
    prisma.defaultSubject.create({ data: { odId: generateOdId(), name: 'Mathematics' } }),
    prisma.defaultSubject.create({ data: { odId: generateOdId(), name: 'Science' } }),
    prisma.defaultSubject.create({ data: { odId: generateOdId(), name: 'English' } }),
    prisma.defaultSubject.create({ data: { odId: generateOdId(), name: 'History' } }),
    prisma.defaultSubject.create({ data: { odId: generateOdId(), name: 'Geography' } }),
    prisma.defaultSubject.create({ data: { odId: generateOdId(), name: 'Computer Science' } }),
    prisma.defaultSubject.create({ data: { odId: generateOdId(), name: 'Physics' } }),
    prisma.defaultSubject.create({ data: { odId: generateOdId(), name: 'Chemistry' } }),
    prisma.defaultSubject.create({ data: { odId: generateOdId(), name: 'Biology' } }),
  ]);

  console.log('Creating classes...');
  const class9A = await prisma.class.create({
    data: { odId: 'CLASS-9A-001', name: 'Class 9A' }
  });
  const class10A = await prisma.class.create({
    data: { odId: 'CLASS-10A-001', name: 'Class 10A' }
  });
  const class11Science = await prisma.class.create({
    data: { odId: 'CLASS-11SCI-001', name: 'Class 11 Science' }
  });

  console.log('Creating subjects...');
  const math = await prisma.subject.create({
    data: { odId: 'SUBJ-MATH-001', name: 'Mathematics' }
  });
  const science = await prisma.subject.create({
    data: { odId: 'SUBJ-SCI-001', name: 'Science' }
  });
  const english = await prisma.subject.create({
    data: { odId: 'SUBJ-ENG-001', name: 'English' }
  });
  const physics = await prisma.subject.create({
    data: { odId: 'SUBJ-PHY-001', name: 'Physics' }
  });
  const chemistry = await prisma.subject.create({
    data: { odId: 'SUBJ-CHEM-001', name: 'Chemistry' }
  });
  const computerScience = await prisma.subject.create({
    data: { odId: 'SUBJ-CS-001', name: 'Computer Science' }
  });

  console.log('Creating admin user...');
  const hashedPassword = await hashPassword('admin123');
  const admin = await prisma.user.create({
    data: {
      odId: 'USER-ADMIN-001',
      email: 'admin@gyandeep.edu',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'admin',
      emailVerified: true,
      xp: 500,
      coins: 1000,
      level: 5,
      streak: 30,
      preferences: { theme: 'dark', notifications: true }
    }
  });

  console.log('Creating teachers...');
  const teacherJohn = await prisma.user.create({
    data: {
      odId: 'USER-TCHR-001',
      email: 'john.smith@gyandeep.edu',
      password: await hashPassword('teacher123'),
      name: 'John Smith',
      role: 'teacher',
      emailVerified: true,
      xp: 1500,
      coins: 2500,
      level: 12,
      streak: 45,
      preferences: { theme: 'light', notifications: true }
    }
  });

  const teacherSarah = await prisma.user.create({
    data: {
      odId: 'USER-TCHR-002',
      email: 'sarah.johnson@gyandeep.edu',
      password: await hashPassword('teacher123'),
      name: 'Sarah Johnson',
      role: 'teacher',
      emailVerified: true,
      xp: 1200,
      coins: 2000,
      level: 10,
      streak: 28,
      preferences: { theme: 'dark', notifications: false }
    }
  });

  const teacherMike = await prisma.user.create({
    data: {
      odId: 'USER-TCHR-003',
      email: 'mike.wilson@gyandeep.edu',
      password: await hashPassword('teacher123'),
      name: 'Mike Wilson',
      role: 'teacher',
      emailVerified: true,
      xp: 800,
      coins: 1500,
      level: 8,
      streak: 15,
      preferences: { theme: 'light', notifications: true }
    }
  });

  console.log('Creating students...');
  const studentPassword = await hashPassword('student123');
  const students = await Promise.all([
    prisma.user.create({
      data: {
        odId: 'USER-STDT-001',
        email: 'alice.brown@student.gyandeep.edu',
        password: studentPassword,
        name: 'Alice Brown',
        role: 'student',
        classId: class9A.id,
        emailVerified: true,
        xp: 350,
        coins: 500,
        level: 4,
        streak: 12,
        performance: { averageScore: 85, quizzesTaken: 10 }
      }
    }),
    prisma.user.create({
      data: {
        odId: 'USER-STDT-002',
        email: 'bob.jones@student.gyandeep.edu',
        password: studentPassword,
        name: 'Bob Jones',
        role: 'student',
        classId: class9A.id,
        emailVerified: true,
        xp: 420,
        coins: 650,
        level: 5,
        streak: 18,
        performance: { averageScore: 78, quizzesTaken: 12 }
      }
    }),
    prisma.user.create({
      data: {
        odId: 'USER-STDT-003',
        email: 'carol.white@student.gyandeep.edu',
        password: studentPassword,
        name: 'Carol White',
        role: 'student',
        classId: class9A.id,
        emailVerified: true,
        xp: 280,
        coins: 400,
        level: 3,
        streak: 7,
        performance: { averageScore: 72, quizzesTaken: 8 }
      }
    }),
    prisma.user.create({
      data: {
        odId: 'USER-STDT-004',
        email: 'david.lee@student.gyandeep.edu',
        password: studentPassword,
        name: 'David Lee',
        role: 'student',
        classId: class10A.id,
        emailVerified: true,
        xp: 550,
        coins: 800,
        level: 6,
        streak: 25,
        performance: { averageScore: 92, quizzesTaken: 15 }
      }
    }),
    prisma.user.create({
      data: {
        odId: 'USER-STDT-005',
        email: 'emma.davis@student.gyandeep.edu',
        password: studentPassword,
        name: 'Emma Davis',
        role: 'student',
        classId: class10A.id,
        emailVerified: true,
        xp: 310,
        coins: 450,
        level: 4,
        streak: 10,
        performance: { averageScore: 68, quizzesTaken: 9 }
      }
    }),
    prisma.user.create({
      data: {
        odId: 'USER-STDT-006',
        email: 'frank.miller@student.gyandeep.edu',
        password: studentPassword,
        name: 'Frank Miller',
        role: 'student',
        classId: class11Science.id,
        emailVerified: true,
        xp: 620,
        coins: 950,
        level: 7,
        streak: 32,
        performance: { averageScore: 88, quizzesTaken: 18 }
      }
    }),
    prisma.user.create({
      data: {
        odId: 'USER-STDT-007',
        email: 'grace.taylor@student.gyandeep.edu',
        password: studentPassword,
        name: 'Grace Taylor',
        role: 'student',
        classId: class11Science.id,
        emailVerified: true,
        xp: 480,
        coins: 700,
        level: 5,
        streak: 20,
        performance: { averageScore: 81, quizzesTaken: 14 }
      }
    }),
    prisma.user.create({
      data: {
        odId: 'USER-STDT-008',
        email: 'henry.wilson@student.gyandeep.edu',
        password: studentPassword,
        name: 'Henry Wilson',
        role: 'student',
        classId: class11Science.id,
        emailVerified: true,
        xp: 390,
        coins: 580,
        level: 4,
        streak: 14,
        performance: { averageScore: 75, quizzesTaken: 11 }
      }
    }),
  ]);

  console.log('Creating class-subject associations...');
  const classSubjects = await Promise.all([
    prisma.classSubject.create({
      data: {
        odId: generateOdId(),
        classId: class9A.id,
        subjectId: math.id,
        primaryTeacherId: teacherJohn.id,
        semester: 'Fall 2024'
      }
    }),
    prisma.classSubject.create({
      data: {
        odId: generateOdId(),
        classId: class9A.id,
        subjectId: science.id,
        primaryTeacherId: teacherSarah.id,
        semester: 'Fall 2024'
      }
    }),
    prisma.classSubject.create({
      data: {
        odId: generateOdId(),
        classId: class9A.id,
        subjectId: english.id,
        primaryTeacherId: teacherMike.id,
        semester: 'Fall 2024'
      }
    }),
    prisma.classSubject.create({
      data: {
        odId: generateOdId(),
        classId: class10A.id,
        subjectId: math.id,
        primaryTeacherId: teacherJohn.id,
        semester: 'Fall 2024'
      }
    }),
    prisma.classSubject.create({
      data: {
        odId: generateOdId(),
        classId: class10A.id,
        subjectId: science.id,
        primaryTeacherId: teacherSarah.id,
        semester: 'Fall 2024'
      }
    }),
    prisma.classSubject.create({
      data: {
        odId: generateOdId(),
        classId: class10A.id,
        subjectId: computerScience.id,
        primaryTeacherId: teacherMike.id,
        semester: 'Fall 2024'
      }
    }),
    prisma.classSubject.create({
      data: {
        odId: generateOdId(),
        classId: class11Science.id,
        subjectId: math.id,
        primaryTeacherId: teacherJohn.id,
        semester: 'Fall 2024'
      }
    }),
    prisma.classSubject.create({
      data: {
        odId: generateOdId(),
        classId: class11Science.id,
        subjectId: physics.id,
        primaryTeacherId: teacherSarah.id,
        semester: 'Fall 2024'
      }
    }),
    prisma.classSubject.create({
      data: {
        odId: generateOdId(),
        classId: class11Science.id,
        subjectId: chemistry.id,
        primaryTeacherId: teacherMike.id,
        semester: 'Fall 2024'
      }
    }),
  ]);

  console.log('Creating teacher expertise...');
  await Promise.all([
    prisma.userSubject.create({ data: { odId: generateOdId(), userId: teacherJohn.id, subjectId: math.id, certified: true } }),
    prisma.userSubject.create({ data: { odId: generateOdId(), userId: teacherSarah.id, subjectId: science.id, certified: true } }),
    prisma.userSubject.create({ data: { odId: generateOdId(), userId: teacherSarah.id, subjectId: physics.id, certified: true } }),
    prisma.userSubject.create({ data: { odId: generateOdId(), userId: teacherMike.id, subjectId: english.id, certified: true } }),
    prisma.userSubject.create({ data: { odId: generateOdId(), userId: teacherMike.id, subjectId: computerScience.id, certified: true } }),
    prisma.userSubject.create({ data: { odId: generateOdId(), userId: teacherMike.id, subjectId: chemistry.id, certified: true } }),
  ]);

  console.log('Creating timetable entries...');
  const timetableEntries = await Promise.all([
    prisma.timetableEntry.create({
      data: {
        odId: generateOdId(),
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        subjectId: math.id,
        teacherId: teacherJohn.id,
        classId: class9A.id,
        room: 'Room 101',
        semester: 'Fall 2024'
      }
    }),
    prisma.timetableEntry.create({
      data: {
        odId: generateOdId(),
        day: 'Monday',
        startTime: '10:30',
        endTime: '11:30',
        subjectId: science.id,
        teacherId: teacherSarah.id,
        classId: class9A.id,
        room: 'Room 102',
        semester: 'Fall 2024'
      }
    }),
    prisma.timetableEntry.create({
      data: {
        odId: generateOdId(),
        day: 'Tuesday',
        startTime: '09:00',
        endTime: '10:00',
        subjectId: english.id,
        teacherId: teacherMike.id,
        classId: class9A.id,
        room: 'Room 103',
        semester: 'Fall 2024'
      }
    }),
    prisma.timetableEntry.create({
      data: {
        odId: generateOdId(),
        day: 'Wednesday',
        startTime: '11:00',
        endTime: '12:00',
        subjectId: math.id,
        teacherId: teacherJohn.id,
        classId: class10A.id,
        room: 'Room 201',
        semester: 'Fall 2024'
      }
    }),
    prisma.timetableEntry.create({
      data: {
        odId: generateOdId(),
        day: 'Thursday',
        startTime: '14:00',
        endTime: '15:00',
        subjectId: computerScience.id,
        teacherId: teacherMike.id,
        classId: class10A.id,
        room: 'Computer Lab 1',
        semester: 'Fall 2024'
      }
    }),
  ]);

  console.log('Creating class sessions...');
  const now = new Date();
  const session1 = await prisma.classSession.create({
    data: {
      odId: generateOdId(),
      code: 'MATH9A-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      teacherId: teacherJohn.id,
      classId: class9A.id,
      subjectId: math.id,
      expiry: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      sessionStatus: 'active',
      quizPublished: false
    }
  });

  const session2 = await prisma.classSession.create({
    data: {
      odId: generateOdId(),
      code: 'SCI9A-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      teacherId: teacherSarah.id,
      classId: class9A.id,
      subjectId: science.id,
      expiry: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      sessionStatus: 'active',
      quizPublished: true
    }
  });

  console.log('Creating quizzes...');
  const quiz1 = await prisma.quiz.create({
    data: {
      odId: generateOdId(),
      sessionId: session2.id,
      teacherId: teacherSarah.id,
      title: 'Science Quiz - Chapter 1',
      questionsJson: '[{"question":"What is photosynthesis?","options":"A process by which plants convert light to energy|A type of animal|A chemical compound|A geological process","correctAnswer":"A process by which plants convert light to energy"}]',
      published: true,
      publishedAt: new Date(),
      quizType: 'main'
    }
  });

  console.log('Creating quiz questions...');
  const questions = await Promise.all([
    prisma.quizQuestion.create({
      data: {
        odId: generateOdId(),
        quizId: quiz1.id,
        createdById: teacherSarah.id,
        question: 'What is photosynthesis?',
        options: JSON.stringify(['A process by which plants convert light to energy', 'A type of animal', 'A chemical compound', 'A geological process']),
        correctAnswer: 'A process by which plants convert light to energy',
        difficulty: 'medium',
        tags: 'biology,plants',
        orderIndex: 0
      }
    }),
    prisma.quizQuestion.create({
      data: {
        odId: generateOdId(),
        quizId: quiz1.id,
        createdById: teacherSarah.id,
        question: 'What gas do plants release during photosynthesis?',
        options: JSON.stringify(['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen']),
        correctAnswer: 'Oxygen',
        difficulty: 'easy',
        tags: 'biology,plants,gases',
        orderIndex: 1
      }
    }),
    prisma.quizQuestion.create({
      data: {
        odId: generateOdId(),
        quizId: quiz1.id,
        createdById: teacherSarah.id,
        question: 'What is the primary source of energy for photosynthesis?',
        options: JSON.stringify(['Sunlight', 'Water', 'Soil', 'Carbon Dioxide']),
        correctAnswer: 'Sunlight',
        difficulty: 'easy',
        tags: 'biology,energy',
        orderIndex: 2
      }
    }),
  ]);

  console.log('Creating quiz attempts...');
  const attempt1 = await prisma.quizAttempt.create({
    data: {
      odId: generateOdId(),
      quizId: quiz1.id,
      studentId: students[0].id,
      answersJson: JSON.stringify({ q1: 'A process by which plants convert light to energy', q2: 'Oxygen', q3: 'Sunlight' }),
      correctCount: 3,
      totalQuestions: 3,
      percentage: 100,
      attemptNumber: 1,
      startedAt: new Date(now.getTime() - 30 * 60 * 1000),
      submittedAt: new Date(now.getTime() - 25 * 60 * 1000),
      timeTakenSeconds: 300
    }
  });

  const attempt2 = await prisma.quizAttempt.create({
    data: {
      odId: generateOdId(),
      quizId: quiz1.id,
      studentId: students[1].id,
      answersJson: JSON.stringify({ q1: 'A process by which plants convert light to energy', q2: 'Carbon Dioxide', q3: 'Sunlight' }),
      correctCount: 2,
      totalQuestions: 3,
      percentage: 66.67,
      attemptNumber: 1,
      startedAt: new Date(now.getTime() - 45 * 60 * 1000),
      submittedAt: new Date(now.getTime() - 35 * 60 * 1000),
      timeTakenSeconds: 600
    }
  });

  console.log('Creating attempt answers...');
  await Promise.all([
    prisma.attemptAnswer.create({ data: { odId: generateOdId(), attemptId: attempt1.id, questionId: questions[0].id, answerGiven: 'A process by which plants convert light to energy', isCorrect: true, marksAwarded: 1 } }),
    prisma.attemptAnswer.create({ data: { odId: generateOdId(), attemptId: attempt1.id, questionId: questions[1].id, answerGiven: 'Oxygen', isCorrect: true, marksAwarded: 1 } }),
    prisma.attemptAnswer.create({ data: { odId: generateOdId(), attemptId: attempt1.id, questionId: questions[2].id, answerGiven: 'Sunlight', isCorrect: true, marksAwarded: 1 } }),
    prisma.attemptAnswer.create({ data: { odId: generateOdId(), attemptId: attempt2.id, questionId: questions[0].id, answerGiven: 'A process by which plants convert light to energy', isCorrect: true, marksAwarded: 1 } }),
    prisma.attemptAnswer.create({ data: { odId: generateOdId(), attemptId: attempt2.id, questionId: questions[1].id, answerGiven: 'Carbon Dioxide', isCorrect: false, marksAwarded: 0 } }),
    prisma.attemptAnswer.create({ data: { odId: generateOdId(), attemptId: attempt2.id, questionId: questions[2].id, answerGiven: 'Sunlight', isCorrect: true, marksAwarded: 1 } }),
  ]);

  console.log('Creating centralized notes...');
  await Promise.all([
    prisma.centralizedNote.create({
      data: {
        odId: generateOdId(),
        classId: class9A.id,
        subjectId: math.id,
        unitNumber: 1,
        unitName: 'Algebra',
        title: 'Introduction to Algebra',
        content: 'Algebra is a branch of mathematics dealing with symbols and the rules for manipulating those symbols...',
        noteType: 'class_notes',
        teacherId: teacherJohn.id
      }
    }),
    prisma.centralizedNote.create({
      data: {
        odId: generateOdId(),
        classId: class9A.id,
        subjectId: science.id,
        unitNumber: 1,
        unitName: 'Biology Basics',
        title: 'Cell Structure and Function',
        content: 'The cell is the basic unit of life. All living organisms are composed of cells...',
        noteType: 'class_notes',
        teacherId: teacherSarah.id
      }
    }),
    prisma.centralizedNote.create({
      data: {
        odId: generateOdId(),
        classId: class11Science.id,
        subjectId: physics.id,
        unitNumber: 1,
        unitName: 'Mechanics',
        title: 'Laws of Motion',
        content: 'Newton\'s three laws of motion describe the relationship between the motion of an object and the forces acting on it...',
        noteType: 'class_notes',
        teacherId: teacherSarah.id
      }
    }),
  ]);

  console.log('Creating attendance records...');
  await Promise.all([
    prisma.attendance.create({ data: { odId: generateOdId(), sessionId: session1.id, studentId: students[0].id, verifiedById: teacherJohn.id, status: 'present' } }),
    prisma.attendance.create({ data: { odId: generateOdId(), sessionId: session1.id, studentId: students[1].id, verifiedById: teacherJohn.id, status: 'present' } }),
    prisma.attendance.create({ data: { odId: generateOdId(), sessionId: session1.id, studentId: students[2].id, verifiedById: teacherJohn.id, status: 'late' } }),
    prisma.attendance.create({ data: { odId: generateOdId(), sessionId: session2.id, studentId: students[0].id, verifiedById: teacherSarah.id, status: 'present' } }),
    prisma.attendance.create({ data: { odId: generateOdId(), sessionId: session2.id, studentId: students[1].id, verifiedById: teacherSarah.id, status: 'present' } }),
  ]);

  console.log('Creating grades...');
  await Promise.all([
    prisma.grade.create({
      data: {
        odId: generateOdId(),
        studentId: students[0].id,
        subjectId: math.id,
        category: 'quiz',
        title: 'Algebra Quiz 1',
        score: 85,
        maxScore: 100,
        date: '2024-10-15',
        teacherId: teacherJohn.id
      }
    }),
    prisma.grade.create({
      data: {
        odId: generateOdId(),
        studentId: students[1].id,
        subjectId: math.id,
        category: 'quiz',
        title: 'Algebra Quiz 1',
        score: 72,
        maxScore: 100,
        date: '2024-10-15',
        teacherId: teacherJohn.id
      }
    }),
    prisma.grade.create({
      data: {
        odId: generateOdId(),
        studentId: students[3].id,
        subjectId: science.id,
        category: 'exam',
        title: 'Midterm Exam',
        score: 92,
        maxScore: 100,
        date: '2024-10-20',
        teacherId: teacherSarah.id
      }
    }),
  ]);

  console.log('Creating support tickets...');
  const ticket1 = await prisma.ticket.create({
    data: {
      odId: generateOdId(),
      userId: students[0].id,
      userName: 'Alice Brown',
      classId: class9A.id,
      subject: 'Mathematics',
      message: 'I have a question about quadratic equations. Can someone explain the formula?',
      category: 'academic',
      priority: 'medium',
      status: 'open'
    }
  });

  await prisma.ticketReply.create({
    data: {
      odId: generateOdId(),
      ticketId: ticket1.id,
      userId: teacherJohn.id,
      userName: 'John Smith',
      message: 'Sure Alice! The quadratic formula is x = (-b ± √(b²-4ac)) / 2a. This helps find roots of any quadratic equation ax² + bx + c = 0.'
    }
  });

  console.log('Creating notifications...');
  await Promise.all([
    prisma.notification.create({
      data: {
        odId: generateOdId(),
        userId: students[0].id,
        type: 'quiz_result',
        title: 'Quiz Results Available',
        message: 'Your quiz "Science Quiz - Chapter 1" has been graded. Score: 100%',
        relatedId: quiz1.id,
        relatedType: 'quiz'
      }
    }),
    prisma.notification.create({
      data: {
        odId: generateOdId(),
        userId: students[1].id,
        type: 'class_session',
        title: 'New Class Session Started',
        message: 'John Smith started a new session for Class 9A - Mathematics',
        relatedId: session1.id,
        relatedType: 'session'
      }
    }),
    prisma.notification.create({
      data: {
        odId: generateOdId(),
        userId: teacherJohn.id,
        type: 'ticket_response',
        title: 'Ticket Updated',
        message: 'Alice Brown replied to your response on ticket #1',
        relatedId: ticket1.id,
        relatedType: 'ticket'
      }
    }),
  ]);

  console.log('Creating announcements...');
  await prisma.announcement.create({
    data: {
      odId: generateOdId(),
      authorId: admin.id,
      classId: class9A.id,
      subjectId: math.id,
      title: 'Math Competition Next Week',
      content: 'We are excited to announce that there will be a math competition next Friday. All students are encouraged to participate!',
      priority: 'high',
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  console.log('Creating teacher insights...');
  await prisma.teacherInsight.create({
    data: {
      odId: generateOdId(),
      teacherId: teacherSarah.id,
      sessionId: session2.id,
      subjectId: science.id,
      insightText: 'Based on the quiz results, 80% of students understood the concept of photosynthesis well. However, 40% struggled with the gas exchange process. Consider reviewing this topic in the next session.',
      actedOnById: null
    }
  });

  console.log('Creating activity logs...');
  await Promise.all([
    prisma.activityLog.create({ data: { userId: students[0].id, type: 'QUIZ_COMPLETED', xpEarned: 50, details: 'Completed Science Quiz with 100% score' } }),
    prisma.activityLog.create({ data: { userId: students[0].id, type: 'STREAK_BONUS', xpEarned: 10, details: '7-day streak bonus' } }),
    prisma.activityLog.create({ data: { userId: students[1].id, type: 'QUIZ_COMPLETED', xpEarned: 35, details: 'Completed Science Quiz with 66.67% score' } }),
    prisma.activityLog.create({ data: { userId: students[3].id, type: 'ATTENDANCE_MARKED', xpEarned: 5, details: 'On-time attendance bonus' } }),
  ]);

  console.log('Creating audit logs...');
  await Promise.all([
    prisma.auditLog.create({ data: { odId: generateOdId(), type: 'USER_LOGIN', userId: admin.id, details: { ip: '192.168.1.1', browser: 'Chrome' } } }),
    prisma.auditLog.create({ data: { odId: generateOdId(), type: 'QUIZ_PUBLISHED', userId: teacherSarah.id, details: { quizId: quiz1.id } } }),
    prisma.auditLog.create({ data: { odId: generateOdId(), type: 'SESSION_CREATED', userId: teacherJohn.id, details: { sessionId: session1.id } } }),
  ]);

  console.log('Seed completed successfully!');
  console.log('Summary:');
  console.log(`  - ${defaultSubjects.length} default subjects`);
  console.log(`  - 3 classes`);
  console.log(`  - ${6} subjects`);
  console.log(`  - 1 admin, 3 teachers, 8 students`);
  console.log(`  - ${classSubjects.length} class-subject associations`);
  console.log(`  - ${timetableEntries.length} timetable entries`);
  console.log(`  - 2 class sessions`);
  console.log(`  - 1 quiz with 3 questions`);
  console.log(`  - 2 quiz attempts`);
  console.log(`  - 3 centralized notes`);
  console.log(`  - 5 attendance records`);
  console.log(`  - 3 grades`);
  console.log(`  - 1 support ticket`);
  console.log(`  - 3 notifications`);
  console.log(`  - 1 announcement`);
  console.log(`  - 1 teacher insight`);
  console.log(`  - 4 activity logs`);
  console.log(`  - 3 audit logs`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
