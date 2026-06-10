/**
 * demo-data.cjs
 * Creates comprehensive demo data showcasing ALL Gyandeep features
 * Run: node demo-data.cjs
 */

require('dotenv').config({ path: './.env' });
require('dotenv').config({ path: './gyandeep.env' });

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gyandeep:surabhi_142005@cluster0.ph2wi4x.mongodb.net/gyandeep?retryWrites=true&w=majority';

async function createDemoData() {
  console.log('🚀 Creating comprehensive demo data for Gyandeep...\n');
  
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('gyandeep');
  
  const hashedPassword = await bcrypt.hash('demo123', 10);
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);
  
  console.log('1️⃣ Ensuring core users exist...');
  // Ensure John Smith exists
  const teacherEmail = 'john.smith@gyandeep.edu';
  let teacher = await db.collection('users').findOne({ email: teacherEmail });
  if (!teacher) {
    const result = await db.collection('users').insertOne({
      _id: new ObjectId(),
      od_id: 'USER-TEACHER1',
      name: 'John Smith',
      email: teacherEmail,
      password: teacherPassword,
      role: 'teacher',
      emailVerified: true,
      preferences: { theme: 'light', notifications: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    teacher = await db.collection('users').findOne({ _id: result.insertedId });
    console.log(`   ✓ Created Teacher: ${teacher.name}`);
  }

  // Ensure Alice Brown exists
  const studentEmail = 'alice.brown@student.gyandeep.edu';
  let student = await db.collection('users').findOne({ email: studentEmail });
  if (!student) {
    const result = await db.collection('users').insertOne({
      _id: new ObjectId(),
      od_id: 'USER-STUDENT1',
      name: 'Alice Brown',
      email: studentEmail,
      password: studentPassword,
      role: 'student',
      emailVerified: true,
      xp: 1500,
      coins: 300,
      level: 5,
      preferences: { theme: 'light', notifications: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    student = await db.collection('users').findOne({ _id: result.insertedId });
    console.log(`   ✓ Created Student: ${student.name}`);
  }

  const otherUsers = [
    { email: 'top.student@gyandeep.edu', name: 'Aarav Sharma', role: 'student', xp: 2500, coins: 500, level: 25, streak: 60 },
    { email: 'avg.student@gyandeep.edu', name: 'Priya Patel', role: 'student', xp: 1200, coins: 240, level: 12, streak: 30 },
  ];
  
  for (const userData of otherUsers) {
    const existing = await db.collection('users').findOne({ email: userData.email });
    if (!existing) {
      await db.collection('users').insertOne({
        _id: new ObjectId(),
        od_id: 'USER-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
        password: hashedPassword,
        emailVerified: true,
        preferences: { theme: 'light', notifications: true },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...userData,
      });
      console.log(`   ✓ Created ${userData.name}`);
    }
  }

  console.log('\n2️⃣ Creating classes and subjects...');
  const classNames = ['10-A', '10-B', '11-Science'];
  const subjectNames = ['Mathematics', 'Science', 'History', 'English'];
  
  for (const name of classNames) {
    const existing = await db.collection('classes').findOne({ name });
    if (!existing) {
      await db.collection('classes').insertOne({
        _id: new ObjectId(),
        id: name.toLowerCase().replace(' ', '-'),
        name,
        teacherId: teacher._id.toString(),
        active: true,
        createdAt: new Date(),
      });
    }
  }

  for (const name of subjectNames) {
    const existing = await db.collection('subjects').findOne({ name });
    if (!existing) {
      await db.collection('subjects').insertOne({
        _id: new ObjectId(),
        id: name.toLowerCase(),
        name,
        active: true,
        createdAt: new Date(),
      });
    }
  }

  const allClasses = await db.collection('classes').find().toArray();
  const allSubjects = await db.collection('subjects').find().toArray();
  const allStudents = await db.collection('users').find({ role: 'student' }).toArray();

  // Link teacher to classes and subjects
  await db.collection('users').updateOne(
    { _id: teacher._id },
    { 
      $set: { 
        assignedClasses: allClasses.map(c => c.id || c._id.toString()),
        assignedSubjects: allSubjects.map(s => s.id || s._id.toString())
      } 
    }
  );

  // Link students to first class
  if (allClasses.length > 0) {
    await db.collection('users').updateMany(
      { role: 'student' },
      { $set: { classId: allClasses[0].id || allClasses[0]._id.toString() } }
    );
  }

  console.log('\n3️⃣ Creating Class Sessions...');
  const sessions = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const session = {
      _id: new ObjectId(),
      teacherId: teacher._id.toString(),
      classId: allClasses[0].id || allClasses[0]._id.toString(),
      subjectId: allSubjects[0].name,
      status: 'ended',
      startTime: new Date(date.getTime() - 3600000),
      endTime: date,
      code: 'DEMO' + i,
      createdAt: new Date(date.getTime() - 3600000),
    };
    await db.collection('class_sessions').insertOne(session);
    sessions.push(session);
  }
  console.log(`   ✓ Created ${sessions.length} class sessions`);

  console.log('\n4️⃣ Creating Attendance records...');
  let attCount = 0;
  for (const session of sessions) {
    for (const s of allStudents) {
      await db.collection('attendance').insertOne({
        _id: new ObjectId(),
        studentId: s._id.toString(),
        classId: session.classId,
        sessionId: session._id,
        teacherId: teacher._id.toString(),
        status: Math.random() > 0.1 ? 'Present' : 'Absent',
        timestamp: session.startTime,
        createdAt: new Date(),
      });
      attCount++;
    }
  }
  console.log(`   ✓ Created ${attCount} attendance records`);

  console.log('\n5️⃣ Creating Quizzes and Quiz Attempts...');
  let quizCount = 0;
  let attemptCount = 0;
  for (let i = 0; i < 3; i++) {
    const quiz = {
      _id: new ObjectId(),
      title: `Quiz on ${allSubjects[i % allSubjects.length].name}`,
      subject: allSubjects[i % allSubjects.length].name,
      classId: allClasses[0].id || allClasses[0]._id.toString(),
      teacherId: teacher._id.toString(),
      published: true,
      questions: [
        { question: 'What is 10 + 5?', options: ['10', '15', '20', '25'], correctAnswer: '15' },
        { question: 'What is the capital of India?', options: ['Mumbai', 'Delhi', 'Kolkata', 'Chennai'], correctAnswer: 'Delhi' },
      ],
      createdAt: new Date(),
    };
    await db.collection('quizzes').insertOne(quiz);
    quizCount++;

    for (const s of allStudents) {
      const score = Math.floor(Math.random() * 41) + 60; // 60-100
      await db.collection('quiz_attempts').insertOne({
        _id: new ObjectId(),
        quizId: quiz._id,
        studentId: s._id.toString(),
        score: score,
        totalQuestions: 2,
        correctCount: score >= 100 ? 2 : 1,
        submittedAt: new Date(),
        createdAt: new Date(),
      });
      attemptCount++;
    }
  }
  console.log(`   ✓ Created ${quizCount} quizzes and ${attemptCount} attempts`);

  console.log('\n6️⃣ Creating Grades across subjects...');
  let gradeCount = 0;
  for (const s of allStudents) {
    for (const sub of allSubjects) {
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 3));
        await db.collection('grades').insertOne({
          _id: new ObjectId(),
          studentId: s._id.toString(),
          subjectId: sub.name,
          classId: s.classId,
          score: Math.floor(Math.random() * 30) + 70,
          maxScore: 100,
          category: 'quiz',
          title: `Weekly Test ${i+1}`,
          teacherId: teacher._id.toString(),
          timestamp: date,
          createdAt: date,
        });
        gradeCount++;
      }
    }
  }
  console.log(`   ✓ Created ${gradeCount} grades`);

  console.log('\n✅ Demo data update complete!');
  await client.close();
}

createDemoData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
