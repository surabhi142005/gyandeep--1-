/**
 * server/utils/validationSchemas.js
 * Validation schemas for all routes
 */

import { validators } from './validators.js';

export const authSchemas = {
  login: {
    email: [validators.isRequired, validators.isEmail],
    password: [validators.isRequired],
  },
  register: {
    name: [validators.isRequired, validators.isName],
    email: [validators.isRequired, validators.isEmail],
    password: [validators.isRequired, validators.isPassword],
    role: [validators.isInEnum.bind(null, undefined, ['student', 'teacher', 'admin'])],
  },
  passwordRequest: {
    email: [validators.isRequired, validators.isEmail],
  },
  passwordComplete: {
    email: [validators.isRequired, validators.isEmail],
    code: [validators.isRequired, validators.isString.bind(null, undefined, 'code', { minLength: 6, maxLength: 6 })],
    newPassword: [validators.isRequired, validators.isPassword],
  },
  emailVerifySend: {
    email: [validators.isRequired, validators.isEmail],
  },
  emailVerifyCheck: {
    email: [validators.isRequired, validators.isEmail],
    code: [validators.isRequired, validators.isString.bind(null, undefined, 'code', { minLength: 6, maxLength: 6 })],
  },
};

export const gradeSchemas = {
  create: {
    studentId: [validators.isRequired, validators.isMongoId],
    subjectId: [validators.isRequired, validators.isMongoId],
    score: [validators.isRequired, validators.isNumber.bind(null, undefined, 'score', { min: 0 })],
    maxScore: [validators.isRequired, validators.isNumber.bind(null, undefined, 'maxScore', { min: 1 })],
    title: [validators.isString.bind(null, undefined, 'title', { maxLength: 200 })],
    category: [validators.isString.bind(null, undefined, 'category', { maxLength: 100 })],
    teacherId: [validators.isMongoId],
    quizAttemptId: [validators.isMongoId],
  },
  bulk: {
    grades: [validators.isRequired, validators.isArray.bind(null, undefined, 'grades', { minLength: 1, maxLength: 100 })],
  },
};

export const attendanceSchemas = {
  create: {
    studentId: [validators.isRequired, validators.isMongoId],
    classId: [validators.isMongoId],
    sessionId: [validators.isMongoId],
    status: [validators.isRequired, validators.isInEnum.bind(null, undefined, ['Present', 'Absent', 'Late', 'Excused'])],
    notes: [validators.isString.bind(null, undefined, 'notes', { maxLength: 1000 })],
    coords: [validators.isCoordinates],
    faceImage: [validators.isBase64Image],
  },
  bulk: {
    records: [validators.isRequired, validators.isArray.bind(null, undefined, 'records', { minLength: 1, maxLength: 500 })],
  },
  update: {
    status: [validators.isInEnum.bind(null, undefined, ['Present', 'Absent', 'Late', 'Excused'])],
    notes: [validators.isString.bind(null, undefined, 'notes', { maxLength: 1000 })],
  },
};

export const userSchemas = {
  create: {
    name: [validators.isRequired, validators.isName],
    email: [validators.isRequired, validators.isEmail],
    password: [validators.isPassword],
    role: [validators.isInEnum.bind(null, undefined, ['student', 'teacher', 'admin'])],
    classId: [validators.isMongoId],
    assignedSubjects: [validators.isArray.bind(null, undefined, 'assignedSubjects', { itemType: 'mongoId' })],
  },
  update: {
    name: [validators.isName],
    email: [validators.isEmail],
    role: [validators.isInEnum.bind(null, undefined, ['student', 'teacher', 'admin'])],
    classId: [validators.isMongoId],
    assignedSubjects: [validators.isArray.bind(null, undefined, 'assignedSubjects', { itemType: 'mongoId' })],
    active: [validators.isBoolean],
  },
};

