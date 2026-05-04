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
  
  console.log('1️⃣ Creating additional demo users...');
  const users = [
    { email: 'top.student@gyandeep.edu', name: 'Aarav Sharma', role: 'student', xp: 2500, coins: 5000, level: 25, streak: 60 },
    { email: 'avg.student@gyandeep.edu', name: 'Priya Patel', role: 'student', xp: 1200, coins: 2400, level: 12, streak: 30 },
    { email: 'new.student@gyandeep.edu', name: 'Rahul Kumar', role: 'student', xp: 100, coins: 200, level: 1, streak: 3 },
  ];
  
  for (const userData of users) {
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
  
  console.log('\n2️⃣ Creating announcements (high/medium/low priority)...');
  const announcements = [
    { title: '🎉 Annual Sports Day Announced!', content: 'Annual Sports Day will be held on 15th December 2024.', priority: 'high' },
    { title: '📚 Mid-Term Exam Schedule', content: 'Mid-term exams start from 20th November.', priority: 'high' },
    { title: '🏆 Inter-School Quiz Winner', content: 'Winner: Aarav Sharma from Class 12 Science!', priority: 'medium' },
    { title: '⚠️ Holiday Notice', content: 'School closed on 25th December for Christmas.', priority: 'low' },
  ];
  
  const admin = await db.collection('users').findOne({ role: 'admin' });
  for (const ann of announcements) {
    const existing = await db.collection('announcements').findOne({ title: ann.title });
    if (!existing) {
      await db.collection('announcements').insertOne({
        _id: new ObjectId(),
        od_id: 'ANN-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
        authorId: admin?._id,
        title: ann.title,
        content: ann.content,
        priority: ann.priority,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
  console.log(`   ✓ Created ${announcements.length} announcements`);
  
  console.log('\n3️⃣ Creating diverse notifications...');
  const allStudents = await db.collection('users').find({ role: 'student' }).toArray();
  const notificationTypes = [
    { type: 'quiz_result', title: 'Quiz Results Available', message: 'Your Physics quiz: 85%' },
    { type: 'class_session', title: 'New Class Started', message: 'Physics session by Sarah Johnson' },
    { type: 'grade_posted', title: 'New Grade Posted', message: 'Math assignment: 92/100' },
    { type: 'ticket_response', title: 'Ticket Reply', message: 'Teacher replied to your ticket' },
    { type: 'announcement', title: 'New Announcement', message: 'Sports Day event announced!' },
    { type: 'streak_reminder', title: 'Streak Alert!', message: 'Login today to maintain streak' },
    { type: 'level_up', title: 'Level Up! 🎉', message: 'You reached Level 15' },
    { type: 'xp_earned', title: 'XP Earned', message: 'You earned 50 XP for quiz' },
  ];
  
  for (const notif of notificationTypes) {
    const student = allStudents[Math.floor(Math.random() * allStudents.length)];
    await db.collection('notifications').insertOne({
      _id: new ObjectId(),
      od_id: 'NOTIF-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      userId: student._id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      read: Math.random() > 0.5,
      relatedId: null,
      relatedType: notif.type,
      createdAt: new Date(),
    });
  }
  console.log(`   ✓ Created ${notificationTypes.length} notifications`);
  
  console.log('\n4️⃣ Creating support tickets with replies...');
  const teachers = await db.collection('users').find({ role: 'teacher' }).toArray();
  const tickets = [
    { subject: 'Cannot access quiz', message: 'I get "Session expired" error.', category: 'technical', priority: 'high' },
    { subject: 'Request extra classes', message: 'Need more Math classes for quadratic equations.', category: 'academic', priority: 'medium' },
    { subject: 'Grade discrepancy', message: 'I should get 88 instead of 82.', category: 'academic', priority: 'medium' },
  ];
  
  for (const ticketData of tickets) {
    const existing = await db.collection('tickets').findOne({ subject: ticketData.subject });
    if (!existing) {
      const student = allStudents[0];
      const result = await db.collection('tickets').insertOne({
        _id: new ObjectId(),
        od_id: 'TICKET-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
        userId: student._id,
        userName: student.name,
        subject: ticketData.subject,
        message: ticketData.message,
        category: ticketData.category,
        priority: ticketData.priority,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      const teacher = teachers[0];
      await db.collection('ticket_replies').insertOne({
        _id: new ObjectId(),
        od_id: 'REPLY-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
        ticketId: result.insertedId,
        userId: teacher._id,
        userName: teacher.name,
        message: 'Thank you for the ticket. We are looking into it.',
        createdAt: new Date(),
      });
    }
  }
  console.log(`   ✓ Created ${tickets.length} tickets with replies`);
  
  console.log('\n5️⃣ Creating full week timetable...');
  const classes = await db.collection('classes').find().toArray();
  const subjects = await db.collection('subjects').find().toArray();
  let ttCount = 0;
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const day of days) {
    for (let slot = 0; slot < 3; slot++) {
      const subject = subjects[slot % subjects.length];
      const teacher = teachers[slot % teachers.length];
      const cls = classes[0];
      
      const existing = await db.collection('timetable').findOne({ day, startTime: `${9 + slot}:00` });
      if (!existing && cls) {
        await db.collection('timetable').insertOne({
          _id: new ObjectId(),
          od_id: 'TT-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
          day,
          startTime: `${9 + slot}:00`,
          endTime: `${10 + slot}:00`,
          subjectId: subject._id,
          teacherId: teacher._id,
          classId: cls._id,
          room: `Room ${100 + slot}`,
          semester: 'Fall 2024',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        ttCount++;
      }
    }
  }
  console.log(`   ✓ Created ${ttCount} timetable entries`);
  
  console.log('\n6️⃣ Creating attendance with GPS data...');
  const sessions = await db.collection('class_sessions').find({ _id: { $exists: true } }).limit(3).toArray();
  let attCount = 0;
  
  for (const session of sessions) {
    if (!session._id) continue;
    for (const student of allStudents.slice(0, 5)) {
      if (!student._id) continue;
      const existing = await db.collection('attendance').findOne({
        session_id: session._id,
        student_id: student._id,
      });
      if (!existing) {
        await db.collection('attendance').insertOne({
          _id: new ObjectId(),
          od_id: 'ATT-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
          session_id: session._id,
          student_id: student._id,
          verified_by_id: session.teacherId,
          status: ['present', 'late', 'absent'][Math.floor(Math.random() * 3)],
          gpsLocation: { lat: 28.6 + Math.random() * 0.1, lng: 77.2 + Math.random() * 0.1 },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        attCount++;
      }
    }
  }
  console.log(`   ✓ Created ${attCount} attendance records with GPS`);
  
  console.log('\n7️⃣ Creating grades across subjects...');
  let gradeCount = 0;
  for (const student of allStudents.slice(0, 5)) {
    for (const subject of subjects.slice(0, 4)) {
      const existing = await db.collection('grades').findOne({
        student_id: student._id,
        subject_id: subject._id,
      });
      if (!existing) {
        await db.collection('grades').insertOne({
          _id: new ObjectId(),
          od_id: 'GRADE-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
          student_id: student._id,
          subject_id: subject._id,
          category: ['quiz', 'exam', 'assignment'][Math.floor(Math.random() * 3)],
          title: `Test ${subject.name}`,
          score: Math.floor(Math.random() * 30) + 70,
          max_score: 100,
          date: '2024-11-' + String(Math.floor(Math.random() * 28) + 1).padStart(2, '0'),
          teacher_id: teachers[0]._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        gradeCount++;
      }
    }
  }
  console.log(`   ✓ Created ${gradeCount} grades`);  
  
  console.log('\n8️⃣ Creating activity logs for gamification...');
  const activities = ['QUIZ_COMPLETED', 'ATTENDANCE_MARKED', 'STREAK_BONUS', 'LEVEL_UP', 'NOTE_ACCESSED'];
  let actCount = 0;  
  for (const student of allStudents.slice(0, 5)) {
    for (let i = 0; i < 5; i++) {
      const type = activities[Math.floor(Math.random() * activities.length)];
      await db.collection('activity_logs').insertOne({
        _id: new ObjectId(),
        user_id: student._id,
        type,
        xp_earned: Math.floor(Math.random() * 50) + 10,
        details: `Completed ${type.toLowerCase()}`,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 3600000),
      });
      actCount++;
    }
  }
  console.log(`   ✓ Created ${actCount} activity logs`);  
  
  console.log('\n9️⃣ Creating audit logs for security...');
  const auditTypes = ['USER_LOGIN', 'QUIZ_PUBLISHED', 'SESSION_CREATED', 'GRADE_UPDATED', 'TICKET_CREATED'];
  for (const type of auditTypes) {
    await db.collection('audit_logs').insertOne({
      _id: new ObjectId(),
      od_id: 'AUDIT-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      type,
      user_id: teachers[0]._id,
      details: { action: type, ip: '192.168.1.' + Math.floor(Math.random() * 255) },
      createdAt: new Date(),
    });
  }
  console.log(`   ✓ Created ${auditTypes.length} audit logs`);
  
  console.log('\n🔟 Creating session notes and centralized materials...');
  const sessionNotes = [
    { title: 'Quantum Physics Basics', content: 'Introduction to wave-particle duality and Schrödinger equation. Light behaves both as a particle and a wave.', subjectId: 'science', classId: classes[0]?._id, unitNumber: 1 },
    { title: 'Organic Chemistry unit 2', content: 'Alkanes, Alkenes, and Alkynes properties. Hydrocarbons are organic compounds consisting entirely of hydrogen and carbon.', subjectId: 'science', classId: classes[0]?._id, unitNumber: 2 },
    { title: 'World War II Summary', content: 'Key events and turning points of the global conflict from 1939 to 1945.', subjectId: 'history', classId: classes[0]?._id, unitNumber: 4 },
    { title: 'Calculus: Derivatives', content: 'The derivative of a function of a real variable measures the sensitivity to change of the function value.', subjectId: 'math', classId: classes[0]?._id, unitNumber: 3 },
  ];
  
  for (const note of sessionNotes) {
    await db.collection('session_notes').insertOne({
      ...note,
      _id: new ObjectId(),
      od_id: 'NOTE-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      uploadedBy: teachers[0]._id,
      createdAt: new Date(),
    });
    
    await db.collection('centralized_notes').insertOne({
      ...note,
      _id: new ObjectId(),
      od_id: 'CNOTE-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      uploadedBy: teachers[0]._id,
      createdAt: new Date(),
    });
  }
  console.log(`   ✓ Created ${sessionNotes.length * 2} note entries`);
  
  console.log('\n✅ Demo data creation complete!\n');
  console.log('📊 Summary:');
  console.log('   ✓ Additional students with varied performance');
  console.log('   ✓ Announcements (high/medium/low priority)');
  console.log('   ✓ Notifications (8 different types)');
  console.log('   ✓ Support tickets with replies');
  console.log('   ✓ Full week timetable (6 days × 3 slots)');
  console.log('   ✓ Attendance with GPS coordinates');
  console.log('   ✓ Grades across all subjects');
  console.log('   ✓ Activity logs for gamification');
  console.log('   ✓ Audit logs for security\n');
  
  console.log('🎯 Login Credentials:');
  console.log('   Admin: admin@gyandeep.edu / admin123');
  console.log('   Teacher: john.smith@gyandeep.edu / teacher123');
  console.log('   Student: alice.brown@student.gyandeep.edu / student123');
  console.log('   New Student: top.student@gyandeep.edu / demo123\n');
  
  console.log('🌐 Local: http://localhost:5173');
  console.log('🌐 Deployed: https://gyandeep-1.onrender.com\n');
  
  await client.close();
}

createDemoData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
