import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from './mongoAtlas.js';

const SALT_ROUNDS = 12;
const SEED_PASSWORDS = {
  admin: 'Admin@123',
  teacher: 'Teacher@123',
  student: 'Student@123',
};

const collectionsToClear = [
  COLLECTIONS.USERS,
  COLLECTIONS.CLASSES,
  COLLECTIONS.SUBJECTS,
  COLLECTIONS.CLASS_SESSIONS,
  COLLECTIONS.SESSION_NOTES,
  COLLECTIONS.CENTRALIZED_NOTES,
  COLLECTIONS.QUIZZES,
  COLLECTIONS.QUIZ_ATTEMPTS,
  COLLECTIONS.ATTENDANCE,
  COLLECTIONS.GRADES,
  COLLECTIONS.TICKETS,
  COLLECTIONS.TICKET_REPLIES,
  COLLECTIONS.NOTIFICATIONS,
  COLLECTIONS.ANNOUNCEMENTS,
  COLLECTIONS.TIMETABLE,
  COLLECTIONS.TAG_PRESETS,
  COLLECTIONS.QUESTION_BANK,
];

const demoPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

export async function reseedDemoDatabase({ clearExisting = false } = {}) {
  const db = await connectToDatabase();
  const existingUsers = await db.collection(COLLECTIONS.USERS).countDocuments();

  if (existingUsers > 0 && !clearExisting) {
    return {
      skipped: true,
      message: `Database already has ${existingUsers} users. Clear existing data before re-seeding.`,
    };
  }

  if (clearExisting) {
    for (const collectionName of collectionsToClear) {
      await db.collection(collectionName).deleteMany({});
    }
  }

  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const [adminPassword, teacherPassword, studentPassword] = await Promise.all([
    bcrypt.hash(SEED_PASSWORDS.admin, SALT_ROUNDS),
    bcrypt.hash(SEED_PASSWORDS.teacher, SALT_ROUNDS),
    bcrypt.hash(SEED_PASSWORDS.student, SALT_ROUNDS),
  ]);

  const adminId = new ObjectId();
  const teacherAId = new ObjectId();
  const teacherBId = new ObjectId();
  const class10AId = new ObjectId();
  const class10BId = new ObjectId();
  const activeSessionId = new ObjectId();
  const pastSessionId = new ObjectId();
  const waitingSessionId = new ObjectId();
  const activeQuizId = new ObjectId();
  const pastQuizId = new ObjectId();
  const ticketId = new ObjectId();
  const ticketReplyId = new ObjectId();

  const studentSeeds = [
    { name: 'Aarav Sharma', email: 'aarav.sharma@student.gyandeep.edu', classId: class10AId, xp: 1340, coins: 285, level: 14, badges: ['Fast Learner', 'Perfect Attendance'] },
    { name: 'Diya Nair', email: 'diya.nair@student.gyandeep.edu', classId: class10AId, xp: 1290, coins: 272, level: 13, badges: ['Quiz Master'] },
    { name: 'Ishaan Patil', email: 'ishaan.patil@student.gyandeep.edu', classId: class10AId, xp: 1210, coins: 255, level: 13, badges: ['Consistent Learner'] },
    { name: 'Meera Joshi', email: 'meera.joshi@student.gyandeep.edu', classId: class10AId, xp: 1180, coins: 243, level: 12, badges: [] },
    { name: 'Rohan Shah', email: 'rohan.shah@student.gyandeep.edu', classId: class10AId, xp: 956, coins: 138, level: 10, badges: [] },
    { name: 'Ananya Reddy', email: 'ananya.reddy@student.gyandeep.edu', classId: class10AId, xp: 845, coins: 132, level: 9, badges: [] },
    { name: 'Rhea Sharma', email: 'rhea.sharma@student.gyandeep.edu', classId: class10BId, xp: 1265, coins: 261, level: 13, badges: ['Top Performer'] },
    { name: 'Kabir Deshmukh', email: 'kabir.deshmukh@student.gyandeep.edu', classId: class10BId, xp: 850, coins: 135, level: 9, badges: [] },
    { name: 'Sneha Iyer', email: 'sneha.iyer@student.gyandeep.edu', classId: class10BId, xp: 728, coins: 128, level: 8, badges: [] },
    { name: 'Vihaan Gupta', email: 'vihaan.gupta@student.gyandeep.edu', classId: class10BId, xp: 612, coins: 124, level: 7, badges: [] },
  ];

  const studentDocs = studentSeeds.map((student, index) => {
    const studentId = new ObjectId();
    
    // Generate 20 random performance entries
    const performance = [];
    const subjectsList = ['Mathematics', 'Science', 'History', 'English'];
    for (let i = 20; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      performance.push({
        subject: subjectsList[Math.floor(Math.random() * subjectsList.length)],
        date: date.toISOString().split('T')[0],
        score: 70 + Math.floor(Math.random() * 31)
      });
    }

    return {
      _id: studentId,
      name: student.name,
      email: student.email,
      password: studentPassword,
      role: 'student',
      classId: student.classId,
      active: true,
      emailVerified: true,
      preferences: { notifications: true },
      history: [],
      performance,
      badges: student.badges,
      xp: student.xp,
      coins: student.coins,
      level: student.level,
      streak: 5 + index,
      assignedSubjects: [],
      createdAt: fiveDaysAgo,
      updatedAt: now,
    };
  });

  const mathLeaderIds = studentDocs
    .filter((student) => student.classId.equals(class10AId))
    .map((student) => student._id.toString());

  const users = [
    {
      _id: adminId,
      name: 'GyanDeep Admin',
      email: 'admin@gyandeep.edu',
      password: adminPassword,
      role: 'admin',
      active: true,
      emailVerified: true,
      preferences: { notifications: true },
      history: [],
      performance: [],
      assignedSubjects: [],
      createdAt: fiveDaysAgo,
      updatedAt: now,
    },
    {
      _id: teacherAId,
      name: 'John Smith',
      email: 'john.smith@gyandeep.edu',
      password: teacherPassword,
      role: 'teacher',
      active: true,
      emailVerified: true,
      assignedSubjects: ['Mathematics', 'Science'],
      assignedClasses: [class10AId.toString()],
      preferences: { notifications: true },
      history: [],
      performance: [],
      createdAt: fiveDaysAgo,
      updatedAt: now,
    },
    {
      _id: teacherBId,
      name: 'Rohan Mehta',
      email: 'teacher.history@gyandeep.edu',
      password: teacherPassword,
      role: 'teacher',
      active: true,
      emailVerified: true,
      assignedSubjects: ['History', 'English'],
      assignedClasses: [class10BId.toString()],
      preferences: { notifications: true },
      history: [],
      performance: [],
      createdAt: fiveDaysAgo,
      updatedAt: now,
    },
    ...studentDocs,
  ];

  const classes = [
    {
      _id: class10AId,
      name: 'Class 10-A',
      description: 'STEM demonstration class',
      section: 'A',
      grade: 10,
      subject: 'Mathematics',
      academicYear: '2026-2027',
      teacherId: teacherAId.toString(),
      active: true,
      createdAt: fiveDaysAgo,
      updatedAt: now,
    },
    {
      _id: class10BId,
      name: 'Class 10-B',
      description: 'Humanities demonstration class',
      section: 'B',
      grade: 10,
      subject: 'History',
      academicYear: '2026-2027',
      teacherId: teacherBId.toString(),
      active: true,
      createdAt: fiveDaysAgo,
      updatedAt: now,
    },
  ];

  const subjects = [
    { _id: new ObjectId(), id: 'Mathematics', name: 'Mathematics', code: 'MATH', teacherId: teacherAId.toString(), createdAt: fiveDaysAgo, updatedAt: now },
    { _id: new ObjectId(), id: 'Science', name: 'Science', code: 'SCI', teacherId: teacherAId.toString(), createdAt: fiveDaysAgo, updatedAt: now },
    { _id: new ObjectId(), id: 'History', name: 'History', code: 'HIST', teacherId: teacherBId.toString(), createdAt: fiveDaysAgo, updatedAt: now },
    { _id: new ObjectId(), id: 'English', name: 'English', code: 'ENG', teacherId: teacherBId.toString(), createdAt: fiveDaysAgo, updatedAt: now },
  ];

  // Historical data generation
  const historicalAttendance = [];
  const historicalGrades = [];
  const historicalQuizzes = [];
  const historicalQuizAttempts = [];

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dayStr = date.toISOString().split('T')[0];
    
    // For each class, create a session and data
    for (const cls of classes) {
      const sessionSub = cls.subject;
      const sessId = new ObjectId();
      const quizId = new ObjectId();
      
      // Attendance
      const classStudents = studentDocs.filter(s => s.classId.equals(cls._id));
      for (const student of classStudents) {
        const statusRand = Math.random();
        const status = statusRand > 0.9 ? 'Absent' : statusRand > 0.8 ? 'Late' : 'Present';
        
        historicalAttendance.push({
          _id: new ObjectId(),
          studentId: student._id.toString(),
          classId: cls._id.toString(),
          sessionId: sessId,
          teacherId: cls.teacherId,
          status,
          timestamp: new Date(date.getTime() + 9 * 60 * 60 * 1000 + Math.random() * 3600000),
          createdAt: date,
        });

        if (status !== 'Absent' && Math.random() > 0.3) {
          const score = 70 + Math.floor(Math.random() * 31);
          
          historicalGrades.push({
            _id: new ObjectId(),
            studentId: student._id.toString(),
            subjectId: sessionSub,
            score,
            maxScore: 100,
            title: `${sessionSub} Daily Quiz`,
            category: 'Quiz',
            teacherId: cls.teacherId,
            gradedAt: date,
            createdAt: date,
          });

          historicalQuizAttempts.push({
            _id: new ObjectId(),
            sessionId: sessId,
            studentId: student._id.toString(),
            quizId,
            score,
            totalQuestions: 10,
            correctCount: Math.round(score / 10),
            submittedAt: new Date(date.getTime() + 10 * 60 * 60 * 1000),
            createdAt: date,
          });

          // Update student performance array in memory
          const studentDoc = studentDocs.find(s => s._id.equals(student._id));
          if (studentDoc) {
            studentDoc.performance.push({
              subject: sessionSub,
              date: dayStr,
              score
            });
          }
        }
      }

      historicalQuizzes.push({
        _id: quizId,
        sessionId: sessId,
        classId: cls._id.toString(),
        teacherId: cls.teacherId,
        title: `${sessionSub} Checkpoint`,
        questions: activeQuizQuestions,
        published: true,
        publishedAt: date,
        createdAt: date,
        updatedAt: date,
      });
    }
  }

  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const nineDaysAgo = new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  const sessions = [
    {
      _id: activeSessionId,
      teacherId: teacherAId.toString(),
      classId: class10AId.toString(),
      subjectId: 'Mathematics',
      subject: 'Mathematics',
      code: '246810',
      sessionStatus: 'active',
      expiry: thirtyMinutesFromNow,
      startedAt: tenMinutesAgo,
      createdAt: tenMinutesAgo,
      updatedAt: now,
      locationEnabled: true,
      locationRadius: 150,
      locationAnchor: { lat: 18.5204, lng: 73.8567 },
      faceEnabled: true,
      quizPublished: true,
      quizAttempts: 3,
      notes: 'Live revision on quadratic equations and graph intersections.',
    },
    {
      _id: pastSessionId,
      teacherId: teacherAId.toString(),
      classId: class10AId.toString(),
      subjectId: 'Science',
      subject: 'Science',
      code: '135790',
      sessionStatus: 'ended',
      expiry: new Date(twoDaysAgo.getTime() + 45 * 60 * 1000),
      startedAt: twoDaysAgo,
      endedAt: new Date(twoDaysAgo.getTime() + 40 * 60 * 1000),
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
      locationEnabled: false,
      locationRadius: 100,
      locationAnchor: null,
      faceEnabled: false,
      quizPublished: false,
      quizAttempts: 4,
      notes: 'Newton laws recap with concept checks.',
    },
    {
      _id: waitingSessionId,
      teacherId: teacherBId.toString(),
      classId: class10BId.toString(),
      subjectId: 'History',
      subject: 'History',
      code: '112233',
      sessionStatus: 'waiting',
      expiry: new Date(now.getTime() + 15 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      locationEnabled: false,
      locationRadius: 100,
      locationAnchor: null,
      faceEnabled: false,
      quizPublished: false,
      quizAttempts: 0,
      notes: 'Waiting room for modern India discussion.',
    },
  ];

  const activeQuizQuestions = [
    {
      id: 'q1',
      question: 'What is the discriminant in the quadratic formula?',
      options: ['b^2 - 4ac', '2a + b', 'a^2 + b^2', '4ab - c'],
      correctAnswer: 'b^2 - 4ac',
      explanation: 'The discriminant determines the number of roots.',
    },
    {
      id: 'q2',
      question: 'If the discriminant is zero, how many real roots does the equation have?',
      options: ['No real roots', 'One repeated real root', 'Two distinct real roots', 'Infinitely many roots'],
      correctAnswer: 'One repeated real root',
      explanation: 'A zero discriminant means both roots are equal.',
    },
    {
      id: 'q3',
      question: 'Which graph shape represents a quadratic function?',
      options: ['Circle', 'Parabola', 'Line', 'Hyperbola'],
      correctAnswer: 'Parabola',
      explanation: 'Quadratic functions graph as parabolas.',
    },
  ];

  const quizzes = [
    {
      _id: activeQuizId,
      sessionId: activeSessionId,
      classId: class10AId.toString(),
      teacherId: teacherAId.toString(),
      title: 'Quadratic Equations Sprint',
      questions: activeQuizQuestions,
      published: true,
      publishedAt: tenMinutesAgo,
      attempts: [
        { studentId: studentDocs[0]._id.toString(), score: 100 },
        { studentId: studentDocs[1]._id.toString(), score: 67 },
        { studentId: studentDocs[2]._id.toString(), score: 67 },
      ],
      averageScore: 78,
      createdAt: tenMinutesAgo,
      updatedAt: now,
    },
    {
      _id: pastQuizId,
      sessionId: pastSessionId,
      classId: class10AId.toString(),
      teacherId: teacherAId.toString(),
      title: 'Newton Laws Checkpoint',
      questions: [
        {
          id: 'pq1',
          question: 'Newton first law is also called?',
          options: ['Law of motion', 'Law of inertia', 'Law of acceleration', 'Law of gravity'],
          correctAnswer: 'Law of inertia',
        },
      ],
      published: true,
      publishedAt: twoDaysAgo,
      attempts: [
        { studentId: studentDocs[0]._id.toString(), score: 100 },
        { studentId: studentDocs[3]._id.toString(), score: 100 },
      ],
      averageScore: 100,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
  ];

  const quizAttempts = [
    {
      _id: new ObjectId(),
      sessionId: activeSessionId,
      studentId: studentDocs[0]._id.toString(),
      quizId: activeQuizId,
      answers: activeQuizQuestions.map((question) => ({
        questionId: question.id,
        correctAnswer: question.correctAnswer,
        studentAnswer: question.correctAnswer,
        isCorrect: true,
      })),
      score: 100,
      totalQuestions: 3,
      correctCount: 3,
      submittedAt: new Date(now.getTime() - 5 * 60 * 1000),
      createdAt: new Date(now.getTime() - 7 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      sessionId: activeSessionId,
      studentId: studentDocs[1]._id.toString(),
      quizId: activeQuizId,
      answers: [
        { questionId: 'q1', correctAnswer: 'b^2 - 4ac', studentAnswer: 'b^2 - 4ac', isCorrect: true },
        { questionId: 'q2', correctAnswer: 'One repeated real root', studentAnswer: 'Two distinct real roots', isCorrect: false },
        { questionId: 'q3', correctAnswer: 'Parabola', studentAnswer: 'Parabola', isCorrect: true },
      ],
      score: 67,
      totalQuestions: 3,
      correctCount: 2,
      submittedAt: new Date(now.getTime() - 4 * 60 * 1000),
      createdAt: new Date(now.getTime() - 6 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      sessionId: activeSessionId,
      studentId: studentDocs[2]._id.toString(),
      quizId: activeQuizId,
      answers: [
        { questionId: 'q1', correctAnswer: 'b^2 - 4ac', studentAnswer: 'b^2 - 4ac', isCorrect: true },
        { questionId: 'q2', correctAnswer: 'One repeated real root', studentAnswer: 'One repeated real root', isCorrect: true },
        { questionId: 'q3', correctAnswer: 'Parabola', studentAnswer: 'Line', isCorrect: false },
      ],
      score: 67,
      totalQuestions: 3,
      correctCount: 2,
      submittedAt: new Date(now.getTime() - 2 * 60 * 1000),
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
    },
    // Past quiz attempts
    {
      _id: new ObjectId(),
      sessionId: pastSessionId,
      studentId: studentDocs[0]._id.toString(),
      quizId: pastQuizId,
      answers: [{ questionId: 'pq1', correctAnswer: 'Law of inertia', studentAnswer: 'Law of inertia', isCorrect: true }],
      score: 100,
      totalQuestions: 1,
      correctCount: 1,
      submittedAt: new Date(twoDaysAgo.getTime() + 20 * 60 * 1000),
      createdAt: new Date(twoDaysAgo.getTime() + 15 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      sessionId: pastSessionId,
      studentId: studentDocs[1]._id.toString(),
      quizId: pastQuizId,
      answers: [{ questionId: 'pq1', correctAnswer: 'Law of inertia', studentAnswer: 'Law of inertia', isCorrect: true }],
      score: 100,
      totalQuestions: 1,
      correctCount: 1,
      submittedAt: new Date(twoDaysAgo.getTime() + 25 * 60 * 1000),
      createdAt: new Date(twoDaysAgo.getTime() + 20 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      sessionId: pastSessionId,
      studentId: studentDocs[3]._id.toString(),
      quizId: pastQuizId,
      answers: [{ questionId: 'pq1', correctAnswer: 'Law of inertia', studentAnswer: 'Law of acceleration', isCorrect: false }],
      score: 0,
      totalQuestions: 1,
      correctCount: 0,
      submittedAt: new Date(twoDaysAgo.getTime() + 30 * 60 * 1000),
      createdAt: new Date(twoDaysAgo.getTime() + 25 * 60 * 1000),
    },
    // Additional quiz attempts for more students
    {
      _id: new ObjectId(),
      sessionId: activeSessionId,
      studentId: studentDocs[3]._id.toString(),
      quizId: activeQuizId,
      answers: [
        { questionId: 'q1', correctAnswer: 'b^2 - 4ac', studentAnswer: 'b^2 - 4ac', isCorrect: true },
        { questionId: 'q2', correctAnswer: 'One repeated real root', studentAnswer: 'One repeated real root', isCorrect: true },
        { questionId: 'q3', correctAnswer: 'Parabola', studentAnswer: 'Parabola', isCorrect: true },
      ],
      score: 100,
      totalQuestions: 3,
      correctCount: 3,
      submittedAt: new Date(now.getTime() - 1 * 60 * 1000),
      createdAt: new Date(now.getTime() - 4 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      sessionId: activeSessionId,
      studentId: studentDocs[4]._id.toString(),
      quizId: activeQuizId,
      answers: [
        { questionId: 'q1', correctAnswer: 'b^2 - 4ac', studentAnswer: 'b^2 - 4ac', isCorrect: true },
        { questionId: 'q2', correctAnswer: 'One repeated real root', studentAnswer: 'No real roots', isCorrect: false },
        { questionId: 'q3', correctAnswer: 'Parabola', studentAnswer: 'Circle', isCorrect: false },
      ],
      score: 33,
      totalQuestions: 3,
      correctCount: 1,
      submittedAt: new Date(now.getTime() - 3 * 60 * 1000),
      createdAt: new Date(now.getTime() - 6 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      sessionId: activeSessionId,
      studentId: studentDocs[5]._id.toString(),
      quizId: activeQuizId,
      answers: [
        { questionId: 'q1', correctAnswer: 'b^2 - 4ac', studentAnswer: '2a + b', isCorrect: false },
        { questionId: 'q2', correctAnswer: 'One repeated real root', studentAnswer: 'One repeated real root', isCorrect: true },
        { questionId: 'q3', correctAnswer: 'Parabola', studentAnswer: 'Line', isCorrect: false },
      ],
      score: 33,
      totalQuestions: 3,
      correctCount: 1,
      submittedAt: new Date(now.getTime() - 2.5 * 60 * 1000),
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
    },
  ];

  const attendance = [
    {
      _id: new ObjectId(),
      studentId: studentDocs[0]._id.toString(),
      classId: class10AId.toString(),
      sessionId: activeSessionId,
      teacherId: teacherAId.toString(),
      status: 'Present',
      timestamp: new Date(now.getTime() - 8 * 60 * 1000),
      locationVerified: true,
      faceVerified: true,
      createdAt: new Date(now.getTime() - 8 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[1]._id.toString(),
      classId: class10AId.toString(),
      sessionId: activeSessionId,
      teacherId: teacherAId.toString(),
      status: 'Present',
      timestamp: new Date(now.getTime() - 7 * 60 * 1000),
      locationVerified: true,
      faceVerified: true,
      createdAt: new Date(now.getTime() - 7 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[2]._id.toString(),
      classId: class10AId.toString(),
      sessionId: activeSessionId,
      teacherId: teacherAId.toString(),
      status: 'Late',
      timestamp: new Date(now.getTime() - 3 * 60 * 1000),
      locationVerified: true,
      faceVerified: true,
      createdAt: new Date(now.getTime() - 3 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[3]._id.toString(),
      classId: class10AId.toString(),
      sessionId: pastSessionId,
      teacherId: teacherAId.toString(),
      status: 'Present',
      timestamp: new Date(twoDaysAgo.getTime() + 10 * 60 * 1000),
      createdAt: new Date(twoDaysAgo.getTime() + 10 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[4]._id.toString(),
      classId: class10BId.toString(),
      sessionId: waitingSessionId,
      teacherId: teacherBId.toString(),
      status: 'Present',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    // More students in active session (Class 10-A)
    { _id: new ObjectId(), studentId: studentDocs[4]._id.toString(), classId: class10AId.toString(), sessionId: activeSessionId, teacherId: teacherAId.toString(), status: 'Present', timestamp: new Date(now.getTime() - 6 * 60 * 1000), locationVerified: true, faceVerified: true, createdAt: new Date(now.getTime() - 6 * 60 * 1000) },
    { _id: new ObjectId(), studentId: studentDocs[5]._id.toString(), classId: class10AId.toString(), sessionId: activeSessionId, teacherId: teacherAId.toString(), status: 'Present', timestamp: new Date(now.getTime() - 5 * 60 * 1000), locationVerified: true, faceVerified: true, createdAt: new Date(now.getTime() - 5 * 60 * 1000) },
    // Past session attendance (Class 10-A)
    { _id: new ObjectId(), studentId: studentDocs[1]._id.toString(), classId: class10AId.toString(), sessionId: pastSessionId, teacherId: teacherAId.toString(), status: 'Present', timestamp: new Date(twoDaysAgo.getTime() + 12 * 60 * 1000), createdAt: new Date(twoDaysAgo.getTime() + 12 * 60 * 1000) },
    { _id: new ObjectId(), studentId: studentDocs[2]._id.toString(), classId: class10AId.toString(), sessionId: pastSessionId, teacherId: teacherAId.toString(), status: 'Present', timestamp: new Date(twoDaysAgo.getTime() + 8 * 60 * 1000), createdAt: new Date(twoDaysAgo.getTime() + 8 * 60 * 1000) },
    { _id: new ObjectId(), studentId: studentDocs[4]._id.toString(), classId: class10AId.toString(), sessionId: pastSessionId, teacherId: teacherAId.toString(), status: 'Late', timestamp: new Date(twoDaysAgo.getTime() + 25 * 60 * 1000), createdAt: new Date(twoDaysAgo.getTime() + 25 * 60 * 1000) },
    { _id: new ObjectId(), studentId: studentDocs[5]._id.toString(), classId: class10AId.toString(), sessionId: pastSessionId, teacherId: teacherAId.toString(), status: 'Absent', timestamp: new Date(twoDaysAgo.getTime() + 30 * 60 * 1000), createdAt: new Date(twoDaysAgo.getTime() + 30 * 60 * 1000) },
    // Class 10-B students in waiting session
    { _id: new ObjectId(), studentId: studentDocs[7]._id.toString(), classId: class10BId.toString(), sessionId: waitingSessionId, teacherId: teacherBId.toString(), status: 'Present', timestamp: new Date(now.getTime() - 20 * 60 * 60 * 1000), createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000) },
    { _id: new ObjectId(), studentId: studentDocs[8]._id.toString(), classId: class10BId.toString(), sessionId: waitingSessionId, teacherId: teacherBId.toString(), status: 'Present', timestamp: new Date(now.getTime() - 22 * 60 * 60 * 1000), createdAt: new Date(now.getTime() - 22 * 60 * 60 * 1000) },
    { _id: new ObjectId(), studentId: studentDocs[9]._id.toString(), classId: class10BId.toString(), sessionId: waitingSessionId, teacherId: teacherBId.toString(), status: 'Late', timestamp: new Date(now.getTime() - 26 * 60 * 60 * 1000), createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000) },
  ];

  const grades = [
    // Class 10-A Mathematics grades
    {
      _id: new ObjectId(),
      studentId: studentDocs[0]._id.toString(),
      subjectId: 'Mathematics',
      score: 46,
      maxScore: 50,
      title: 'Quadratic Worksheet',
      category: 'Assignment',
      teacherId: teacherAId.toString(),
      gradedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[1]._id.toString(),
      subjectId: 'Mathematics',
      score: 42,
      maxScore: 50,
      title: 'Quadratic Worksheet',
      category: 'Assignment',
      teacherId: teacherAId.toString(),
      gradedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[0]._id.toString(),
      subjectId: 'Mathematics',
      score: 48,
      maxScore: 50,
      title: 'Linear Equations Test',
      category: 'Test',
      teacherId: teacherAId.toString(),
      gradedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[1]._id.toString(),
      subjectId: 'Mathematics',
      score: 38,
      maxScore: 50,
      title: 'Linear Equations Test',
      category: 'Test',
      teacherId: teacherAId.toString(),
      gradedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[2]._id.toString(),
      subjectId: 'Mathematics',
      score: 35,
      maxScore: 50,
      title: 'Quadratic Worksheet',
      category: 'Assignment',
      teacherId: teacherAId.toString(),
      gradedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[3]._id.toString(),
      subjectId: 'Mathematics',
      score: 32,
      maxScore: 50,
      title: 'Quadratic Worksheet',
      category: 'Assignment',
      teacherId: teacherAId.toString(),
      gradedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[4]._id.toString(),
      subjectId: 'Mathematics',
      score: 40,
      maxScore: 50,
      title: 'Linear Equations Test',
      category: 'Test',
      teacherId: teacherAId.toString(),
      gradedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[5]._id.toString(),
      subjectId: 'Mathematics',
      score: 28,
      maxScore: 50,
      title: 'Quadratic Worksheet',
      category: 'Assignment',
      teacherId: teacherAId.toString(),
      gradedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    // Class 10-A Science grades
    {
      _id: new ObjectId(),
      studentId: studentDocs[0]._id.toString(),
      subjectId: 'Science',
      score: 45,
      maxScore: 50,
      title: 'Force Quiz',
      category: 'Quiz',
      teacherId: teacherAId.toString(),
      gradedAt: fiveDaysAgo,
      createdAt: fiveDaysAgo,
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[1]._id.toString(),
      subjectId: 'Science',
      score: 40,
      maxScore: 50,
      title: 'Force Quiz',
      category: 'Quiz',
      teacherId: teacherAId.toString(),
      gradedAt: fiveDaysAgo,
      createdAt: fiveDaysAgo,
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[2]._id.toString(),
      subjectId: 'Science',
      score: 38,
      maxScore: 50,
      title: 'Motion Lab',
      category: 'Lab',
      teacherId: teacherAId.toString(),
      gradedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[3]._id.toString(),
      subjectId: 'Science',
      score: 35,
      maxScore: 50,
      title: 'Motion Lab',
      category: 'Lab',
      teacherId: teacherAId.toString(),
      gradedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
    },
    // Class 10-B History grades
    {
      _id: new ObjectId(),
      studentId: studentDocs[6]._id.toString(),
      subjectId: 'History',
      score: 44,
      maxScore: 50,
      title: 'Reform Movements Essay',
      category: 'Essay',
      teacherId: teacherBId.toString(),
      gradedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[7]._id.toString(),
      subjectId: 'History',
      score: 38,
      maxScore: 50,
      title: 'Reform Movements Essay',
      category: 'Essay',
      teacherId: teacherBId.toString(),
      gradedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[8]._id.toString(),
      subjectId: 'History',
      score: 42,
      maxScore: 50,
      title: 'Colonial Period Test',
      category: 'Test',
      teacherId: teacherBId.toString(),
      gradedAt: fiveDaysAgo,
      createdAt: fiveDaysAgo,
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[9]._id.toString(),
      subjectId: 'History',
      score: 30,
      maxScore: 50,
      title: 'Reform Movements Essay',
      category: 'Essay',
      teacherId: teacherBId.toString(),
      gradedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
    },
    // Additional Math grades for analytics
    {
      _id: new ObjectId(),
      studentId: studentDocs[0]._id.toString(),
      subjectId: 'Mathematics',
      score: 50,
      maxScore: 50,
      title: 'Chapter Test - Algebra',
      category: 'Test',
      teacherId: teacherAId.toString(),
      gradedAt: sixDaysAgo,
      createdAt: sixDaysAgo,
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[1]._id.toString(),
      subjectId: 'Mathematics',
      score: 44,
      maxScore: 50,
      title: 'Chapter Test - Algebra',
      category: 'Test',
      teacherId: teacherAId.toString(),
      gradedAt: sixDaysAgo,
      createdAt: sixDaysAgo,
    },
    {
      _id: new ObjectId(),
      studentId: studentDocs[2]._id.toString(),
      subjectId: 'Mathematics',
      score: 40,
      maxScore: 50,
      title: 'Chapter Test - Algebra',
      category: 'Test',
      teacherId: teacherAId.toString(),
      gradedAt: sixDaysAgo,
      createdAt: sixDaysAgo,
    },
  ];

  const sessionNotes = [
    {
      _id: new ObjectId(),
      classId: class10AId.toString(),
      subjectId: 'Mathematics',
      subject: 'Mathematics',
      content: 'Key revision points: standard form, discriminant, root nature, graph interpretation.',
      url: demoPdfUrl,
      fileName: 'quadratic-revision.pdf',
      fileType: 'application/pdf',
      uploadedBy: teacherAId.toString(),
      deletedAt: null,
      createdAt: now,
      noteDate: now,
    },
    {
      _id: new ObjectId(),
      classId: class10AId.toString(),
      subjectId: 'Mathematics',
      subject: 'Mathematics',
      content: 'Aarav-focused practice set: solving linear equations, factorization, and word problems with step-by-step solutions.',
      url: demoPdfUrl,
      fileName: 'aarav-mathematics-practice-pack.pdf',
      fileType: 'application/pdf',
      uploadedBy: teacherAId.toString(),
      deletedAt: null,
      createdAt: threeDaysAgo,
      noteDate: threeDaysAgo,
    },
    {
      _id: new ObjectId(),
      classId: class10AId.toString(),
      subjectId: 'Science',
      subject: 'Science',
      content: 'Newton laws summary sheet with everyday examples and practice questions.',
      url: demoPdfUrl,
      fileName: 'newton-laws-summary.pdf',
      fileType: 'application/pdf',
      uploadedBy: teacherAId.toString(),
      deletedAt: null,
      createdAt: twoDaysAgo,
      noteDate: twoDaysAgo,
    },
  ];

  const centralizedNotes = [
    {
      _id: new ObjectId(),
      classId: class10AId.toString(),
      subjectId: 'Mathematics',
      subject: 'Mathematics',
      unitNumber: 1,
      unitName: 'Quadratic Equations',
      title: 'Quadratic Formula Cheatsheet',
      content: 'Structured revision notes covering formula application, discriminant cases, and solved examples.',
      noteType: 'centralized_notes',
      uploadedBy: teacherAId.toString(),
      createdAt: fiveDaysAgo,
      noteDate: fiveDaysAgo,
    },
    {
      _id: new ObjectId(),
      classId: class10AId.toString(),
      subjectId: 'Mathematics',
      subject: 'Mathematics',
      unitNumber: 2,
      unitName: 'Aarav Review',
      title: 'Aarav Sharma Revision Sheet',
      content: 'Personalized revision checklist for Aarav covering equations, graphs, and quick recap questions.',
      noteType: 'centralized_notes',
      uploadedBy: teacherAId.toString(),
      createdAt: threeDaysAgo,
      noteDate: threeDaysAgo,
    },
    {
      _id: new ObjectId(),
      classId: class10AId.toString(),
      subjectId: 'Mathematics',
      subject: 'Mathematics',
      unitNumber: 2,
      unitName: 'Graphs',
      title: 'Parabola Visual Guide',
      content: 'Vertex, axis of symmetry, intercepts, and interpretation of transformations.',
      noteType: 'centralized_notes',
      uploadedBy: teacherAId.toString(),
      createdAt: twoDaysAgo,
      noteDate: twoDaysAgo,
    },
    {
      _id: new ObjectId(),
      classId: class10AId.toString(),
      subjectId: 'Science',
      subject: 'Science',
      unitNumber: 1,
      unitName: 'Motion',
      title: 'Newton Laws Revision Notes',
      content: 'Force diagrams, inertia examples, and numerical practice prompts.',
      noteType: 'centralized_notes',
      uploadedBy: teacherAId.toString(),
      createdAt: twoDaysAgo,
      noteDate: twoDaysAgo,
    },
    {
      _id: new ObjectId(),
      classId: class10BId.toString(),
      subjectId: 'History',
      subject: 'History',
      unitNumber: 1,
      unitName: 'Modern India',
      title: 'Freedom Movement Timeline',
      content: 'A concise event-by-event map of the major reform and independence milestones.',
      noteType: 'centralized_notes',
      uploadedBy: teacherBId.toString(),
      createdAt: twoDaysAgo,
      noteDate: twoDaysAgo,
    },
  ];

  const announcements = [
    {
      _id: new ObjectId(),
      authorId: teacherAId.toString(),
      classId: class10AId.toString(),
      subjectId: 'Mathematics',
      title: 'Live quiz in progress',
      content: 'Join the quadratic equations sprint before the session closes.',
      priority: 'high',
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: new ObjectId(),
      authorId: adminId.toString(),
      classId: class10AId.toString(),
      subjectId: null,
      title: 'Project showcase this Friday',
      content: 'Bring one AI-assisted classroom artifact for the showcase gallery.',
      priority: 'medium',
      expiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    {
      _id: new ObjectId(),
      authorId: teacherBId.toString(),
      classId: class10BId.toString(),
      subjectId: 'History',
      title: 'Debate preparation pack uploaded',
      content: 'Review the centralized notes before tomorrow’s class debate.',
      priority: 'medium',
      expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    },
  ];

  const tickets = [
    {
      _id: ticketId,
      userId: studentDocs[2]._id.toString(),
      subject: 'Unable to upload assignment PDF',
      category: 'technical',
      priority: 'high',
      status: 'open',
      version: 2,
      createdAt: now,
      updatedAt: now,
      assignedToId: adminId.toString(),
      assignedAt: now,
    },
  ];

  const ticketReplies = [
    {
      _id: ticketReplyId,
      ticketId,
      message: 'The upload fails on mobile after selecting the file.',
      authorId: studentDocs[2]._id.toString(),
      authorName: studentDocs[2].name,
      isStaff: false,
      createdAt: now,
    },
    {
      _id: new ObjectId(),
      ticketId,
      message: 'Please retry from the latest Chrome build. We also increased the upload timeout.',
      authorId: adminId.toString(),
      authorName: 'GyanDeep Admin',
      isStaff: true,
      createdAt: new Date(now.getTime() + 2 * 60 * 1000),
    },
  ];

  const notifications = [
    {
      _id: new ObjectId(),
      userId: teacherAId.toString(),
      title: '3 students already marked attendance',
      message: 'Aarav, Diya, and Ishaan have verified attendance for the live math session.',
      type: 'attendance',
      relatedId: activeSessionId.toString(),
      relatedType: 'session',
      read: false,
      createdAt: now,
    },
    {
      _id: new ObjectId(),
      userId: studentDocs[0]._id.toString(),
      title: 'Quiz reward credited',
      message: 'You earned 80 XP and 15 coins for topping the live quiz.',
      type: 'quiz',
      relatedId: activeQuizId.toString(),
      relatedType: 'quiz',
      read: false,
      createdAt: new Date(now.getTime() - 4 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      userId: studentDocs[0]._id.toString(),
      title: 'New note uploaded',
      message: 'John Smith uploaded "Aarav Sharma Revision Sheet" to Mathematics.',
      type: 'announcement',
      relatedId: centralizedNotes[1]._id.toString(),
      relatedType: 'note',
      read: false,
      createdAt: threeDaysAgo,
    },
    {
      _id: new ObjectId(),
      userId: studentDocs[1]._id.toString(),
      title: 'New note uploaded',
      message: 'John Smith uploaded "Quadratic Formula Cheatsheet" to Mathematics.',
      type: 'announcement',
      relatedId: centralizedNotes[0]._id.toString(),
      relatedType: 'note',
      read: false,
      createdAt: new Date(now.getTime() - 2 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      userId: studentDocs[2]._id.toString(),
      title: 'Grade posted',
      message: 'Your Science lab score is now available: 38/50.',
      type: 'grade',
      relatedId: grades[2]._id.toString(),
      relatedType: 'grade',
      read: false,
      createdAt: new Date(now.getTime() - 1 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      userId: teacherBId.toString(),
      title: 'Session starting soon',
      message: 'Your History class 10-B session is scheduled in 15 minutes.',
      type: 'system',
      relatedId: waitingSessionId.toString(),
      relatedType: 'session',
      read: false,
      createdAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
  ];

  const timetable = [
    { _id: new ObjectId(), classId: class10AId.toString(), subject: 'Mathematics', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: 'Room 301', createdAt: fiveDaysAgo, updatedAt: now },
    { _id: new ObjectId(), classId: class10AId.toString(), subject: 'Science', dayOfWeek: 2, startTime: '10:15', endTime: '11:15', room: 'Lab 2', createdAt: fiveDaysAgo, updatedAt: now },
    { _id: new ObjectId(), classId: class10BId.toString(), subject: 'History', dayOfWeek: 3, startTime: '11:30', endTime: '12:30', room: 'Room 204', createdAt: fiveDaysAgo, updatedAt: now },
  ];

  const tagPresets = [
    { _id: new ObjectId(), subject: 'Mathematics', tags: ['quadratics', 'graphs', 'revision', 'practice'], createdAt: now, updatedAt: now },
    { _id: new ObjectId(), subject: 'Science', tags: ['motion', 'lab', 'formula', 'concepts'], createdAt: now, updatedAt: now },
    { _id: new ObjectId(), subject: 'History', tags: ['timeline', 'debate', 'causes', 'movement'], createdAt: now, updatedAt: now },
  ];

  const questionBank = activeQuizQuestions.map((question) => ({
    _id: new ObjectId(),
    subject: 'Mathematics',
    question: question.question,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    difficulty: 'medium',
    tags: ['quadratics', 'demo'],
    createdAt: fiveDaysAgo,
    updatedAt: now,
  }));

  await db.collection(COLLECTIONS.USERS).insertMany(users);
  await db.collection(COLLECTIONS.CLASSES).insertMany(classes);
  await db.collection(COLLECTIONS.SUBJECTS).insertMany(subjects);
  await db.collection(COLLECTIONS.CLASS_SESSIONS).insertMany(sessions);
  
  // Combine static and historical data for insertion
  if (historicalQuizzes.length > 0) {
    await db.collection(COLLECTIONS.QUIZZES).insertMany([...quizzes, ...historicalQuizzes]);
  } else {
    await db.collection(COLLECTIONS.QUIZZES).insertMany(quizzes);
  }

  if (historicalQuizAttempts.length > 0) {
    await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).insertMany([...quizAttempts, ...historicalQuizAttempts]);
  } else {
    await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).insertMany(quizAttempts);
  }

  if (historicalAttendance.length > 0) {
    await db.collection(COLLECTIONS.ATTENDANCE).insertMany([...attendance, ...historicalAttendance]);
  } else {
    await db.collection(COLLECTIONS.ATTENDANCE).insertMany(attendance);
  }

  if (historicalGrades.length > 0) {
    await db.collection(COLLECTIONS.GRADES).insertMany([...grades, ...historicalGrades]);
  } else {
    await db.collection(COLLECTIONS.GRADES).insertMany(grades);
  }

  await db.collection(COLLECTIONS.SESSION_NOTES).insertMany(sessionNotes);
  await db.collection(COLLECTIONS.CENTRALIZED_NOTES).insertMany(centralizedNotes);
  await db.collection(COLLECTIONS.ANNOUNCEMENTS).insertMany(announcements);
  await db.collection(COLLECTIONS.TICKETS).insertMany(tickets);
  await db.collection(COLLECTIONS.TICKET_REPLIES).insertMany(ticketReplies);
  await db.collection(COLLECTIONS.NOTIFICATIONS).insertMany(notifications);
  await db.collection(COLLECTIONS.TIMETABLE).insertMany(timetable);
  await db.collection(COLLECTIONS.TAG_PRESETS).insertMany(tagPresets);
  await db.collection(COLLECTIONS.QUESTION_BANK).insertMany(questionBank);

  return {
    skipped: false,
    message: 'Demo database seeded successfully with rich historical data.',
    summary: {
      users: users.length,
      classes: classes.length,
      liveSessions: 1,
      quizzes: quizzes.length + historicalQuizzes.length,
      attendanceRecords: attendance.length + historicalAttendance.length,
      gradeRecords: grades.length + historicalGrades.length,
      leaderboardStudents: mathLeaderIds.length,
    },
    credentials: {
      admin: `admin@gyandeep.edu / ${SEED_PASSWORDS.admin}`,
      teacher: `john.smith@gyandeep.edu / ${SEED_PASSWORDS.teacher}`,
      student: `${studentDocs[0].email} / ${SEED_PASSWORDS.student}`,
    },
  };
}
