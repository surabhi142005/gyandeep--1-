import React, { useState, useEffect, useMemo } from 'react';
import { fetchGrades, addGrade, deleteGrade, addGradesBulk } from '../services/dataService';
import { websocketService } from '../services/websocketService';

interface GradeBookProps {
    students: Array<{ id: string; name: string; classId?: string }>;
    currentUserId: string;
    currentUserRole: 'teacher' | 'admin';
    subjects: Array<{ id: string; name: string }>;
    theme: string;
    attendance?: Array<{ studentId: string; status: string }>;
    onUpdatePerformance?: (studentId: string, performance: any) => void;
}

interface GradeEntry {
    id: string;
    studentId: string;
    subject: string;
    category: 'quiz' | 'assignment' | 'exam';
    title: string;
    score: number;
    maxScore: number;
    weight?: number;
    date: string;
    teacherId?: string;
}

interface CategoryWeight {
    quiz: number;
    assignment: number;
    exam: number;
}

const THEME_COLORS: Record<string, Record<string, string>> = {
    indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500', border: 'border-indigo-500', lightBg: 'bg-indigo-50' },
    teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500', border: 'border-teal-500', lightBg: 'bg-teal-50' },
    crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500', border: 'border-red-500', lightBg: 'bg-red-50' },
    purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500', border: 'border-purple-500', lightBg: 'bg-purple-50' },
};

const DEFAULT_WEIGHTS: CategoryWeight = { quiz: 30, assignment: 30, exam: 40 };

const CATEGORY_LABELS: Record<string, string> = {
    quiz: 'Quiz',
    assignment: 'Assignment',
    exam: 'Exam',
};

