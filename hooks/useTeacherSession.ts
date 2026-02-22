import { useState, useCallback, useEffect } from 'react';
import { Coordinates, ClassSession } from '../types';
import { getCurrentPosition } from '../services/locationService';

interface UseTeacherSessionProps {
    classSession: ClassSession;
    onUpdateSession: (update: Partial<ClassSession>) => void;
    duration: number;
}

/**
 * Humanizes teacher session management logic.
 * Handles timers, location fetching, and session code generation.
 */
export function useTeacherSession({ classSession, onUpdateSession, duration }: UseTeacherSessionProps) {
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

    const generateCode = (subject: string, radius: number) => {
        if (!teacherLocation) throw new Error("Location not set");

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + duration * 1000;

        onUpdateSession({
            code,
            expiry,
            teacherLocation,
            subject,
            quiz: null,
            notes: null,
            quizPublished: false,
            attendanceRadius: radius
        });

        return { code, expiry };
    };

    return {
        timeLeft,
        isFetchingLocation,
        teacherLocation,
        setTeacherLocation,
        fetchCurrentLocation,
        generateCode
    };
}
