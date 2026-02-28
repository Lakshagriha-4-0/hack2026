import { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Briefcase, FileText, User, ChevronRight, TrendingUp, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const CandidateDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ applied: 0, shortlisted: 0 });
    const [recentJobs, setRecentJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [appRes, jobRes] = await Promise.all([
                    api.get('/candidate/applications'),
                    api.get('/candidate/jobs/suitable')
                ]);
                const appliedJobIds = new Set(
                    appRes.data.map((app) => String(app.jobId?._id || app.jobId || ''))
                );
                const recommendedJobs = jobRes.data
                    .filter((job) => !appliedJobIds.has(String(job._id)));

                setStats({
                    applied: appRes.data.length,
                    shortlisted: appRes.data.filter(a => a.status === 'shortlisted').length
                });
                setRecentJobs(recommendedJobs.slice(0, 3));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            <Navbar />
            <main className="max-w-6xl mx-auto py-12 px-4 relative animate-fade-in">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px]" />

                <header className="mb-12 relative z-10 animate-slide-up">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Candidate Console</span>
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tight mb-4">
                        Welcome back, <span className="gradient-text">{user?.name}</span>
                    </h1>
                    <p className="text-slate-400 text-xl font-medium max-w-2xl leading-relaxed">
                        Your skills are your identity. We're keeping it that way while you find your next big challenge.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 relative z-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="glass-premium p-8 rounded-[2rem] border-white/5 group hover:border-blue-500/20 transition-all duration-300">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-xl shadow-blue-500/5">
                            <FileText className="w-7 h-7 text-blue-400" />
                        </div>
                        <div className="text-5xl font-black mb-2 tracking-tight">{stats.applied}</div>
                        <div className="text-slate-500 font-bold uppercase text-xs tracking-widest">Jobs Applied</div>
                    </div>

                    <div className="glass-premium p-8 rounded-[2rem] border-white/5 group hover:border-emerald-500/20 transition-all duration-300">
                        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-xl shadow-emerald-500/5">
                            <TrendingUp className="w-7 h-7 text-emerald-400" />
                        </div>
                        <div className="text-5xl font-black mb-2 tracking-tight">{stats.shortlisted}</div>
                        <div className="text-slate-500 font-bold uppercase text-xs tracking-widest text-emerald-500/50">Shortlisted</div>
                    </div>

                    <Link to="/candidate/profile" className="relative overflow-hidden p-8 rounded-[2rem] group flex flex-col justify-between hover:shadow-[0_20px_50px_rgba(59,130,246,0.3)] transition-all duration-500 bg-gradient-to-br from-blue-600 to-indigo-700">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-x-10 -translate-y-10 blur-2xl group-hover:scale-150 transition-transform duration-700" />

                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center relative z-10">
                            <User className="w-7 h-7 text-white" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold text-white mb-2">Update Profile</h3>
                            <p className="text-blue-100/80 font-medium flex items-center gap-2 group-hover:gap-4 transition-all duration-300">
                                Refine your skills <ChevronRight className="w-5 h-5" />
                            </p>
                        </div>
                    </Link>
                </div>

                <section className="relative z-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <div className="flex justify-between items-end mb-10">
                        <div>
                            <h2 className="text-3xl font-extrabold tracking-tight mb-2">Recommended for You</h2>
                            <p className="text-slate-500 font-medium">Opportunities matching your verified skill set.</p>
                        </div>
                        <Link to="/jobs" className="btn-secondary h-12 flex items-center px-4 md:px-6">View all jobs</Link>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {recentJobs.length > 0 ? (
                            recentJobs.map(job => (
                                <Link key={job._id} to={`/jobs/${job._id}`} className="glass-premium p-6 md:p-8 rounded-[2rem] border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between hover:border-blue-500/30 hover:bg-white/5 transition-all group shadow-sm">
                                    <div className="flex items-center gap-8 mb-6 md:mb-0">
                                        <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center border border-slate-800 group-hover:bg-slate-800 transition-colors">
                                            <Briefcase className="w-8 h-8 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-2xl mb-1 group-hover:text-blue-400 transition-colors">{job.title}</h4>
                                            <div className="flex items-center gap-4 text-slate-500 font-semibold text-sm">
                                                <span className="flex items-center gap-1.5">{job.company || 'Confidential'}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                                <span>{job.location}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                                <span className="text-emerald-500/70">{job.salaryRange || 'View Details'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-auto flex justify-end">
                                        <div className="w-12 h-12 bg-slate-900 group-hover:bg-blue-600 rounded-2xl flex items-center justify-center border border-slate-800 group-hover:border-blue-500 transition-all duration-300">
                                            <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center py-20 glass-premium rounded-[2rem] border-dashed border-2 border-slate-800">
                                <p className="text-slate-500 font-medium">No recommended jobs yet. Update your profile to get matched!</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default CandidateDashboard;
