/**
 * server/db/seedData.js
 * Seeds the database with initial data for Gyandeep
 * Run with: node server/db/seedData.js
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectToDatabase, COLLECTIONS } from './mongoAtlas.js';

const SALT_ROUNDS = 12;

async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  const db = await connectToDatabase();
  const usersCollection = db.collection(COLLECTIONS.USERS);
  const classesCollection = db.collection(COLLECTIONS.CLASSES);
  const subjectsCollection = db.collection(COLLECTIONS.SUBJECTS);
  const sessionsCollection = db.collection(COLLECTIONS.CLASS_SESSIONS);
  const attendanceCollection = db.collection(COLLECTIONS.ATTENDANCE);
  const announcementsCollection = db.collection(COLLECTIONS.ANNOUNCEMENTS);
  const timetableCollection = db.collection(COLLECTIONS.TIMETABLE);

  // Check if data already exists
  const existingUsers = await usersCollection.countDocuments();
  if (existingUsers > 0) {
    console.log(`⚠️  Database already has ${existingUsers} users. Skipping seed.`);
    console.log('💡 To re-seed, first delete all documents from the collections.');
    return;
  }

  // ============ Create Users ============
  console.log('👥 Creating users...');

  // Admin user
  const adminPassword = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  const admin = {
    name: 'Admin',
    email: 'admin@gyandeep.edu',
    password: adminPassword,
    role: 'admin',
    active: true,
    emailVerified: true,
    preferences: {},
    history: [],
    assignedSubjects: [],
    performance: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const adminResult = await usersCollection.insertOne(admin);
  const adminId = adminResult.insertedId;
  console.log('✅ Admin user created: admin@gyandeep.edu / Admin@123');

  // Teacher users
  const teacherPassword = await bcrypt.hash('Teacher@123', SALT_ROUNDS);
  const teachers = [
    {
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@gyandeep.edu',
      password: teacherPassword,
      role: 'teacher',
      active: true,
      emailVerified: true,
      subjects: ['math', 'science'],
      assignedSubjects: ['math', 'science'],
      preferences: {},
      history: [],
      performance: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Mr. Michael Chen',
      email: 'michael.chen@gyandeep.edu',
      password: teacherPassword,
      role: 'teacher',
      active: true,
      emailVerified: true,
      subjects: ['history', 'english'],
      assignedSubjects: ['history', 'english'],
      preferences: {},
      history: [],
      performance: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Mrs. Priya Sharma',
      email: 'priya.sharma@gyandeep.edu',
      password: teacherPassword,
      role: 'teacher',
      active: true,
      emailVerified: true,
      subjects: ['math'],
      assignedSubjects: ['math'],
      preferences: {},
      history: [],
      performance: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const teacherResults = await usersCollection.insertMany(teachers);
  const teacherIds = Object.values(teacherResults.insertedIds);
  console.log(`✅ ${teachers.length} teachers created`);

  // Student users
  const studentPassword = await bcrypt.hash('Student@123', SALT_ROUNDS);
  const students = [
    { name: 'Aarav Patel', email: 'aarav.patel@student.gyandeep.edu', classId: null },
    { name: 'Ananya Gupta', email: 'ananya.gupta@student.gyandeep.edu', classId: null },
    { name: 'Reyansh Kumar', email: 'reyansh.kumar@student.gyandeep.edu', classId: null },
    { name: 'Saanvi Singh', email: 'saanvi.singh@student.gyandeep.edu', classId: null },
    { name: 'Vihaan Sharma', email: 'vihaan.sharma@student.gyandeep.edu', classId: null },
    { name: 'Aadhya Reddy', email: 'aadhya.reddy@student.gyandeep.edu', classId: null },
    { name: 'Krishna Iyer', email: 'krishna.iyer@student.gyandeep.edu', classId: null },
    { name: 'Myra Shah', email: 'myra.shah@student.gyandeep.edu', classId: null },
    { name: 'Arjun Nair', email: 'arjun.nair@student.gyandeep.edu', classId: null },
    { name: 'Kiara Mehta', email: 'kiara.mehta@student.gyandeep.edu', classId: null },
    { name: 'Sai Prasad', email: 'sai.prasad@student.gyandeep.edu', classId: null },
    { name: 'Diya Joshi', email: 'diya.joshi@student.gyandeep.edu', classId: null },
    { name: 'Rohan Das', email: 'rohan.das@student.gyandeep.edu', classId: null },
    { name: 'Avni Patel', email: 'avni.patel@student.gyandeep.edu', classId: null },
    { name: 'Yashvir Malhotra', email: 'yashvir.malhotra@student.gyandeep.edu', classId: null },
  ];

  const studentDocs = students.map(s => ({
    name: s.name,
    email: s.email,
    password: studentPassword,
    role: 'student',
    active: true,
    emailVerified: false,
    classId: null,
    preferences: {},
    history: [],
    performance: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const studentResults = await usersCollection.insertMany(studentDocs);
  console.log(`✅ ${students.length} students created`);

  // ============ Create Classes ============
  console.log('📚 Creating classes...');

  const class10A = {
    name: 'Class 10-A',
    description: 'Class 10 Section A',
    subject: 'Mathematics',
    section: 'A',
    academicYear: '2024-2025',
    teacherId: teacherIds[0]?.toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const class10B = {
    name: 'Class 10-B',
    description: 'Class 10 Section B',
    subject: 'Mathematics',
    section: 'B',
    academicYear: '2024-2025',
    teacherId: teacherIds[1]?.toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const class9Science = {
    name: 'Class 9-Science',
    description: 'Class 9 Science Stream',
    subject: 'Science',
    section: 'A',
    academicYear: '2024-2025',
    teacherId: teacherIds[0]?.toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const classResults = await classesCollection.insertMany([class10A, class10B, class9Science]);
  const classIds = Object.values(classResults.insertedIds);
  console.log(`✅ ${3} classes created`);

  // ============ Create Subjects ============
  console.log('📖 Creating subjects...');

  const subjects = [
    { id: 'math', name: 'Mathematics', code: 'MATH', description: 'Mathematics curriculum for Classes 9-10' },
    { id: 'science', name: 'Science', code: 'SCI', description: 'Science curriculum including Physics, Chemistry, Biology' },
    { id: 'history', name: 'History', code: 'HIST', description: 'History and Civics' },
    { id: 'english', name: 'English', code: 'ENG', description: 'English Language and Literature' },
  ];

  await subjectsCollection.insertMany(subjects);
  console.log(`✅ ${subjects.length} subjects created`);

  // ============ Create Sample Sessions ============
  console.log('📝 Creating sample class sessions...');

  const sessions = [
    {
      classId: classIds[0],
      subject: 'math',
      teacherId: teacherIds[0],
      code: '123456',
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() + 3600000), // 1 hour from now
      status: 'active',
      location: { lat: 28.6139, lng: 77.2090, radius: 100 },
      createdAt: new Date(),
    },
    {
      classId: classIds[1],
      subject: 'history',
      teacherId: teacherIds[1],
      code: '789012',
      startTime: new Date(Date.now() - 7200000), // 2 hours ago
      endTime: new Date(Date.now() - 3600000), // 1 hour ago
      status: 'completed',
      location: { lat: 28.6139, lng: 77.2090, radius: 50 },
      createdAt: new Date(),
    },
  ];

  const sessionResults = await sessionsCollection.insertMany(sessions);
  console.log(`✅ ${sessions.length} class sessions created`);

  // ============ Create Sample Attendance ============
  console.log('✅ Creating sample attendance records...');

  const studentIds = Object.values(studentResults.insertedIds);
  const attendanceRecords = [];

  for (let i = 0; i < Math.min(5, studentIds.length); i++) {
    attendanceRecords.push({
      studentId: studentIds[i].toString(),
      classId: classIds[0].toString(),
      sessionId: sessionResults.insertedIds[0].toString(),
      status: 'Present',
      timestamp: new Date(),
      method: 'face',
      location: { lat: 28.6139, lng: 77.2090 },
    });
  }

  await attendanceCollection.insertMany(attendanceRecords);
  console.log(`✅ ${attendanceRecords.length} attendance records created`);

  // ============ Create Announcements ============
  console.log('📢 Creating sample announcements...');

  const announcements = [
    {
      text: 'Welcome to Gyandeep! Your AI-Powered Smart Classroom.',
      author: 'Admin',
      priority: 'high',
      active: true,
      createdAt: new Date(),
    },
    {
      text: 'Mathematics exam scheduled for next Monday. Prepare accordingly.',
      author: 'Dr. Sarah Johnson',
      priority: 'medium',
      active: true,
      createdAt: new Date(),
    },
    {
      text: 'Science fair registration is now open. Submit your projects by Friday.',
      author: 'Mr. Michael Chen',
      priority: 'low',
      active: true,
      createdAt: new Date(),
    },
  ];

  await announcementsCollection.insertMany(announcements);
  console.log(`✅ ${announcements.length} announcements created`);

  // ============ Create Timetable ============
  console.log('📅 Creating sample timetable...');

  const timetable = [
    { classId: classIds[0], subject: 'math', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: 'Room 101' },
    { classId: classIds[0], subject: 'science', dayOfWeek: 1, startTime: '10:15', endTime: '11:15', room: 'Lab 1' },
    { classId: classIds[0], subject: 'english', dayOfWeek: 2, startTime: '09:00', endTime: '10:00', room: 'Room 102' },
    { classId: classIds[0], subject: 'history', dayOfWeek: 3, startTime: '11:30', endTime: '12:30', room: 'Room 103' },
  ];

  await timetableCollection.insertMany(timetable);
  console.log(`✅ ${timetable.length} timetable entries created`);

  console.log('\n🎉 Database seeding complete!');
  console.log('\n📋 Login credentials:');
  console.log('   Admin:  admin@gyandeep.edu / Admin@123');
  console.log('   Teacher: sarah.johnson@gyandeep.edu / Teacher@123');
  console.log('   Student: aarav.patel@student.gyandeep.edu / Student@123');
}

// Run the seed
seedDatabase().catch(console.error);