import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { BadgeCheck, Shield, User, Mail, Phone, MapPin } from 'lucide-react';

const JobApplications = () => {
    const { jobId } = useParams();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revealedIds, setRevealedIds] = useState({});
    const [job, setJob] = useState(null);

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

    const revealIdentity = async (appId) => {
        try {
            const { data } = await api.get(`/recruiter/applications/${appId}/reveal`);
            setRevealedIds((prev) => ({ ...prev, [appId]: data.privateProfile }));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reveal identity');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <main className="max-w-6xl mx-auto py-12 px-4">
                <div className="mb-12">
                    <Link to="/recruiter" className="text-slate-500 hover:text-white mb-4 inline-block">Back to Postings</Link>
                    <h1 className="text-4xl font-bold">Applications for {job?.title}</h1>
                    <p className="text-slate-500 mt-2">Selection is automatic based on recruiter test result.</p>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        {[1, 2].map((i) => <div key={i} className="h-64 bg-slate-900 animate-pulse rounded-3xl"></div>)}
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-4 rounded-xl">{error}</div>
                ) : applications.length === 0 ? (
                    <div className="text-center py-24 text-slate-500">No applications received yet.</div>
                ) : (
                    <div className="space-y-6">
                        {applications.map((app) => (
                            <div key={app._id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                                <div className="p-8">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-800 pb-6 mb-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-2xl font-bold">{app.anonymousId}</h3>
                                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">
                                                    {app.matchScore}% Skill Match
                                                </span>
                                            </div>
                                            <p className="text-slate-500 font-medium">Applied {new Date(app.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold uppercase ${app.status === 'shortlisted' ? 'text-emerald-400' : app.status === 'rejected' ? 'text-red-400' : 'text-blue-400'}`}>
                                                {app.status}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Recruiter Test: {app.recruiterRoundTest?.status || 'pending'} ({app.recruiterRoundTest?.score || 0}%)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="md:col-span-2 space-y-6">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Skill Match Analysis</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {(app.matchedSkills || []).map((s) => (
                                                        <span key={s} className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1 rounded-lg flex items-center gap-1">
                                                            <BadgeCheck className="w-3 h-3" /> {s}
                                                        </span>
                                                    ))}
                                                    {(app.missingSkills || []).map((s) => (
                                                        <span key={s} className="bg-slate-800 text-slate-500 text-xs px-3 py-1 rounded-lg">{s} (missing)</span>
                                                    ))}
                                                </div>
                                            </div>

                                            {app.displayProfile?.resumeAnonymizedText && (
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Bias-Free Resume</h4>
                                                    <pre className="whitespace-pre-wrap text-sm text-slate-300 bg-slate-800/50 border border-slate-800 rounded-2xl p-4 max-h-[360px] overflow-auto leading-relaxed font-sans">
                                                        {app.displayProfile.resumeAnonymizedText}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Identity Info</h4>
                                            {revealedIds[app._id] ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <User className="w-5 h-5 text-blue-400" />
                                                        <span className="font-bold text-lg">{revealedIds[app._id].fullName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-slate-400">
                                                        <Mail className="w-4 h-4" />
                                                        <span className="text-sm">{revealedIds[app._id].email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-slate-400">
                                                        <Phone className="w-4 h-4" />
                                                        <span className="text-sm">{revealedIds[app._id].phone}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-slate-400">
                                                        <MapPin className="w-4 h-4" />
                                                        <span className="text-sm">{revealedIds[app._id].college}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                                    <p className="text-slate-600 text-sm">Identity is hidden.</p>
                                                    {app.status === 'shortlisted' ? (
                                                        <button onClick={() => revealIdentity(app._id)} className="mt-3 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-bold">
                                                            Reveal Shortlisted Candidate
                                                        </button>
                                                    ) : (
                                                        <p className="text-xs text-slate-700 mt-2">Visible only for shortlisted.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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
