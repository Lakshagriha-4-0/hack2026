import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { Briefcase, MapPin, DollarSign, ArrowLeft, CheckCircle, Clock, ShieldCheck, Sparkles, Building2 } from 'lucide-react';

const JobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applied, setApplied] = useState(false);
    const [error, setError] = useState('');
    const [applying, setApplying] = useState(false);
    const [eligibility, setEligibility] = useState(null);
    const [eligibilityAnswers, setEligibilityAnswers] = useState({});
    const [eligibilityLoading, setEligibilityLoading] = useState(false);
    const [eligibilityMessage, setEligibilityMessage] = useState('');

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const { data } = await api.get(`/jobs/${id}`);
                setJob(data);
                // Check if already applied only when user token exists.
                if (localStorage.getItem('token')) {
                    try {
                        const { data: apps } = await api.get('/candidate/applications');
                        if (apps.some(a => a.jobId?._id === id || a.jobId === id)) {
                            setApplied(true);
                        }
                    } catch (_ignored) {
                        // Ignore background application check failures.
                    }

                    if (localStorage.getItem('userRole') === 'candidate') {
                        try {
                            const { data: eligibilityData } = await api.get(`/candidate/eligibility/${id}`);
                            setEligibility(eligibilityData);
                        } catch (_ignored) {
                            // test not started yet
                        }
                    }
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load job');
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [id]);

    const startEligibility = async () => {
        setEligibilityLoading(true);
        setEligibilityMessage('');
        try {
            const { data } = await api.post(`/candidate/eligibility/${id}/start`);
            setEligibility(data);
            setEligibilityAnswers({});
        } catch (err) {
            setEligibilityMessage(err.response?.data?.message || 'Failed to start eligibility test');
        } finally {
            setEligibilityLoading(false);
        }
    };

    const submitEligibility = async () => {
        if (!eligibility?.questions?.length) return;
        const answers = eligibility.questions.map((q) => ({
            questionId: q.questionId,
            answer: eligibilityAnswers[q.questionId] || '',
        }));
        if (answers.some((a) => !a.answer)) {
            setEligibilityMessage('Please answer all questions before submitting.');
            return;
        }

        setEligibilityLoading(true);
        setEligibilityMessage('');
        try {
            const { data } = await api.post(`/candidate/eligibility/${id}/submit`, { answers });
            setEligibility((prev) => ({
                ...prev,
                status: data.status,
                score: data.score,
                passScore: data.passScore,
                questions: undefined,
                submittedAt: new Date().toISOString(),
            }));
            setEligibilityMessage(data.message);
        } catch (err) {
            setEligibilityMessage(err.response?.data?.message || 'Failed to submit eligibility test');
        } finally {
            setEligibilityLoading(false);
        }
    };

    const handleApply = async () => {
        setApplying(true);
        setError('');
        try {
            await api.post(`/candidate/apply/${id}`);
            setApplied(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Application failed');
        } finally {
            setApplying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="animate-pulse">Loading job specifications...</p>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2rem] text-center max-w-md">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">Notice</h2>
                    <p className>{error || 'This opportunity is no longer available.'}</p>
                    <button onClick={() => navigate('/jobs')} className="mt-6 btn-secondary bg-slate-900 border-red-500/20">Back to List</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            <Navbar />

            <main className="max-w-5xl mx-auto py-12 px-4 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

                <button
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-2 text-slate-500 hover:text-white mb-10 transition-all font-medium"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Back to Opportunities
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="glass-premium p-8 md:p-10 rounded-[2.5rem] border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 text-blue-500/10 pointer-events-none">
                                <Building2 className="w-32 h-32" />
                            </div>

                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Verified Opportunity</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 leading-tight">{job.title}</h1>

                                <div className="flex flex-wrap gap-6 text-slate-400 font-semibold mb-8">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-slate-800 rounded-lg"><MapPin className="w-4 h-4 text-blue-400" /></div>
                                        {job.location || 'Remote'}
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-slate-800 rounded-lg"><DollarSign className="w-4 h-4 text-emerald-400" /></div>
                                        {job.salaryRange || 'Competitive'}
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-slate-800 rounded-lg"><Clock className="w-4 h-4 text-purple-400" /></div>
                                        {job.experienceLevel || 'All Levels'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-premium p-8 md:p-10 rounded-[2.5rem] border-white/5">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <div className="w-2 h-8 bg-blue-600 rounded-full" />
                                Role Specification
                            </h2>
                            <p className="text-slate-400 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                                {job.description}
                            </p>
                        </div>

                        <div className="glass-premium p-8 md:p-10 rounded-[2.5rem] border-white/5">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <div className="w-2 h-8 bg-emerald-600 rounded-full" />
                                Required Vetted Skills
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                {job.requiredSkills.map(skill => (
                                    <span key={skill} className="bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-blue-400 hover:border-blue-500/50 px-6 py-3 rounded-2xl text-sm font-bold transition-all cursor-default">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Actions */}
                    <div className="space-y-6">
                        <div className="glass-premium p-8 rounded-[2.5rem] border-white/5 sticky top-8">
                            <div className="text-center mb-10">
                                <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/10">
                                    <ShieldCheck className="w-10 h-10 text-blue-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Anonymous Vetting</h3>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                    Your personal data is protected. Recruiters will only see your skills and project scores.
                                </p>
                            </div>

                            {!applied ? (
                                <>
                                    {localStorage.getItem('token') && localStorage.getItem('userRole') === 'candidate' ? (
                                        <div className="space-y-4">
                                            {eligibility?.status === 'passed' ? (
                                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-sm text-emerald-300">
                                                    Eligibility test passed ({eligibility.score}%).
                                                </div>
                                            ) : eligibility?.status === 'failed' ? (
                                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-300">
                                                    Eligibility test failed ({eligibility.score}% / {eligibility.passScore}%).
                                                </div>
                                            ) : null}

                                            {eligibility?.questions?.length ? (
                                                <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-4 max-h-[340px] overflow-auto">
                                                    {eligibility.questions.map((q, idx) => (
                                                        <div key={q.questionId} className="space-y-2">
                                                            <p className="text-sm font-semibold text-slate-300">{idx + 1}. {q.question}</p>
                                                            <div className="space-y-1">
                                                                {q.options.map((opt) => (
                                                                    <label key={opt} className="flex items-center gap-2 text-xs text-slate-400">
                                                                        <input
                                                                            type="radio"
                                                                            name={q.questionId}
                                                                            value={opt}
                                                                            checked={eligibilityAnswers[q.questionId] === opt}
                                                                            onChange={(e) =>
                                                                                setEligibilityAnswers((prev) => ({ ...prev, [q.questionId]: e.target.value }))
                                                                            }
                                                                        />
                                                                        {opt}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={submitEligibility}
                                                        disabled={eligibilityLoading}
                                                        className="w-full btn-secondary h-12 border-blue-500/30 hover:border-blue-500/50"
                                                    >
                                                        {eligibilityLoading ? 'Submitting Test...' : 'Submit Eligibility Test'}
                                                    </button>
                                                </div>
                                            ) : eligibility?.status !== 'passed' ? (
                                                <button
                                                    onClick={startEligibility}
                                                    disabled={eligibilityLoading}
                                                    className="w-full btn-secondary h-12 border-blue-500/30 hover:border-blue-500/50"
                                                >
                                                    {eligibilityLoading ? 'Generating Test...' : 'Start AI Eligibility Test'}
                                                </button>
                                            ) : null}

                                            <button
                                                onClick={handleApply}
                                                disabled={applying || eligibility?.status !== 'passed'}
                                                className="w-full btn-primary h-16 text-lg tracking-tight font-black shadow-[0_10px_30px_rgba(37,99,235,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                {applying ? 'Applying...' : 'Apply Anonymously'}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleApply}
                                            disabled={applying}
                                            className="w-full btn-primary h-16 text-lg tracking-tight font-black shadow-[0_10px_30px_rgba(37,99,235,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {applying ? 'Applying...' : 'Apply Anonymously'}
                                        </button>
                                    )}
                                    {eligibilityMessage && (
                                        <div className="mt-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl p-3 text-xs">
                                            {eligibilityMessage}
                                        </div>
                                    )}
                                    {error && (
                                        <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl p-4 text-sm">
                                            {error}
                                            {error.toLowerCase().includes('skills') || error.toLowerCase().includes('profile') ? (
                                                <div className="mt-3">
                                                    <Link to="/candidate/profile/edit" className="text-blue-300 hover:text-blue-200 underline">
                                                        Complete profile to apply
                                                    </Link>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="w-full flex flex-col items-center gap-4 py-8 px-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem]">
                                    <div className="p-4 bg-emerald-500/20 rounded-full animate-bounce">
                                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-emerald-400 font-extrabold text-2xl mb-2 tracking-tight">Application Sent!</p>
                                        <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                            Your skill profile has been successfully shared with the recruiter. They'll review your vetted skills shortly.
                                        </p>
                                    </div>
                                    <Link to="/candidate/applications" className="w-full btn-secondary h-12 flex items-center justify-center gap-2 border-emerald-500/30 hover:border-emerald-500/50 transition-all font-bold">
                                        Track Application Status
                                    </Link>
                                </div>
                            )}

                            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Posted On</span>
                                    <span className="text-slate-300 font-bold">{new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Status</span>
                                    <span className="text-emerald-500/80 font-bold flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        Active
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default JobDetails;
