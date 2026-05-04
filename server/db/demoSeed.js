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
    { name: 'Aarav Kulkarni', email: 'aarav.kulkarni@student.gyandeep.edu', classId: class10AId, xp: 340, coins: 85, level: 4, badges: ['Fast Learner', 'Perfect Attendance'] },
    { name: 'Diya Nair', email: 'diya.nair@student.gyandeep.edu', classId: class10AId, xp: 290, coins: 72, level: 3, badges: ['Quiz Master'] },
    { name: 'Ishaan Patil', email: 'ishaan.patil@student.gyandeep.edu', classId: class10AId, xp: 210, coins: 55, level: 3, badges: ['Consistent Learner'] },
    { name: 'Meera Joshi', email: 'meera.joshi@student.gyandeep.edu', classId: class10AId, xp: 180, coins: 43, level: 2, badges: [] },
    { name: 'Rhea Sharma', email: 'rhea.sharma@student.gyandeep.edu', classId: class10BId, xp: 265, coins: 61, level: 3, badges: ['Top Performer'] },
    { name: 'Kabir Deshmukh', email: 'kabir.deshmukh@student.gyandeep.edu', classId: class10BId, xp: 150, coins: 35, level: 2, badges: [] },
  ];

  const studentDocs = studentSeeds.map((student, index) => {
    const studentId = new ObjectId();
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
      performance: [
        { subject: 'Mathematics', date: '2026-04-18', score: 72 + index * 3 },
        { subject: 'Science', date: '2026-04-24', score: 75 + index * 2 },
        { subject: 'Mathematics', date: '2026-05-02', score: 80 + index * 2 },
      ],
      badges: student.badges,
      xp: student.xp,
      coins: student.coins,
      level: student.level,
      streak: 3 + index,
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
      name: 'Asha Verma',
      email: 'teacher.demo@gyandeep.edu',
      password: teacherPassword,
      role: 'teacher',
      active: true,
      emailVerified: true,
      assignedSubjects: ['math', 'science'],
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
      assignedSubjects: ['history', 'english'],
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
    { _id: new ObjectId(), id: 'math', name: 'Mathematics', code: 'MATH', teacherId: teacherAId.toString(), createdAt: fiveDaysAgo, updatedAt: now },
    { _id: new ObjectId(), id: 'science', name: 'Science', code: 'SCI', teacherId: teacherAId.toString(), createdAt: fiveDaysAgo, updatedAt: now },
    { _id: new ObjectId(), id: 'history', name: 'History', code: 'HIST', teacherId: teacherBId.toString(), createdAt: fiveDaysAgo, updatedAt: now },
    { _id: new ObjectId(), id: 'english', name: 'English', code: 'ENG', teacherId: teacherBId.toString(), createdAt: fiveDaysAgo, updatedAt: now },
  ];

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
  ];

  const grades = [
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
      studentId: studentDocs[4]._id.toString(),
      subjectId: 'History',
      score: 44,
      maxScore: 50,
      title: 'Reform Movements Essay',
      category: 'Essay',
      teacherId: teacherBId.toString(),
      gradedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
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
      userId: studentDocs[1]._id.toString(),
      title: 'New note uploaded',
      message: 'Asha Verma uploaded "Quadratic Formula Cheatsheet" to Mathematics.',
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
  await db.collection(COLLECTIONS.QUIZZES).insertMany(quizzes);
  await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).insertMany(quizAttempts);
  await db.collection(COLLECTIONS.ATTENDANCE).insertMany(attendance);
  await db.collection(COLLECTIONS.GRADES).insertMany(grades);
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
    message: 'Demo database seeded successfully.',
    summary: {
      users: users.length,
      classes: classes.length,
      liveSessions: 1,
      quizzes: quizzes.length,
      tickets: tickets.length,
      leaderboardStudents: mathLeaderIds.length,
    },
    credentials: {
      admin: `admin@gyandeep.edu / ${SEED_PASSWORDS.admin}`,
      teacher: `teacher.demo@gyandeep.edu / ${SEED_PASSWORDS.teacher}`,
      student: `${studentDocs[0].email} / ${SEED_PASSWORDS.student}`,
    },
  };
}
