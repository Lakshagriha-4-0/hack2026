import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { BadgeCheck, Shield, User, Mail, Phone, ChevronRight } from 'lucide-react';

const JobApplications = () => {
    const { jobId, appId } = useParams();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revealedIds, setRevealedIds] = useState({});
    const [job, setJob] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [appRes, jobRes] = await Promise.all([
                    api.get(`/recruiter/jobs/${jobId}/applications`),
                    api.get(`/jobs/${jobId}`),
                ]);
                setApplications(appRes.data);
                setJob(jobRes.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load job applications');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [jobId]);

    const selectedApplication = appId
        ? applications.find((app) => String(app._id) === String(appId))
        : null;
    const interviewInviteSent = Boolean(selectedApplication?.interviewInvite?.sentAt);

    const revealIdentity = async (appId) => {
        try {
            const { data } = await api.get(`/recruiter/applications/${appId}/reveal`);
            setRevealedIds((prev) => ({ ...prev, [appId]: data.privateProfile }));
            setActionMessage('');
        } catch (err) {
            setActionMessage(err.response?.data?.message || 'Failed to reveal identity');
        }
    };

    const shortlistForInterview = async (targetAppId) => {
        try {
            setActionLoading(true);
            setActionMessage('');
            const { data } = await api.put(`/recruiter/applications/${targetAppId}/shortlist`);
            setApplications((prev) =>
                prev.map((app) =>
                    app._id === targetAppId
                        ? {
                            ...app,
                            status: data?.application?.status || 'shortlisted',
                            interviewInvite: data?.application?.interviewInvite || app.interviewInvite,
                        }
                        : app
                )
            );
            setActionMessage(data?.message || 'Candidate shortlisted for interview.');
        } catch (err) {
            setActionMessage(err.response?.data?.message || 'Failed to shortlist candidate');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <main className="max-w-6xl mx-auto py-12 px-4">
                <div className="mb-12">
                    <Link to="/recruiter" className="text-slate-500 hover:text-white mb-4 inline-block">Back to Postings</Link>
                    <h1 className="text-4xl font-bold">Applications for {job?.title}</h1>
                    <p className="text-slate-500 mt-2">Review anonymized profiles, then shortlist for interview and reveal identity.</p>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        {[1, 2].map((i) => <div key={i} className="h-64 bg-slate-900 animate-pulse rounded-3xl"></div>)}
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-4 rounded-xl">{error}</div>
                ) : applications.length === 0 ? (
                    <div className="text-center py-24 text-slate-500">No applications received yet.</div>
                ) : appId && !selectedApplication ? (
                    <div className="bg-red-500/10 border border-red-500/40 text-red-300 p-6 rounded-2xl">
                        Application not found for this job.
                    </div>
                ) : appId ? (
                    <div className="space-y-6">
                        <Link
                            to={`/recruiter/jobs/${jobId}/applications`}
                            className="inline-flex items-center text-slate-400 hover:text-white text-sm"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
                            Back to all applications
                        </Link>

                        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                            <div className="p-8">
                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-slate-800 pb-6 mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-2xl font-bold">{selectedApplication.anonymousId}</h3>
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                                                selectedApplication.status === 'shortlisted'
                                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                                    : selectedApplication.status === 'rejected'
                                                        ? 'bg-red-500/10 text-red-300 border-red-500/30'
                                                        : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                            }`}>
                                                {selectedApplication.status}
                                            </span>
                                        </div>
                                        <p className="text-slate-500">Applied {new Date(selectedApplication.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-sm min-w-[340px]">
                                        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                                            <p className="text-slate-500 text-xs uppercase">Skill Score</p>
                                            <p className="text-xl font-bold text-emerald-300">{selectedApplication.matchScore || 0}%</p>
                                        </div>
                                        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                                            <p className="text-slate-500 text-xs uppercase">Round 1</p>
                                            <p className="text-xl font-bold text-blue-300">{selectedApplication.roundResults?.firstRound?.score ?? 0}%</p>
                                            <p className="text-[10px] text-slate-500">
                                                {selectedApplication.roundResults?.firstRound?.status || 'N/A'} / {selectedApplication.roundResults?.firstRound?.passScore ?? 0}%
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                                            <p className="text-slate-500 text-xs uppercase">Round 2</p>
                                            <p className="text-xl font-bold text-indigo-300">{selectedApplication.roundResults?.secondRound?.score ?? 0}%</p>
                                            <p className="text-[10px] text-slate-500">
                                                {selectedApplication.roundResults?.secondRound?.status || 'N/A'} / {selectedApplication.roundResults?.secondRound?.passScore ?? 0}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {actionMessage && (
                                    <div className="mb-6 bg-slate-800/80 border border-slate-700 text-slate-200 p-3 rounded-xl text-sm">
                                        {actionMessage}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-3 mb-8">
                                    <button
                                        type="button"
                                        disabled={actionLoading || interviewInviteSent}
                                        onClick={() => shortlistForInterview(selectedApplication._id)}
                                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-bold"
                                    >
                                        {interviewInviteSent ? 'Shortlisted for Interview' : 'Shortlist for Interview'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!interviewInviteSent || Boolean(revealedIds[selectedApplication._id])}
                                        onClick={() => revealIdentity(selectedApplication._id)}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-bold"
                                    >
                                        {revealedIds[selectedApplication._id] ? 'Identity Revealed' : 'Reveal Identity'}
                                    </button>
                                </div>
                                {!interviewInviteSent && (
                                    <p className="text-xs text-amber-300 mb-6">
                                        Identity can be revealed only after clicking "Shortlist for Interview" (this also notifies candidate).
                                    </p>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-6">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Skill Match Analysis</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(selectedApplication.matchedSkills || []).map((s) => (
                                                    <span key={s} className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1 rounded-lg flex items-center gap-1">
                                                        <BadgeCheck className="w-3 h-3" /> {s}
                                                    </span>
                                                ))}
                                                {(selectedApplication.missingSkills || []).map((s) => (
                                                    <span key={s} className="bg-slate-800 text-slate-500 text-xs px-3 py-1 rounded-lg">{s} (missing)</span>
                                                ))}
                                            </div>
                                        </div>

                                        {selectedApplication.displayProfile?.resumeAnonymizedText && (
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Bias-Free Resume</h4>
                                                <pre className="whitespace-pre-wrap text-sm text-slate-300 bg-slate-800/50 border border-slate-800 rounded-2xl p-4 max-h-[420px] overflow-auto leading-relaxed font-sans">
                                                    {selectedApplication.displayProfile.resumeAnonymizedText}
                                                </pre>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-800">
                                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Identity</h4>
                                        {revealedIds[selectedApplication._id] ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <User className="w-5 h-5 text-blue-400" />
                                                    <span className="font-bold text-lg">{revealedIds[selectedApplication._id].fullName || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-slate-400">
                                                    <Mail className="w-4 h-4" />
                                                    <span className="text-sm">{revealedIds[selectedApplication._id].email || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-slate-400">
                                                    <Phone className="w-4 h-4" />
                                                    <span className="text-sm">{revealedIds[selectedApplication._id].phone || 'N/A'}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                                <p className="text-slate-600 text-sm">Identity hidden until shortlist + reveal.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {applications.map((app) => (
                            <div key={app._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                                <div className="flex flex-col lg:flex-row gap-6 lg:items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-3 mb-3">
                                            <h3 className="text-xl font-bold">{app.anonymousId}</h3>
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                                                app.status === 'shortlisted'
                                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                                    : app.status === 'rejected'
                                                        ? 'bg-red-500/10 text-red-300 border-red-500/30'
                                                        : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                            }`}>
                                                {app.status}
                                            </span>
                                            {app.interviewInvite?.sentAt && (
                                                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-300 text-xs font-bold rounded-lg border border-indigo-500/30">
                                                    Interview Invite Sent
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-500 text-sm mb-4">Applied {new Date(app.createdAt).toLocaleDateString()}</p>

                                        <div className="flex flex-wrap gap-2">
                                            {(app.displayProfile?.skills || app.matchedSkills || []).slice(0, 8).map((skill) => (
                                                <span key={skill} className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-lg">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="w-full lg:w-auto lg:min-w-[360px]">
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                                                <p className="text-[11px] text-slate-500 uppercase">Skill Score</p>
                                                <p className="text-xl font-bold text-emerald-300">{app.matchScore || 0}%</p>
                                            </div>
                                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                                                <p className="text-[11px] text-slate-500 uppercase">Round 1</p>
                                                <p className="text-xl font-bold text-blue-300">{app.roundResults?.firstRound?.score ?? 0}%</p>
                                                <p className="text-[10px] text-slate-500">{app.roundResults?.firstRound?.status || 'N/A'}</p>
                                            </div>
                                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                                                <p className="text-[11px] text-slate-500 uppercase">Round 2</p>
                                                <p className="text-xl font-bold text-indigo-300">{app.roundResults?.secondRound?.score ?? 0}%</p>
                                                <p className="text-[10px] text-slate-500">{app.roundResults?.secondRound?.status || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/recruiter/jobs/${jobId}/applications/${app._id}`}
                                            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2"
                                        >
                                            View More <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default JobApplications;
