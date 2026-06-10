/**
 * server/scripts/seed-production.js
 * Comprehensive seed script for demonstration purposes.
 * Populates all collections with high-quality demo data.
 */

import '../utils/env.js';
import { connectToDatabase, COLLECTIONS, closeDatabase } from '../db/mongoAtlas.js';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

async function seed() {
  const withOdId = (doc, prefix = 'DOC') => ({
    ...doc,
    od_id: `${prefix}-${doc._id.toString()}`
  });

  try {
    const db = await connectToDatabase();
    console.log('--- Starting Seed Process ---');

    // 1. Clear existing data
    const collectionsToClear = Object.values(COLLECTIONS);
    for (const colName of collectionsToClear) {
      await db.collection(colName).deleteMany({});
      console.log(`Cleared collection: ${colName}`);
    }

    const hashedPassword = await bcrypt.hash('Gyandeep@2024', 12);
    const now = new Date();

    // 2. Seed Subjects
    const subjects = [
      { _id: new ObjectId(), od_id: 'SUB-MATH', name: 'Mathematics', color: '#ef4444', description: 'Advanced calculus and algebra' },
      { _id: new ObjectId(), od_id: 'SUB-SCI', name: 'Science', color: '#10b981', description: 'Physics, Chemistry, and Biology' },
      { _id: new ObjectId(), od_id: 'SUB-ENG', name: 'English', color: '#3b82f6', description: 'Literature and grammar' },
      { _id: new ObjectId(), od_id: 'SUB-SOC', name: 'Social Studies', color: '#f59e0b', description: 'History and Geography' },
    ];
    await db.collection(COLLECTIONS.SUBJECTS).insertMany(subjects);
    console.log('Seeded Subjects');

    // 3. Seed Classes
    const classes = [
      { _id: new ObjectId(), od_id: 'CLS-10A', name: 'Class 10-A', description: 'Morning batch for grade 10', active: true },
      { _id: new ObjectId(), od_id: 'CLS-10B', name: 'Class 10-B', description: 'Evening batch for grade 10', active: true },
      { _id: new ObjectId(), od_id: 'CLS-11S', name: 'Class 11-Science', description: 'Higher secondary science stream', active: true },
    ];
    await db.collection(COLLECTIONS.CLASSES).insertMany(classes);
    console.log('Seeded Classes');

    // 4. Seed Users
    const admin = {
      _id: new ObjectId(),
      od_id: 'USR-ADMIN-01',
      name: 'System Admin',
      email: 'admin@gyandeep.com',
      password: hashedPassword,
      role: 'admin',
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    const teachers = [
      {
        _id: new ObjectId(),
        od_id: 'USR-TCH-01',
        name: 'John Smith',
        email: 'teacher1@gyandeep.com',
        password: hashedPassword,
        role: 'teacher',
        assignedSubjects: [subjects[0].name, subjects[1].name],
        assignedClasses: [classes[0]._id.toString(), classes[2]._id.toString()],
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: new ObjectId(),
        od_id: 'USR-TCH-02',
        name: 'Sarah Johnson',
        email: 'teacher2@gyandeep.com',
        password: hashedPassword,
        role: 'teacher',
        assignedSubjects: [subjects[2].name, subjects[3].name],
        assignedClasses: [classes[1]._id.toString()],
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const students = [];
    // Generate 10 students for Class 10-A
    for (let i = 1; i <= 10; i++) {
      students.push({
        _id: new ObjectId(),
        od_id: `USR-STD-A${i}`,
        name: `Student ${i}`,
        email: `student${i}@gyandeep.com`,
        password: hashedPassword,
        role: 'student',
        classId: classes[0]._id.toString(),
        active: true,
        xp: 100 * i,
        level: Math.floor(i / 3) + 1,
        coins: 50 * i,
        badges: i > 5 ? ['Fast Learner', 'Perfect Attendance'] : [],
        performance: [],
        createdAt: now,
        updatedAt: now,
      });
    }
    // Generate 5 students for Class 10-B
    for (let i = 11; i <= 15; i++) {
      students.push({
        _id: new ObjectId(),
        od_id: `USR-STD-B${i}`,
        name: `Student ${i}`,
        email: `student${i}@gyandeep.com`,
        password: hashedPassword,
        role: 'student',
        classId: classes[1]._id.toString(),
        active: true,
        xp: 50 * i,
        level: 1,
        coins: 20 * i,
        badges: [],
        performance: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    await db.collection(COLLECTIONS.USERS).insertMany([admin, ...teachers, ...students]);
    console.log('Seeded Users');

    // 5. Seed Grades (Analytics Data)
    const grades = [];
    const subjectsToGrade = subjects.map(s => s.name);
    const categories = ['Quiz', 'Midterm', 'Assignment'];

    for (const student of students) {
      const studentPerformance = [];
      for (const subjectName of subjectsToGrade) {
        // Seed 15 grades per subject over 30 days
        for (let j = 1; j <= 15; j++) {
          const score = 65 + Math.floor(Math.random() * 35);
          const date = new Date();
          date.setDate(date.getDate() - (j * 2));
          if (date.getDay() === 0 || date.getDay() === 6) continue;
          
          const _id = new ObjectId();
          const dayStr = date.toISOString().split('T')[0];
          
          grades.push(withOdId({
            _id,
            studentId: student._id.toString(),
            student_id: student._id.toString(),
            subjectId: subjectName,
            subject_id: subjectName,
            subject: subjectName,
            category: categories[j % 3],
            title: `${categories[j % 3]} ${j}`,
            score: score,
            maxScore: 100,
            gradedAt: date,
            date: dayStr,
            teacherId: teachers[0]._id.toString(),
            teacher_id: teachers[0]._id.toString(),
            createdAt: date,
          }, 'GRD'));

          studentPerformance.push({
            subject: subjectName,
            date: dayStr,
            score
          });
        }
      }
      
      // Update student performance field in memory for later update
      student.performance = studentPerformance.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    await db.collection(COLLECTIONS.GRADES).insertMany(grades);
    console.log('Seeded Grades');

    // Update users with their generated performance data
    for (const student of students) {
      if (student.role === 'student') {
        await db.collection(COLLECTIONS.USERS).updateOne(
          { _id: student._id },
          { $set: { performance: student.performance } }
        );
      }
    }
    console.log('Updated Student Performance fields');

    // 6. Seed Attendance
    const attendance = [];
    const days = 30;
    for (const student of students) {
      for (let d = 0; d < days; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const isPresent = Math.random() > 0.15;
        const dayString = date.toISOString().split('T')[0];
        const _id = new ObjectId();
        
        attendance.push(withOdId({
          _id,
          studentId: student._id.toString(),
          student_id: student._id.toString(),
          classId: student.classId,
          class_id: student.classId,
          status: isPresent ? 'Present' : Math.random() > 0.5 ? 'Absent' : 'Late',
          timestamp: new Date(date.getTime() + 9 * 60 * 60 * 1000 + Math.random() * 3600000),
          date: date,
          session_id: `SESS-${dayString}`,
          sessionId: `SESS-${dayString}`,
          markedBy: teachers[0]._id.toString(),
          marked_by: teachers[0]._id.toString(),
          createdAt: date,
        }, 'ATT'));
      }
    }
    await db.collection(COLLECTIONS.ATTENDANCE).insertMany(attendance);
    console.log('Seeded Attendance');

    // 7. Seed Centralized Notes
    const notes = [];
    for (const sub of subjects) {
      for (let u = 1; u <= 3; u++) {
        const _id = new ObjectId();
        notes.push(withOdId({
          _id,
          subjectId: sub.name,
          subject_id: sub.name,
          unitNumber: u,
          unitName: `Unit ${u}: Foundation of ${sub.name}`,
          title: `Introductory Notes for ${sub.name} - Unit ${u}`,
          content: `This is a comprehensive study material for ${sub.name} Unit ${u}.`,
          noteType: 'centralized_notes',
          uploadedBy: teachers[0]._id.toString(),
          uploaded_by: teachers[0]._id.toString(),
          createdAt: now,
        }, 'NOTE'));
      }
    }
    await db.collection(COLLECTIONS.CENTRALIZED_NOTES).insertMany(notes);
    console.log('Seeded Centralized Notes');

    // 8. Seed Announcements
    const announcements = [
      withOdId({
        _id: new ObjectId(),
        title: 'Welcome to the New Term!',
        content: 'We are excited to welcome all students back.',
        classId: classes[0]._id.toString(),
        class_id: classes[0]._id.toString(),
        authorId: teachers[0]._id.toString(),
        author_id: teachers[0]._id.toString(),
        authorName: teachers[0].name,
        priority: 'high',
        createdAt: now,
      }, 'ANN'),
      withOdId({
        _id: new ObjectId(),
        title: 'Science Fair Next Week',
        content: 'Don\'t forget your projects.',
        classId: 'all',
        class_id: 'all',
        authorId: admin._id.toString(),
        author_id: admin._id.toString(),
        authorName: admin.name,
        priority: 'medium',
        createdAt: now,
      }, 'ANN'),
    ];
    await db.collection(COLLECTIONS.ANNOUNCEMENTS).insertMany(announcements);
    console.log('Seeded Announcements');

    // 9. Seed Timetable
    const timetable = [];
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const slots = [
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
      { start: '11:15', end: '12:15' },
      { start: '12:15', end: '13:15' },
    ];

    for (const cls of classes) {
      for (const day of daysOfWeek) {
        for (let s = 0; s < slots.length; s++) {
          const _id = new ObjectId();
          timetable.push(withOdId({
            _id,
            classId: cls._id.toString(),
            class_id: cls._id.toString(),
            dayOfWeek: day,
            day_of_week: day,
            startTime: slots[s].start,
            start_time: slots[s].start,
            endTime: slots[s].end,
            end_time: slots[s].end,
            subjectId: subjects[s % subjects.length].name,
            subject_id: subjects[s % subjects.length].name,
            teacherId: teachers[s % teachers.length]._id.toString(),
            teacher_id: teachers[s % teachers.length]._id.toString(),
            room: `Room ${100 + s}`,
          }, 'TT'));
        }
      }
    }
    await db.collection(COLLECTIONS.TIMETABLE).insertMany(timetable);
    console.log('Seeded Timetable');

    // 10. Seed Question Bank
    const qBank = [
      withOdId({
        _id: new ObjectId(),
        question: 'What is the value of Pi approximately?',
        options: ['3.14', '2.14', '4.14', '1.14'],
        correctAnswer: '3.14',
        correct_answer: '3.14',
        subject: 'Mathematics',
        subject_id: 'Mathematics',
        tags: ['geometry', 'basics'],
        difficulty: 'easy',
        createdAt: now,
      }, 'QB'),
      withOdId({
        _id: new ObjectId(),
        question: 'Which element has the symbol O?',
        options: ['Oxygen', 'Osmium', 'Gold', 'Silver'],
        correctAnswer: 'Oxygen',
        correct_answer: 'Oxygen',
        subject: 'Science',
        subject_id: 'Science',
        tags: ['chemistry', 'elements'],
        difficulty: 'easy',
        createdAt: now,
      }, 'QB'),
    ];
    await db.collection(COLLECTIONS.QUESTION_BANK).insertMany(qBank);
    console.log('Seeded Question Bank');

    console.log('--- Seed Process Completed Successfully ---');
    console.log('Credentials:');
    console.log('  Admin: admin@gyandeep.com / Gyandeep@2024');
    console.log('  Teacher: teacher1@gyandeep.com / Gyandeep@2024');
    console.log('  Student: student1@gyandeep.com / Gyandeep@2024');

  } catch (error) {
    console.error('Seed process failed:', error);
  } finally {
    await closeDatabase();
  }
}

seed();
