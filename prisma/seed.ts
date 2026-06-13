import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function generateOdId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

async function main() {
  console.log('🚀 Starting Perfect Seed for Gyandeep...');

  // Clean existing data in correct order
  console.log('🧹 Cleaning existing data...');
  const collections = [
    'activityLog', 'userNoteAccess', 'attemptAnswer', 'quizAttempt', 'quizSubmission',
    'attendance', 'grade', 'ticketReply', 'ticket', 'teacherInsight', 'announcement',
    'notification', 'sessionNote', 'quizQuestion', 'quiz', 'centralizedNote',
    'classSession', 'timetableEntry', 'userSubject', 'classSubject', 'user',
    'subject', 'class', 'auditLog', 'idempotencyKey', 'defaultSubject'
  ];
  
  for (const collection of collections) {
    try {
      // @ts-ignore
      await prisma[collection].deleteMany();
    } catch (e) {
      console.warn(`Could not clean ${collection}: ${e.message}`);
    }
  }

  console.log('📚 Creating Subjects...');
  const subjectNames = [
    'Mathematics', 'Science', 'English', 'History', 'Geography', 
    'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics'
  ];
  
  const subjects = await Promise.all(
    subjectNames.map(name => 
      prisma.subject.create({
        data: { odId: generateOdId('SUBJ'), name }
      })
    )
  );
  
  const subjectMap = subjects.reduce((acc, s) => ({ ...acc, [s.name]: s }), {} as Record<string, any>);

  console.log('🏫 Creating Classes...');
  const classNames = ['Class 9A', 'Class 9B', 'Class 10A', 'Class 10B', 'Class 11 Science', 'Class 12 Science'];
  const classes = await Promise.all(
    classNames.map(name => 
      prisma.class.create({
        data: { odId: generateOdId('CLASS'), name }
      })
    )
  );
  const classMap = classes.reduce((acc, c) => ({ ...acc, [c.name]: c }), {} as Record<string, any>);

  console.log('👤 Creating Users...');
  const commonPassword = await hashPassword('password123');
  
  // Admins
  const admin = await prisma.user.create({
    data: {
      odId: 'USER-ADMIN-001',
      email: 'admin@gyandeep.edu',
      password: await hashPassword('admin123'),
      name: 'System Administrator',
      role: 'admin',
      emailVerified: true,
      xp: 5000,
      coins: 10000,
      level: 50,
      preferences: { theme: 'dark', notifications: true, highContrast: false, fontScale: 1.0 }
    }
  });

  const subAdmin = await prisma.user.create({
    data: {
      odId: 'USER-ADMIN-002',
      email: 'coordinator@gyandeep.edu',
      password: await hashPassword('admin123'),
      name: 'Academic Coordinator',
      role: 'admin',
      emailVerified: true,
      xp: 3000,
      coins: 5000,
      level: 30,
    }
  });

  // Teachers
  const teacherData = [
    { name: 'John Smith', email: 'john.smith@gyandeep.edu', subjects: ['Mathematics', 'Physics'] },
    { name: 'Sarah Johnson', email: 'sarah.j@gyandeep.edu', subjects: ['Science', 'Biology', 'Chemistry'] },
    { name: 'Michael Brown', email: 'm.brown@gyandeep.edu', subjects: ['English', 'History'] },
    { name: 'Dr. Emily Wilson', email: 'emily.w@gyandeep.edu', subjects: ['Computer Science', 'Mathematics'] },
    { name: 'Prof. David Miller', email: 'd.miller@gyandeep.edu', subjects: ['Economics', 'Geography'] },
  ];

  const teachers = await Promise.all(
    teacherData.map(async (t) => 
      prisma.user.create({
        data: {
          odId: generateOdId('TCHR'),
          email: t.email,
          password: await hashPassword('teacher123'),
          name: t.name,
          role: 'teacher',
          emailVerified: true,
          xp: 1500 + Math.floor(Math.random() * 1000),
          coins: 3000,
          level: 15,
          streak: 45,
          faceImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          preferences: { theme: 'light', notifications: true }
        }
      })
    )
  );

  // Teacher expertise
  for (let i = 0; i < teacherData.length; i++) {
    for (const subName of teacherData[i].subjects) {
      await prisma.userSubject.create({
        data: {
          odId: generateOdId('USUB'),
          userId: teachers[i].id,
          subjectId: subjectMap[subName].id,
          certified: true
        }
      });
    }
  }

  // Students
  const studentNames = [
    'Aarav Sharma', 'Priya Patel', 'Rahul Kumar', 'Ananya Singh', 'Ishaan Gupta',
    'Sanya Malhotra', 'Arjun Verma', 'Kavya Reddy', 'Vikram Singh', 'Riya Kapoor',
    'Zoya Khan', 'Kabir Das', 'Myra Iyer', 'Advait Joshi', 'Sia Mehra'
  ];

  const students = await Promise.all(
    studentNames.map(async (name, i) => 
      prisma.user.create({
        data: {
          odId: generateOdId('STDT'),
          email: `${name.toLowerCase().replace(' ', '.')}@student.gyandeep.edu`,
          password: await hashPassword('student123'),
          name,
          role: 'student',
          classId: classes[i % classes.length].id,
          emailVerified: true,
          xp: 500 + (i * 200),
          coins: 1000 + (i * 100),
          level: Math.floor(i / 2) + 5,
          streak: 5 + i,
          performance: [],
          faceImage: i < 5 ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' : null,
          preferences: { 
            theme: i % 3 === 0 ? 'teal' : i % 3 === 1 ? 'indigo' : 'crimson', 
            highContrast: i === 0 || i === 10, 
            fontScale: i === 1 ? 1.2 : i === 11 ? 1.4 : 1.0,
            screenReaderHints: i === 0 || i === 12,
            reducedMotion: i === 5 || i === 14
          }
        }
      })
    )
  );

  console.log('📅 Creating Timetable...');
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const slots = [
    { start: '09:00', end: '10:00' },
    { start: '10:15', end: '11:15' },
    { start: '11:30', end: '12:30' },
    { start: '13:30', end: '14:30' },
  ];

  for (const cls of classes.slice(0, 2)) { // Just for first two classes
    for (const day of days) {
      for (let i = 0; i < slots.length; i++) {
        const sub = subjects[Math.floor(Math.random() * subjects.length)];
        const teacher = teachers[Math.floor(Math.random() * teachers.length)];
        
        await prisma.timetableEntry.create({
          data: {
            odId: generateOdId('TT'),
            day,
            startTime: slots[i].start,
            endTime: slots[i].end,
            subjectId: sub.id,
            teacherId: teacher.id,
            classId: cls.id,
            room: `Room ${100 + i + (classes.indexOf(cls) * 10)}`,
            semester: 'Fall 2024'
          }
        });
      }
    }
  }

  console.log('📡 Creating Live Sessions...');
  const activeSession = await prisma.classSession.create({
    data: {
      odId: generateOdId('SESS'),
      code: 'MATH-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      teacherId: teachers[0].id,
      classId: classes[0].id,
      subjectId: subjectMap['Mathematics'].id,
      expiry: new Date(Date.now() + 3600000),
      sessionStatus: 'active',
      quizPublished: true
    }
  });

  console.log('📝 Creating Notes...');
  await prisma.sessionNote.create({
    data: {
      odId: generateOdId('NOTE'),
      sessionId: activeSession.id,
      content: 'Algebra Fundamentals - Lesson 1: Introduction to variables, constants and expressions. We will cover linear equations today.',
      filePath: 'https://example.com/notes/algebra-l1.pdf',
      authorId: teachers[0].id
    }
  });

  await prisma.sessionNote.create({
    data: {
      odId: generateOdId('NOTE'),
      sessionId: activeSession.id,
      content: 'Practice Problems - Algebra: Set of 10 problems for home practice.',
      filePath: 'https://example.com/notes/algebra-practice.pdf',
      authorId: teachers[0].id
    }
  });

  await prisma.sessionNote.create({
    data: {
      odId: generateOdId('NOTE'),
      sessionId: activeSession.id,
      content: 'Periodic Table Guide: Complete guide to atomic numbers and groups.',
      filePath: 'https://example.com/notes/science-periodic.png',
      authorId: teachers[1].id
    }
  });

  console.log('🏛️ Creating Centralized Notes...');
  await prisma.centralizedNote.create({
    data: {
      odId: generateOdId('CNOTE'),
      classId: classes[0].id,
      subjectId: subjectMap['Mathematics'].id,
      unitNumber: 1,
      unitName: 'Number Systems',
      title: 'Real Numbers & Proofs',
      content: 'Detailed explanation of rational and irrational numbers.',
      noteType: 'class_notes'
    }
  });

  console.log('📝 Creating Quizzes & Questions...');
  const mathQuiz = await prisma.quiz.create({
    data: {
      odId: generateOdId('QUIZ'),
      sessionId: activeSession.id,
      teacherId: teachers[0].id,
      title: 'Algebra Fundamentals Quiz',
      published: true,
      publishedAt: new Date(),
      quizType: 'main'
    }
  });

  const mathQuestions = [
    { q: 'What is the value of x in 2x + 5 = 13?', o: ['3', '4', '5', '6'], a: '4' },
    { q: 'Simplify: (x + 2)(x - 2)', o: ['x² + 4', 'x² - 4', 'x² + 4x + 4', 'x² - 2'], a: 'x² - 4' },
    { q: 'What is the coefficient of y in 3x + 4y - 7?', o: ['3', '4', '-7', '1'], a: '4' },
  ];

  for (let i = 0; i < mathQuestions.length; i++) {
    await prisma.quizQuestion.create({
      data: {
        odId: generateOdId('QUES'),
        quizId: mathQuiz.id,
        createdById: teachers[0].id,
        question: mathQuestions[i].q,
        options: JSON.stringify(mathQuestions[i].o),
        correctAnswer: mathQuestions[i].a,
        difficulty: i === 2 ? 'easy' : 'medium',
        orderIndex: i
      }
    });
  }

  console.log('📊 Creating Student Performance & Historical Data...');
  const daysToSeed = 30;
  const now = new Date();
  
  for (let d = daysToSeed; d >= 0; d--) {
    const currentDay = new Date(now);
    currentDay.setDate(now.getDate() - d);
    
    // Skip weekends
    if (currentDay.getDay() === 0 || currentDay.getDay() === 6) continue;
    
    const dayStr = currentDay.toISOString().split('T')[0];
    console.log(`  - Seeding data for ${dayStr}...`);
    
    for (const cls of classes.slice(0, 3)) { // Seed for first 3 classes
      // 2 sessions per day per class
      for (let s = 0; s < 2; s++) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const teacher = teachers[Math.floor(Math.random() * teachers.length)];
        
        const session = await prisma.classSession.create({
          data: {
            odId: generateOdId('SESS'),
            code: `${subject.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            teacherId: teacher.id,
            classId: cls.id,
            subjectId: subject.id,
            expiry: new Date(currentDay.getTime() + 3600000),
            sessionStatus: d === 0 ? 'active' : 'ended',
            createdAt: currentDay,
            quizPublished: Math.random() > 0.3
          }
        });

        // Attendance for all students in this class
        const classStudents = students.filter(std => std.classId === cls.id);
        for (const student of classStudents) {
          const statusRand = Math.random();
          const status = statusRand > 0.9 ? 'Absent' : statusRand > 0.8 ? 'Late' : 'Present';
          
          await prisma.attendance.create({
            data: {
              odId: generateOdId('ATT'),
              sessionId: session.id,
              studentId: student.id,
              verifiedById: teacher.id,
              status,
              timestamp: new Date(currentDay.getTime() + Math.random() * 1800000)
            }
          });

          // Quiz attempt if present and quiz published
          if (session.quizPublished && status !== 'Absent') {
            const quiz = await prisma.quiz.create({
              data: {
                odId: generateOdId('QUIZ'),
                sessionId: session.id,
                teacherId: teacher.id,
                title: `${subject.name} - Daily Quiz`,
                published: true,
                publishedAt: currentDay,
                createdAt: currentDay
              }
            });

            const score = 60 + Math.floor(Math.random() * 41);
            await prisma.quizAttempt.create({
              data: {
                odId: generateOdId('ATMT'),
                quizId: quiz.id,
                studentId: student.id,
                answersJson: JSON.stringify({ '0': 'A', '1': 'B' }),
                correctCount: Math.floor(score / 20),
                totalQuestions: 5,
                score: score,
                submittedAt: currentDay,
                timeTakenSeconds: 300 + Math.random() * 300
              }
            });

            // Also create a grade for this quiz
            await prisma.grade.create({
              data: {
                odId: generateOdId('GRADE'),
                studentId: student.id,
                subjectId: subject.id,
                category: 'quiz',
                title: `${subject.name} Daily Quiz`,
                score,
                maxScore: 100,
                date: dayStr,
                teacherId: teacher.id,
                sessionId: session.id,
                createdAt: currentDay
              }
            });

            // Update student's performance field (fetch first to accumulate)
            const dbUser = await prisma.user.findUnique({ where: { id: student.id }, select: { performance: true } });
            const existingPerformance = Array.isArray(dbUser?.performance) ? (dbUser?.performance as any[]) : [];
            const newPerformance = {
              subject: subject.name,
              date: dayStr,
              score
            };
            
            await prisma.user.update({
              where: { id: student.id },
              data: {
                performance: [...existingPerformance, newPerformance].slice(-30), // Keep last 30
                xp: { increment: 50 },
                coins: { increment: 10 }
              }
            });
          }
        }
      }
    }
  }

  console.log('🎫 Creating Support Tickets...');
  const ticket = await prisma.ticket.create({
    data: {
      odId: generateOdId('TKT'),
      userId: students[0].id,
      userName: students[0].name,
      classId: students[0].classId,
      subject: 'Mathematics',
      message: 'I am struggling with quadratic equations. Could we have an extra session?',
      category: 'academic',
      priority: 'medium',
      status: 'open'
    }
  });

  await prisma.ticketReply.create({
    data: {
      odId: generateOdId('REPLY'),
      ticketId: ticket.id,
      userId: teachers[0].id,
      userName: teachers[0].name,
      message: 'Sure Aarav! I will schedule a doubt-clearing session this Friday.'
    }
  });

  console.log('📢 Creating Announcements...');
  await prisma.announcement.create({
    data: {
      odId: generateOdId('ANN'),
      authorId: admin.id,
      classId: classes[0].id,
      title: 'Science Fair 2024',
      content: 'The annual science fair is coming up! Register your projects by next Monday.',
      priority: 'high',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }
  });

  console.log('💡 Creating Teacher Insights...');
  await prisma.teacherInsight.create({
    data: {
      odId: generateOdId('INS'),
      teacherId: teachers[0].id,
      sessionId: activeSession.id,
      subjectId: subjectMap['Mathematics'].id,
      insightText: 'The class showed 90% proficiency in Algebra fundamentals. 3 students might need help with factorization.'
    }
  });

  console.log('🔔 Creating Notifications...');
  for (const student of students.slice(0, 3)) {
    await prisma.notification.create({
      data: {
        odId: generateOdId('NOTIF'),
        userId: student.id,
        type: 'quiz_result',
        title: 'Quiz Result Published',
        message: 'Your Algebra quiz result is now available. You scored 100%!',
        relatedId: mathQuiz.id,
        relatedType: 'quiz'
      }
    });
  }

  console.log('🎮 Creating Activity Logs...');
  for (let i = 0; i < students.length; i++) {
    await prisma.activityLog.create({
      data: {
        userId: students[i].id,
        type: 'QUIZ_COMPLETED',
        xpEarned: 100,
        details: 'Completed Algebra Quiz'
      }
    });
    await prisma.activityLog.create({
      data: {
        userId: students[i].id,
        type: 'ATTENDANCE_MARKED',
        xpEarned: 20,
        details: 'Attended Math Session'
      }
    });
  }

  console.log('✅ Perfect Seed Completed Successfully!');
  console.log('\n--- Credentials ---');
  console.log('Admin: admin@gyandeep.edu / admin123');
  console.log('Teacher: john.smith@gyandeep.edu / teacher123');
  console.log('Student: aarav.sharma@student.gyandeep.edu / student123');
  console.log('-------------------\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
