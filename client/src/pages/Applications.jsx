import { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { FileText, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Applications = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [workTests, setWorkTests] = useState({});
    const [answersByApp, setAnswersByApp] = useState({});

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const { data } = await api.get('/candidate/applications');
                setApplications(data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load applications');
            } finally {
                setLoading(false);
            }
        };
        fetchApplications();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'shortlisted': return 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20';
            case 'rejected': return 'text-red-400 bg-red-400/10 border-red-500/20';
            default: return 'text-blue-400 bg-blue-400/10 border-blue-500/20';
        }
    };

    const loadWorkTest = async (appId) => {
        try {
            const { data } = await api.get(`/candidate/applications/${appId}/work-test`);
            setWorkTests((prev) => ({ ...prev, [appId]: data }));
        } catch (err) {
            setWorkTests((prev) => ({
                ...prev,
                [appId]: { error: err.response?.data?.message || 'Recruiter test unavailable' },
            }));
        }
    };

    const submitWorkTest = async (appId) => {
        const test = workTests[appId];
        const answersMap = answersByApp[appId] || {};
        const answers = (test?.questions || []).map((q) => ({
            questionId: q.questionId,
            answer: answersMap[q.questionId] || '',
        }));

        if (answers.some((a) => !a.answer)) {
            setError('Please answer all test questions before submitting.');
            return;
        }

        try {
            const { data } = await api.post(`/candidate/applications/${appId}/work-test/submit`, { answers });
            await loadWorkTest(appId);
            setApplications((prev) =>
                prev.map((a) => (a._id === appId ? { ...a, status: data.status } : a))
            );
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit recruiter test');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <main className="max-w-6xl mx-auto py-12 px-4">
                <h1 className="text-4xl font-bold mb-8 flex items-center gap-4">
                    <FileText className="w-8 h-8 text-blue-400" /> My Applications
                </h1>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2].map((i) => <div key={i} className="h-24 bg-slate-900 animate-pulse rounded-2xl"></div>)}
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-4 rounded-xl">{error}</div>
                ) : applications.length === 0 ? (
                    <div className="text-center py-24 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
                        <p className="text-slate-500 mb-6">You haven't applied to any jobs yet.</p>
                        <Link to="/jobs" className="bg-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20">
                            Browse Jobs
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {applications.map((app) => (
                            <div key={app._id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4 hover:border-slate-700 transition-all">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold mb-1">{app.jobId?.title}</h3>
                                        <div className="flex items-center gap-3 text-sm text-slate-500">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> applied on {new Date(app.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(app.status)}`}>
                                            {app.status}
                                        </div>
                                        <Link to={`/jobs/${app.jobId?._id}`} className="text-slate-500 hover:text-white p-2">
                                            <ChevronRight className="w-5 h-5" />
                                        </Link>
                                    </div>
                                </div>

                                {app.status === 'applied' && (
                                    <div className="border-t border-slate-800 pt-4">
                                        <button
                                            onClick={() => loadWorkTest(app._id)}
                                            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-semibold"
                                        >
                                            Load Recruiter Qualification Test
                                        </button>
                                        {workTests[app._id]?.error && (
                                            <p className="text-xs text-slate-500 mt-2">{workTests[app._id].error}</p>
                                        )}
                                        {workTests[app._id]?.questions?.length > 0 && (
                                            <div className="mt-3 bg-slate-800/40 border border-slate-700 rounded-xl p-3 space-y-3">
                                                <p className="text-xs text-slate-500">
                                                    Pass score: {workTests[app._id].passScore}% | Status: {workTests[app._id].reviewStatus}
                                                </p>
                                                {workTests[app._id].questions.map((q, idx) => (
                                                    <div key={q.questionId} className="space-y-1">
                                                        <p className="text-sm text-slate-300">{idx + 1}. {q.question}</p>
                                                        {(q.options || []).map((opt) => (
                                                            <label key={opt} className="flex items-center gap-2 text-xs text-slate-400">
                                                                <input
                                                                    type="radio"
                                                                    name={`${app._id}:${q.questionId}`}
                                                                    value={opt}
                                                                    checked={(answersByApp[app._id]?.[q.questionId] || '') === opt}
                                                                    onChange={(e) =>
                                                                        setAnswersByApp((prev) => ({
                                                                            ...prev,
                                                                            [app._id]: {
                                                                                ...(prev[app._id] || {}),
                                                                                [q.questionId]: e.target.value,
                                                                            },
                                                                        }))
                                                                    }
                                                                />
                                                                {opt}
                                                            </label>
                                                        ))}
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => submitWorkTest(app._id)}
                                                    className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg font-semibold"
                                                >
                                                    Submit Recruiter Test
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Applications;