const GradeBook: React.FC<GradeBookProps> = ({ students, currentUserId, currentUserRole, subjects, theme }) => {
    const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

    // State
    const [grades, setGrades] = useState<GradeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [lastSyncAt, setLastSyncAt] = useState<string>('Never');

    // Category weights
    const [weights, setWeights] = useState<CategoryWeight>({ ...DEFAULT_WEIGHTS });
    const [showWeightEditor, setShowWeightEditor] = useState(false);

    // Add grade form
    const [formStudentId, setFormStudentId] = useState('');
    const [formSubject, setFormSubject] = useState('');
    const [formCategory, setFormCategory] = useState<'quiz' | 'assignment' | 'exam'>('quiz');
    const [formTitle, setFormTitle] = useState('');
    const [formScore, setFormScore] = useState('');
    const [formMaxScore, setFormMaxScore] = useState('100');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filters
    const [filterStudent, setFilterStudent] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // Bulk entry
    const [showBulkEntry, setShowBulkEntry] = useState(false);
    const [bulkSubject, setBulkSubject] = useState('');
    const [bulkCategory, setBulkCategory] = useState<'quiz' | 'assignment' | 'exam'>('quiz');
    const [bulkTitle, setBulkTitle] = useState('');
    const [bulkMaxScore, setBulkMaxScore] = useState('100');
    const [bulkScores, setBulkScores] = useState<Record<string, string>>({});
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

    // Active tab
    const [activeTab, setActiveTab] = useState<'grades' | 'add' | 'bulk' | 'averages'>('grades');

    // Load grades on mount
    useEffect(() => {
        loadGrades();

        const unsubscribe = websocketService.on('grades-changed', () => {
            loadGrades();
        });

        return () => unsubscribe();
    }, []);

    // Auto-dismiss success messages
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const loadGrades = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchGrades();
            setGrades(Array.isArray(data) ? data : []);
            setLastSyncAt(new Date().toLocaleTimeString());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load grades');
        } finally {
            setLoading(false);
        }
    };

    // Filtered grades
    const filteredGrades = useMemo(() => {
        return grades.filter(g => {
            if (filterStudent && g.studentId !== filterStudent) return false;
            if (filterSubject && g.subject !== filterSubject) return false;
            if (filterCategory && g.category !== filterCategory) return false;
            return true;
        });
    }, [grades, filterStudent, filterSubject, filterCategory]);

    // Per-student weighted averages
    const studentAverages = useMemo(() => {
        const averages: Array<{
            studentId: string;
            studentName: string;
            subject: string;
            quizAvg: number | null;
            assignmentAvg: number | null;
            examAvg: number | null;
            weightedAvg: number | null;
            totalEntries: number;
        }> = [];

        const grouped: Record<string, Record<string, GradeEntry[]>> = {};
        grades.forEach(g => {
            const key = g.studentId;
            if (!grouped[key]) grouped[key] = {};
            if (!grouped[key][g.subject]) grouped[key][g.subject] = [];
            grouped[key][g.subject].push(g);
        });

        Object.entries(grouped).forEach(([studentId, subjectMap]) => {
            const student = students.find(s => s.id === studentId);
            const studentName = student?.name || studentId;

            Object.entries(subjectMap).forEach(([subject, entries]) => {
                const categoryAvg = (cat: string): number | null => {
                    const catEntries = entries.filter(e => e.category === cat);
                    if (catEntries.length === 0) return null;
                    const total = catEntries.reduce((sum, e) => sum + (e.score / e.maxScore) * 100, 0);
                    return total / catEntries.length;
                };

                const quizAvg = categoryAvg('quiz');
                const assignmentAvg = categoryAvg('assignment');
                const examAvg = categoryAvg('exam');

                let weightedAvg: number | null = null;
                let totalWeight = 0;
                let weightedSum = 0;

                if (quizAvg !== null) {
                    weightedSum += quizAvg * weights.quiz;
                    totalWeight += weights.quiz;
                }
                if (assignmentAvg !== null) {
                    weightedSum += assignmentAvg * weights.assignment;
                    totalWeight += weights.assignment;
                }
                if (examAvg !== null) {
                    weightedSum += examAvg * weights.exam;
                    totalWeight += weights.exam;
                }

                if (totalWeight > 0) {
                    weightedAvg = weightedSum / totalWeight;
                }

                averages.push({
                    studentId,
                    studentName,
                    subject,
                    quizAvg,
                    assignmentAvg,
                    examAvg,
                    weightedAvg,
                    totalEntries: entries.length,
                });
            });
        });

        return averages.sort((a, b) => a.studentName.localeCompare(b.studentName));
    }, [grades, students, weights]);

    // Handlers
    const handleAddGrade = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formStudentId || !formSubject || !formTitle || !formScore || !formMaxScore) {
            setError('Please fill in all required fields.');
            return;
        }

        const score = parseFloat(formScore);
        const maxScore = parseFloat(formMaxScore);
        if (isNaN(score) || isNaN(maxScore) || score < 0 || maxScore <= 0 || score > maxScore) {
            setError('Please enter valid score values. Score must be between 0 and max score.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await addGrade({
                studentId: formStudentId,
                subject: formSubject,
                category: formCategory,
                title: formTitle,
                score,
                maxScore,
                date: new Date().toISOString().split('T')[0],
                teacherId: currentUserId,
            });
            setSuccessMessage('Grade added successfully.');
            setFormTitle('');
            setFormScore('');
            setFormMaxScore('100');
            await loadGrades();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add grade');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteGrade = async (gradeId: string) => {
        if (!confirm('Are you sure you want to delete this grade?')) return;
        setError(null);
        try {
            await deleteGrade(gradeId);
            setSuccessMessage('Grade deleted successfully.');
            await loadGrades();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete grade');
        }
    };

    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkSubject || !bulkTitle || !bulkMaxScore) {
            setError('Please fill in subject, title, and max score for bulk entry.');
            return;
        }

        const maxScore = parseFloat(bulkMaxScore);
        if (isNaN(maxScore) || maxScore <= 0) {
            setError('Max score must be a positive number.');
            return;
        }

        const bulkGrades: Array<{
            studentId: string;
            subject: string;
            category: string;
            title: string;
            score: number;
            maxScore: number;
            date: string;
            teacherId: string;
        }> = [];

        for (const student of students) {
            const scoreStr = bulkScores[student.id];
            if (scoreStr === undefined || scoreStr.trim() === '') continue;
            const score = parseFloat(scoreStr);
            if (isNaN(score) || score < 0 || score > maxScore) {
                setError(`Invalid score for ${student.name}. Must be between 0 and ${maxScore}.`);
                return;
            }
            bulkGrades.push({
                studentId: student.id,
                subject: bulkSubject,
                category: bulkCategory,
                title: bulkTitle,
                score,
                maxScore,
                date: new Date().toISOString().split('T')[0],
                teacherId: currentUserId,
            });
        }

        if (bulkGrades.length === 0) {
            setError('Please enter at least one student score.');
            return;
        }

        setIsBulkSubmitting(true);
        setError(null);
        try {
            await addGradesBulk(bulkGrades);
            setSuccessMessage(`${bulkGrades.length} grade(s) added successfully.`);
            setBulkTitle('');
            setBulkMaxScore('100');
            setBulkScores({});
            await loadGrades();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add bulk grades');
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    const handleExportCSV = () => {
        const rows: string[][] = [
            ['Student', 'Subject', 'Category', 'Title', 'Score', 'Max Score', 'Percentage', 'Date'],
        ];
        filteredGrades.forEach(g => {
            const student = students.find(s => s.id === g.studentId);
            rows.push([
                student?.name || g.studentId,
                g.subject,
                CATEGORY_LABELS[g.category] || g.category,
                g.title,
                String(g.score),
                String(g.maxScore),
                ((g.score / g.maxScore) * 100).toFixed(1) + '%',
                g.date || '',
            ]);
        });

        const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gradebook_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleWeightChange = (category: keyof CategoryWeight, value: string) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0 || num > 100) return;
        setWeights(prev => ({ ...prev, [category]: num }));
    };

    const weightsTotal = weights.quiz + weights.assignment + weights.exam;

    const getPercentageColor = (pct: number): string => {
        if (pct >= 90) return 'text-green-600';
        if (pct >= 75) return 'text-blue-600';
        if (pct >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getPercentageBadge = (pct: number): string => {
        if (pct >= 90) return 'bg-green-100 text-green-800';
        if (pct >= 75) return 'bg-blue-100 text-blue-800';
        if (pct >= 60) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    const formatAvg = (val: number | null): string => {
        if (val === null) return '--';
        return val.toFixed(1) + '%';
    };

    // Render
    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-600"></div>
                <span className="ml-3 text-gray-600 text-lg">Loading grade book...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Grade Book</h2>
                    <p className="text-xs text-gray-400 mt-1">Last synced: {lastSyncAt} · Source: live server</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={filteredGrades.length === 0}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Export CSV
                    </button>
                    <button
                        onClick={() => setShowWeightEditor(!showWeightEditor)}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${showWeightEditor ? `${colors.primary} text-white ${colors.hover}` : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        Weights
                    </button>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">x</button>
                </div>
            )}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {successMessage}
                </div>
            )}

            {/* Weight Editor */}
            {showWeightEditor && (
                <div className={`${colors.lightBg} border ${colors.border} rounded-lg p-4`}>
                    <h3 className={`text-sm font-semibold ${colors.text} mb-3`}>Category Weights</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {(['quiz', 'assignment', 'exam'] as const).map(cat => (
                            <div key={cat}>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    {CATEGORY_LABELS[cat]} (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={weights[cat]}
                                    onChange={e => handleWeightChange(cat, e.target.value)}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                                />
                            </div>
                        ))}
                    </div>
                    <div className={`mt-2 text-xs ${weightsTotal === 100 ? 'text-green-600' : 'text-red-600'}`}>
                        Total: {weightsTotal}% {weightsTotal !== 100 && '(should be 100%)'}
                    </div>
                    <button
                        onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}
                        className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                        Reset to defaults (30/30/40)
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-1 -mb-px" aria-label="Grade Book Tabs">
                    {([
                        { key: 'grades', label: 'All Grades' },
                        { key: 'add', label: 'Add Grade' },
                        { key: 'bulk', label: 'Bulk Entry' },
                        { key: 'averages', label: 'Averages' },
                    ] as const).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? `${colors.border} ${colors.text}`
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab: All Grades */}
            {activeTab === 'grades' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <select
                            value={filterStudent}
                            onChange={e => setFilterStudent(e.target.value)}
                            className={`px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                        >
                            <option value="">All Students</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <select
                            value={filterSubject}
                            onChange={e => setFilterSubject(e.target.value)}
                            className={`px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                        >
                            <option value="">All Subjects</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                        <select
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            className={`px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                        >
                            <option value="">All Categories</option>
                            <option value="quiz">Quiz</option>
                            <option value="assignment">Assignment</option>
                            <option value="exam">Exam</option>
                        </select>
                    </div>

                    {/* Grades Table */}
                    {filteredGrades.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-lg">No grades found.</p>
                            <p className="text-sm mt-1">Add grades using the "Add Grade" or "Bulk Entry" tabs.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Score</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Percentage</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredGrades.map(grade => {
                                        const student = students.find(s => s.id === grade.studentId);
                                        const pct = (grade.score / grade.maxScore) * 100;
                                        return (
                                            <tr key={grade.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-gray-800 font-medium">{student?.name || grade.studentId}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{grade.subject}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        grade.category === 'exam' ? 'bg-purple-100 text-purple-800' :
                                                        grade.category === 'quiz' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-orange-100 text-orange-800'
                                                    }`}>
                                                        {CATEGORY_LABELS[grade.category] || grade.category}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{grade.title}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700 text-right">{grade.score}/{grade.maxScore}</td>
                                                <td className="px-4 py-3 text-sm text-right">
                                                    <span className={`font-semibold ${getPercentageColor(pct)}`}>
                                                        {pct.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{grade.date || '--'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleDeleteGrade(grade.id)}
                                                        className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                                                        title="Delete grade"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="text-xs text-gray-400 text-right">
                        Showing {filteredGrades.length} of {grades.length} grade(s)
                    </div>
                </div>
            )}

            {/* Tab: Add Grade */}
            {activeTab === 'add' && (
                <form onSubmit={handleAddGrade} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Add Single Grade</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                            <select
                                value={formStudentId}
                                onChange={e => setFormStudentId(e.target.value)}
                                required
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                            >
                                <option value="">Select student...</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                            <select
                                value={formSubject}
                                onChange={e => setFormSubject(e.target.value)}
                                required
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                            >
                                <option value="">Select subject...</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                            <select
                                value={formCategory}
                                onChange={e => setFormCategory(e.target.value as 'quiz' | 'assignment' | 'exam')}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                            >
                                <option value="quiz">Quiz ({weights.quiz}%)</option>
                                <option value="assignment">Assignment ({weights.assignment}%)</option>
                                <option value="exam">Exam ({weights.exam}%)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                            <input
                                type="text"
                                value={formTitle}
                                onChange={e => setFormTitle(e.target.value)}
                                required
                                placeholder="e.g. Midterm Exam, Quiz 1"
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Score *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={formScore}
                                onChange={e => setFormScore(e.target.value)}
                                required
                                placeholder="0"
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Score *</label>
                            <input
                                type="number"
                                min="1"
                                step="0.1"
                                value={formMaxScore}
                                onChange={e => setFormMaxScore(e.target.value)}
                                required
                                placeholder="100"
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-6 py-2.5 ${colors.primary} text-white rounded-lg ${colors.hover} transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isSubmitting ? 'Adding...' : 'Add Grade'}
                        </button>
                    </div>
                </form>
            )}

            {/* Tab: Bulk Entry */}
            {activeTab === 'bulk' && (
                <form onSubmit={handleBulkSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Bulk Grade Entry</h3>
                    <p className="text-sm text-gray-500 mb-4">Enter scores for all students at once for a single assignment.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                            <select
                                value={bulkSubject}
                                onChange={e => setBulkSubject(e.target.value)}
                                required
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                            >
                                <option value="">Select subject...</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                            <select
                                value={bulkCategory}
                                onChange={e => setBulkCategory(e.target.value as 'quiz' | 'assignment' | 'exam')}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                            >
                                <option value="quiz">Quiz</option>
                                <option value="assignment">Assignment</option>
                                <option value="exam">Exam</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                            <input
                                type="text"
                                value={bulkTitle}
                                onChange={e => setBulkTitle(e.target.value)}
                                required
                                placeholder="e.g. Quiz 3"
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Score *</label>
                            <input
                                type="number"
                                min="1"
                                step="0.1"
                                value={bulkMaxScore}
                                onChange={e => setBulkMaxScore(e.target.value)}
                                required
                                placeholder="100"
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}
                            />
                        </div>
                    </div>

                    {/* Student score inputs */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-600">Student Scores</span>
                            <span className="text-xs text-gray-400">
                                {Object.values(bulkScores).filter(v => v.trim() !== '').length} of {students.length} filled
                            </span>
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                            {students.map(student => (
                                <div key={student.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                                    <span className="text-sm text-gray-700 font-medium truncate mr-4 flex-1">{student.name}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={bulkScores[student.id] || ''}
                                        onChange={e => setBulkScores(prev => ({ ...prev, [student.id]: e.target.value }))}
                                        placeholder="--"
                                        className={`w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-right ${colors.ring} focus:outline-none focus:ring-2`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isBulkSubmitting}
                            className={`px-6 py-2.5 ${colors.primary} text-white rounded-lg ${colors.hover} transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isBulkSubmitting ? 'Submitting...' : 'Submit All Grades'}
                        </button>
                    </div>
                </form>
            )}

            {/* Tab: Averages */}
            {activeTab === 'averages' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">Weighted Averages</h3>
                        <span className="text-xs text-gray-400">
                            Weights: Quiz {weights.quiz}% / Assignment {weights.assignment}% / Exam {weights.exam}%
                        </span>
                    </div>

                    {studentAverages.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-lg">No grade data available.</p>
                            <p className="text-sm mt-1">Add grades to see weighted averages here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Quiz Avg</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Assignment Avg</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Exam Avg</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Weighted Avg</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Entries</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {studentAverages.map((row, idx) => (
                                        <tr key={`${row.studentId}-${row.subject}-${idx}`} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-800 font-medium">{row.studentName}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{row.subject}</td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                <span className={row.quizAvg !== null ? getPercentageColor(row.quizAvg) : 'text-gray-400'}>
                                                    {formatAvg(row.quizAvg)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                <span className={row.assignmentAvg !== null ? getPercentageColor(row.assignmentAvg) : 'text-gray-400'}>
                                                    {formatAvg(row.assignmentAvg)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                <span className={row.examAvg !== null ? getPercentageColor(row.examAvg) : 'text-gray-400'}>
                                                    {formatAvg(row.examAvg)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                {row.weightedAvg !== null ? (
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${getPercentageBadge(row.weightedAvg)}`}>
                                                        {row.weightedAvg.toFixed(1)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">--</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 text-right">{row.totalEntries}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GradeBook;
