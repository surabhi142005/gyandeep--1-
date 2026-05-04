import type { ClassSession, QuizQuestion } from '../types';

export const mapBackendSessionToClassSession = (session: any): Partial<ClassSession> => {
  const anchor = session?.locationAnchor || null;
  const expiry = session?.expiry ? new Date(session.expiry).getTime() : null;
  const startedAt = session?.startedAt
    ? new Date(session.startedAt).getTime()
    : session?.createdAt
      ? new Date(session.createdAt).getTime()
      : null;
  const endedAt = session?.endedAt ? new Date(session.endedAt).getTime() : null;
  const radius = session?.locationRadius ?? session?.attendanceRadius ?? session?.radius ?? 100;
  const quiz =
    Array.isArray(session?.quiz?.questions)
      ? (session.quiz.questions as QuizQuestion[])
      : Array.isArray(session?.quiz)
        ? (session.quiz as QuizQuestion[])
        : null;

  return {
    id: session?.id || session?._id?.toString?.() || '',
    code: session?.code || null,
    classId: session?.classId || null,
    expiry,
    startedAt,
    endedAt,
    isActive: ['waiting', 'active'].includes(session?.sessionStatus) && !endedAt && (!!expiry ? expiry > Date.now() : true),
    notes: session?.notes || null,
    quiz,
    quizPublished: Boolean(session?.quizPublished),
    subject: session?.subject || session?.subjectId || '',
    teacherLocation: anchor ? { lat: anchor.lat, lng: anchor.lng } : null,
    attendanceRadius: radius,
    lat: anchor?.lat ?? session?.lat,
    lng: anchor?.lng ?? session?.lng,
    radius,
    sessionStatus: session?.sessionStatus,
  };
};
