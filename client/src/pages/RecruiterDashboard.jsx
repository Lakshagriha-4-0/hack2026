import { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { Plus, Briefcase, FileText, ChevronRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const RecruiterDashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [showTestBuilder, setShowTestBuilder] = useState(false);
    const [createError, setCreateError] = useState('');
    const [testBuilderMessage, setTestBuilderMessage] = useState('');
    const [aiInsertPosition, setAiInsertPosition] = useState('after');
    const [newJob, setNewJob] = useState({
        title: '',
        description: '',
        requiredSkills: '',
        location: '',
        salaryRange: '',
        deadlineDate: '',
    });
    const [recruiterTest, setRecruiterTest] = useState({
        generatedBy: 'manual',
        passScore: 0,
        questions: [],
    });

    const parsedSkills = newJob.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean);
    const canConfigureTest = Boolean(
        newJob.title.trim() &&
        newJob.description.trim() &&
        parsedSkills.length > 0
    );

    useEffect(() => {
        fetchMyJobs();
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        const shouldLockScroll = showCreate || showTestBuilder;
        if (!shouldLockScroll) return undefined;

        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
        };
    }, [showCreate, showTestBuilder]);

    const fetchMyJobs = async () => {
        try {
            const { data } = await api.get('/jobs/mine');
            setJobs(data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        try {
            setCreateError('');
            const skillsArray = parsedSkills;
            if (!recruiterTest.questions.length) {
                setCreateError('Please configure at least one recruiter qualification question.');
                return;
            }
            await api.post('/jobs', {
                ...newJob,
                requiredSkills: skillsArray,
                recruiterTest,
            });
            setShowCreate(false);
            setShowTestBuilder(false);
            setNewJob({ title: '', description: '', requiredSkills: '', location: '', salaryRange: '', deadlineDate: '' });
            setRecruiterTest({ generatedBy: 'manual', passScore: 0, questions: [] });
            fetchMyJobs();
        } catch (err) {
            setCreateError(err.response?.data?.message || 'Failed to create job');
        }
    };

    const addManualQuestion = () => {
        const uniqueId = `rq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setRecruiterTest((prev) => ({
            ...prev,
            generatedBy: 'manual',
            questions: [
                ...prev.questions,
                {
                    questionId: uniqueId,
                    question: '',
                    options: ['', '', '', ''],
                    correctAnswer: '',
                    isEditing: true,
                },
            ],
        }));
    };

    const updateQuestion = (idx, patch) => {
        setRecruiterTest((prev) => ({
            ...prev,
            questions: prev.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
        }));
    };

    const deleteQuestion = (idx) => {
        setRecruiterTest((prev) => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== idx),
        }));
    };

    const saveTestBuilder = () => {
        const validQuestions = recruiterTest.questions.filter((q) => {
            const opts = Array.isArray(q.options) ? q.options.map((o) => String(o || '').trim()).filter(Boolean) : [];
            return String(q.question || '').trim() && opts.length >= 2 && opts.includes(String(q.correctAnswer || '').trim());
        });

        if (!validQuestions.length) {
            setTestBuilderMessage('Add at least one valid question with options and correct answer.');
            return;
        }

        setRecruiterTest((prev) => ({
            ...prev,
            questions: validQuestions.map((q, idx) => ({
                questionId: `rq${idx + 1}`,
                question: String(q.question || '').trim(),
                options: (q.options || []).map((o) => String(o || '').trim()).filter(Boolean),
                correctAnswer: String(q.correctAnswer || '').trim(),
                isEditing: false,
            })),
        }));
        setTestBuilderMessage('Test saved for this job.');
        setShowTestBuilder(false);
    };

    const generateAiTest = async () => {
        const skillsArray = parsedSkills;
        if (!canConfigureTest) {
            setTestBuilderMessage('Add job title, description and required skills first.');
            return;
        }
        try {
            setCreateError('');
            setTestBuilderMessage('Generating AI questions...');
            const { data } = await api.post('/recruiter/jobs/test/generate', {
                title: newJob.title,
                requiredSkills: skillsArray,
            });
            const aiQuestions = (data.questions || []).map((q, idx) => ({
                ...q,
                questionId: q.questionId || `aiq${Date.now()}_${idx + 1}`,
                isEditing: false,
            }));
            setRecruiterTest((prev) => {
                const existing = Array.isArray(prev.questions) ? prev.questions : [];
                const merged = aiInsertPosition === 'before'
                    ? [...aiQuestions, ...existing]
                    : [...existing, ...aiQuestions];
                return {
                    ...prev,
                    generatedBy: existing.length ? 'manual' : (data.generatedBy || 'ai'),
                    questions: merged,
                };
            });
            setTestBuilderMessage('AI questions added successfully.');
            setShowTestBuilder(true);
        } catch (err) {
            setCreateError(err.response?.data?.message || 'Failed to generate AI test');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <main className="max-w-6xl mx-auto py-12 px-4 relative">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 animate-slide-up gap-6">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Recruiter Center</h1>
                        <p className="text-slate-500">Manage your postings and review talent anonymously.</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                    >
                        <Plus className="w-5 h-5" /> Post New Job
                    </button>
                </div>

                {showCreate && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start md:items-center justify-center z-[200] p-4 overflow-y-auto">
                        <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-8 shadow-2xl my-8 max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain">
                            <h2 className="text-2xl font-bold mb-6">Create Job Posting</h2>
                            <form onSubmit={handleCreateJob} className="space-y-4">
                                {createError && (
                                    <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-sm">
                                        {createError}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm text-slate-500 mb-1">Job Title</label>
                                    <input
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                                        value={newJob.title}
                                        onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-500 mb-1">Description</label>
                                    <textarea
                                        required
                                        rows="4"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                                        value={newJob.description}
                                        onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-500 mb-1">Required Skills (comma separated)</label>
                                    <input
                                        required
                                        placeholder="React, Node.js, SQL"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                                        value={newJob.requiredSkills}
                                        onChange={e => setNewJob({ ...newJob, requiredSkills: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-500 mb-1">Location</label>
                                        <input
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                                            value={newJob.location}
                                            onChange={e => setNewJob({ ...newJob, location: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-500 mb-1">Salary Range</label>
                                        <input
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                                            value={newJob.salaryRange}
                                            onChange={e => setNewJob({ ...newJob, salaryRange: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-500 mb-1">Application Deadline</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                                        value={newJob.deadlineDate}
                                        onChange={e => setNewJob({ ...newJob, deadlineDate: e.target.value })}
                                    />
                                </div>
                                <div className="pt-4 border-t border-slate-800">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold">Candidate Qualification Test</p>
                                            <p className="text-xs text-slate-500">Mandatory second test after candidate applies.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={!canConfigureTest}
                                                title={!canConfigureTest ? 'Add title, description and required skills first.' : ''}
                                                onClick={() => { setShowTestBuilder(true); setTestBuilderMessage(''); }}
                                                className={`px-3 py-2 rounded-lg text-sm font-semibold ${canConfigureTest
                                                    ? 'bg-slate-800 hover:bg-slate-700'
                                                    : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                                                    }`}
                                            >
                                                Configure Test
                                            </button>
                                        </div>
                                    </div>
                                    {!canConfigureTest && (
                                        <p className="mt-2 text-xs text-amber-400">
                                            Enter job title, description and required skills to configure qualification test.
                                        </p>
                                    )}
                                    <p className="mt-3 text-xs text-slate-500">
                                        Configured questions: {recruiterTest.questions.length} | Pass score: {recruiterTest.passScore}%
                                    </p>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="submit" className="flex-1 bg-emerald-600 py-3 rounded-xl font-bold hover:bg-emerald-500">Create Posting</button>
                                    <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-3 border border-slate-700 rounded-xl hover:bg-slate-800">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showCreate && showTestBuilder && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center z-[220] p-4 overflow-y-auto">
                        <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl p-6 shadow-2xl my-8 max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold">Recruiter Qualification Test</h3>
                                <button onClick={() => setShowTestBuilder(false)} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm">Close</button>
                            </div>
                            <div className="mb-4">
                                <label className="text-sm text-slate-400">Pass Score (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={recruiterTest.passScore}
                                    onChange={(e) => setRecruiterTest((prev) => ({ ...prev, passScore: Number(e.target.value || 0) }))}
                                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                                />
                            </div>
                            <div className="space-y-4">
                                {recruiterTest.questions.map((q, idx) => (
                                    <div key={q.questionId || idx} className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-slate-300">Question {idx + 1}</p>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuestion(idx, { isEditing: !q.isEditing })}
                                                    className="px-2 py-1 text-xs rounded-md bg-slate-700 hover:bg-slate-600"
                                                >
                                                    {q.isEditing ? 'Done Editing' : 'Edit'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteQuestion(idx)}
                                                    className="px-2 py-1 text-xs rounded-md bg-red-600/80 hover:bg-red-500"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        {q.isEditing ? (
                                            <>
                                                <input
                                                    value={q.question}
                                                    onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                                                    placeholder={`Question ${idx + 1}`}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                                                />
                                                {(q.options || []).map((opt, optIdx) => (
                                                    <input
                                                        key={optIdx}
                                                        value={opt}
                                                        onChange={(e) => {
                                                            const nextOptions = [...(q.options || [])];
                                                            nextOptions[optIdx] = e.target.value;
                                                            updateQuestion(idx, { options: nextOptions });
                                                        }}
                                                        placeholder={`Option ${optIdx + 1}`}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                                                    />
                                                ))}
                                                <select
                                                    value={q.correctAnswer || ''}
                                                    onChange={(e) => updateQuestion(idx, { correctAnswer: e.target.value })}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                                                >
                                                    <option value="">Select correct answer</option>
                                                    {(q.options || []).filter(Boolean).map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </>
                                        ) : (
                                            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm">
                                                <p className="text-slate-200 mb-2">{q.question || 'No question text'}</p>
                                                <ul className="space-y-1 text-slate-400">
                                                    {(q.options || []).map((opt, i) => (
                                                        <li key={`${opt}-${i}`}>
                                                            {opt} {opt === q.correctAnswer ? '(correct)' : ''}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button onClick={addManualQuestion} className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-sm font-semibold">Add Manual Question</button>
                                <button onClick={generateAiTest} className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 text-sm font-semibold">Generate with AI</button>
                                <select
                                    value={aiInsertPosition}
                                    onChange={(e) => setAiInsertPosition(e.target.value)}
                                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                                >
                                    <option value="after">Insert AI After Existing</option>
                                    <option value="before">Insert AI Before Existing</option>
                                </select>
                            </div>
                            {testBuilderMessage && (
                                <p className="mt-3 text-xs text-slate-400">{testBuilderMessage}</p>
                            )}
                            <div className="mt-2">
                                <button onClick={saveTestBuilder} className="w-full px-4 py-2.5 bg-emerald-600 rounded-lg hover:bg-emerald-500 text-sm font-bold">
                                    Save Qualification Test
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-900 animate-pulse rounded-2xl"></div>)}
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-4 rounded-xl">
                        {error}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {jobs.map(job => (
                            <div key={job._id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-emerald-500/30 transition-all flex flex-col justify-between">
                                <div>
                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                                        <Briefcase className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{job.title}</h3>
                                    <div className="text-slate-500 text-sm mb-6 line-clamp-2">{job.description}</div>
                                    <div className="flex flex-wrap gap-2 mb-8">
                                        {job.requiredSkills.slice(0, 3).map(s => (
                                            <span key={s} className="text-[10px] uppercase font-bold tracking-wider bg-slate-800 px-2 py-1 rounded">
                                                {s}
                                            </span>
                                        ))}
                                        {job.requiredSkills.length > 3 && <span className="text-[10px] text-slate-600">+{job.requiredSkills.length - 3} more</span>}
                                    </div>
                                    {job.deadlineAt && (
                                        <p className="text-xs text-amber-400/90 mb-4">
                                            Deadline: {new Date(job.deadlineAt).toLocaleString()}
                                        </p>
                                    )}
                                    {job.status === 'expired' && (
                                        <p className="text-xs text-red-400/90 mb-4 font-semibold">Expired</p>
                                    )}
                                </div>

                                <Link
                                    to={`/recruiter/jobs/${job._id}/applications`}
                                    className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-all"
                                >
                                    <Users className="w-4 h-4" /> View Applications
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default RecruiterDashboard;