export const classSchemas = {
  create: {
    name: [validators.isRequired, validators.isString.bind(null, undefined, 'name', { minLength: 2, maxLength: 100 })],
    subject: [validators.isRequired, validators.isString.bind(null, undefined, 'subject', { maxLength: 100 })],
    teacherId: [validators.isMongoId],
    schedule: [validators.isObject],
    location: [validators.isString.bind(null, undefined, 'location', { maxLength: 200 })],
  },
  update: {
    name: [validators.isString.bind(null, undefined, 'name', { minLength: 2, maxLength: 100 })],
    subject: [validators.isString.bind(null, undefined, 'subject', { maxLength: 100 })],
    teacherId: [validators.isMongoId],
    schedule: [validators.isObject],
    location: [validators.isString.bind(null, undefined, 'location', { maxLength: 200 })],
    active: [validators.isBoolean],
  },
};

export const sessionSchemas = {
  create: {
    teacherId: [validators.isRequired, validators.isMongoId],
    classId: [validators.isMongoId],
    subjectId: [validators.isRequired, validators.isString.bind(null, undefined, 'subjectId', { maxLength: 100 })],
    code: [validators.isString.bind(null, undefined, 'code', { maxLength: 20 })],
    locationEnabled: [validators.isBoolean],
    locationRadius: [validators.isNumber.bind(null, undefined, 'locationRadius', { min: 10, max: 10000 })],
    locationLat: [validators.isNumber.bind(null, undefined, 'locationLat', { min: -90, max: 90 })],
    locationLng: [validators.isNumber.bind(null, undefined, 'locationLng', { min: -180, max: 180 })],
    faceEnabled: [validators.isBoolean],
  },
  quizStart: {
    questions: [validators.isRequired, validators.isArray.bind(null, undefined, 'questions', { minLength: 1 })],
    title: [validators.isString.bind(null, undefined, 'title', { maxLength: 200 })],
  },
  quizSubmit: {
    studentId: [validators.isRequired, validators.isMongoId],
    answers: [validators.isRequired, validators.isArray],
  },
  attendance: {
    studentId: [validators.isRequired, validators.isMongoId],
    status: [validators.isInEnum.bind(null, undefined, ['Present', 'Absent', 'Late'])],
  },
};

export const faceSchemas = {
  register: {
    userId: [validators.isRequired, validators.isMongoId],
    faceImage: [validators.isRequired, validators.isBase64Image],
    metadata: [validators.isObject],
  },
  verify: {
    userId: [validators.isRequired, validators.isMongoId],
    faceImage: [validators.isRequired, validators.isBase64Image],
    recordAttendance: [validators.isBoolean],
    sessionId: [validators.isMongoId],
    classId: [validators.isMongoId],
    location: [validators.isCoordinates],
  },
};

export const aiSchemas = {
  chat: {
    message: [validators.isRequired, validators.isString.bind(null, undefined, 'message', { maxLength: 5000 })],
    history: [validators.isArray],
  },
  quiz: {
    notesText: [validators.isRequired, validators.isString.bind(null, undefined, 'notesText', { maxLength: 50000 })],
    subject: [validators.isString.bind(null, undefined, 'subject', { maxLength: 100 })],
    enableThinkingMode: [validators.isBoolean],
  },
  grade: {
    questions: [validators.isRequired, validators.isArray],
    answers: [validators.isRequired, validators.isArray],
  },
  extractText: {
    imageBase64: [validators.isRequired, validators.isBase64Image],
  },
  summarize: {
    text: [validators.isRequired, validators.isString.bind(null, undefined, 'text', { maxLength: 50000 })],
    subject: [validators.isString.bind(null, undefined, 'subject', { maxLength: 100 })],
    mode: [validators.isInEnum.bind(null, undefined, ['bullets', 'paragraph', 'flashcards'])],
  },
};

export const paginationSchema = {
  page: [validators.isNumber.bind(null, undefined, 'page', { min: 1, max: 1000 })],
  limit: [validators.isNumber.bind(null, undefined, 'limit', { min: 1, max: 100 })],
  sortBy: [validators.isString.bind(null, undefined, 'sortBy', { maxLength: 50 })],
  sortOrder: [validators.isInEnum.bind(null, undefined, ['asc', 'desc'])],
};