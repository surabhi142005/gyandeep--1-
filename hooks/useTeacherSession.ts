import { useState, useCallback, useEffect } from 'react';
import type { Coordinates, ClassSession, HistoricalSessionRecord } from '../types';
import { getCurrentPosition } from '../services/locationService';
import {
    createClassSession,
    endClassSession,
    regenerateSessionCode,
    startClassSession,
} from '../services/dataService';
import { mapBackendSessionToClassSession } from '../services/sessionState';

interface UseTeacherSessionProps {
    classSession: ClassSession;
    onUpdateSession: (update: Partial<ClassSession>) => void;
    historicalRecords?: HistoricalSessionRecord[];
    duration?: number;
    teacherId: string;
    defaultClassId?: string | null;
}

/**
 * Humanizes teacher session management logic.
 * Handles timers, location fetching, and session code generation.
 */
export function useTeacherSession({
    classSession,
    onUpdateSession,
    historicalRecords = [],
    duration = 600,
    teacherId,
    defaultClassId = null,
}: UseTeacherSessionProps) {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [teacherLocation, setTeacherLocation] = useState<Coordinates | null>(classSession.teacherLocation || null);

    const calculateTimeLeft = useCallback(() => {
        if (classSession.expiry) {
            const left = Math.round((classSession.expiry - Date.now()) / 1000);
            setTimeLeft(left > 0 ? left : 0);
        } else {
            setTimeLeft(0);
        }
    }, [classSession.expiry]);

    useEffect(() => {
        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [calculateTimeLeft]);

    const fetchCurrentLocation = async () => {
        setIsFetchingLocation(true);
        try {
            const location = await getCurrentPosition();
            setTeacherLocation(location);
            return location;
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const startSession = async (subject: string, lat?: number, lng?: number) => {
        let location = teacherLocation;
        if (lat !== undefined && lng !== undefined) {
            location = { lat, lng };
            setTeacherLocation(location);
        } else if (!location) {
            location = await fetchCurrentLocation();
        }
        
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const created = await createClassSession({
            teacherId,
            classId: classSession.classId || defaultClassId || null,
            subjectId: subject,
            code,
            locationEnabled: Boolean(location),
            locationRadius: classSession.attendanceRadius || 100,
            locationLat: location?.lat,
            locationLng: location?.lng,
            faceEnabled: true,
        });

        const sessionId = created?.session?.id;
        if (!sessionId) {
            throw new Error('Session creation failed');
        }

        await startClassSession(sessionId);

        onUpdateSession({
            ...mapBackendSessionToClassSession({
                ...created.session,
                sessionStatus: 'active',
                startedAt: new Date().toISOString(),
                expiry: created.session.expiry || new Date(Date.now() + duration * 1000).toISOString(),
            }),
            classId: created.session.classId || classSession.classId || defaultClassId || null,
            teacherLocation: location,
            subject,
            quiz: null,
            notes: null,
            quizPublished: false,
            isActive: true,
        });
    };

    const endSession = async () => {
        if (classSession.id) {
            await endClassSession(classSession.id);
        }
        onUpdateSession({
            endedAt: Date.now(),
            isActive: false,
            sessionStatus: 'ended',
        });
    };

    const exportSession = async () => {
        const sessionData = {
            session: classSession,
            records: historicalRecords,
            exportedAt: new Date().toISOString()
        };
        
        // Trigger download
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `session-report-${classSession.subject || 'class'}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return sessionData;
    };

    const generateCode = async (subject: string = classSession.subject || '', radius: number = 10) => {
        if (!teacherLocation) throw new Error("Location not set");

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + duration * 1000;

        if (classSession.id) {
            const response = await regenerateSessionCode(classSession.id, {
                code,
                expiresInSeconds: duration,
                subjectId: subject,
                locationRadius: radius,
                locationLat: teacherLocation.lat,
                locationLng: teacherLocation.lng,
            });

            onUpdateSession({
                ...mapBackendSessionToClassSession(response?.session),
                subject,
                teacherLocation,
                attendanceRadius: radius,
                isActive: true,
            });

            return { code, expiry };
        }

        onUpdateSession({
            code,
            expiry,
            teacherLocation,
            subject,
            quiz: null,
            notes: null,
            quizPublished: false,
            attendanceRadius: radius,
        });

        return { code, expiry };
    };

    return {
        timeLeft,
        isFetchingLocation,
        teacherLocation,
        setTeacherLocation,
        fetchCurrentLocation,
        generateCode,
        startSession,
        endSession,
        exportSession
    };
}
