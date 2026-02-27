import { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { Briefcase, MapPin, DollarSign, Search, Filter, Sparkles, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

const JobsList = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const isCandidate =
                    localStorage.getItem('userRole') === 'candidate' &&
                    Boolean(localStorage.getItem('token'));
                const { data } = await api.get(isCandidate ? '/candidate/jobs/suitable' : '/jobs');
                setJobs(data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load jobs');
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.requiredSkills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            <Navbar />
            <main className="max-w-7xl mx-auto py-12 px-4 relative">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="flex flex-col space-y-8 mb-12 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Vetted Opportunities</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tight">Discover Your <span className="gradient-text">Next Role</span></h1>
                        <p className="text-slate-500 font-medium text-lg mt-2">Find bias-free job opportunities from ethical companies.</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by job title, description, or specific skill set..."
                                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium placeholder:text-slate-600"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="btn-secondary h-14 flex items-center gap-2 px-6 bg-slate-900 border-slate-800 hover:border-slate-700">
                            <SlidersHorizontal className="w-5 h-5" />
                            <span>Filters</span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-64 glass-premium animate-pulse rounded-[2.5rem] border-white/5"></div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-8 rounded-[2.5rem] text-center max-w-2xl mx-auto shadow-2xl">
                        <p className="font-bold text-lg mb-2">Sync Error</p>
                        <p className="text-slate-400 mb-6">{error}</p>
                        <button onClick={() => window.location.reload()} className="btn-secondary border-red-500/20 bg-slate-900 text-red-300">Retry Fetch</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                        {filteredJobs.length > 0 ? (
                            filteredJobs.map(job => {
                                const isStrongFit = typeof job.matchScore === 'number' ? job.matchScore >= 60 : true;
                                return (
                                <div
                                    key={job._id}
                                    title={!isStrongFit ? 'You are not perfect fit for this role.' : ''}
                                    className={`glass-premium rounded-[2.5rem] p-8 flex flex-col justify-between group transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden border ${
                                        isStrongFit
                                            ? 'border-emerald-500/20 hover:border-emerald-500/40'
                                            : 'border-red-500/25 hover:border-red-500/45'
                                    }`}
                                >
                                    <div className="absolute top-0 right-0 p-8 text-blue-500/5 group-hover:text-blue-500/10 transition-colors">
                                        <Briefcase className="w-24 h-24" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="mb-6">
                                            <h3 className="text-2xl font-black mb-2 group-hover:text-blue-400 transition-colors leading-tight">{job.title}</h3>
                                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">{job.recruiterId?.name || 'Vetted Company'}</p>
                                            {typeof job.matchScore === 'number' && (
                                                <p className={`mt-2 text-xs font-extrabold uppercase tracking-[0.2em] ${isStrongFit ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {job.matchScore}% skill match
                                                </p>
                                            )}
                                        </div>

                                        <p className="text-slate-400 text-sm mb-6 line-clamp-3 font-medium leading-relaxed">
                                            {job.description}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mb-8">
                                            {job.requiredSkills.slice(0, 4).map(skill => (
                                                <span key={skill} className="text-[10px] uppercase tracking-wider font-extrabold bg-slate-950/50 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400 group-hover:border-blue-500/20 group-hover:text-blue-400 transition-all">
                                                    {skill}
                                                </span>
                                            ))}
                                            {job.requiredSkills.length > 4 && (
                                                <span className="text-[10px] font-extrabold text-slate-600 self-center">+{job.requiredSkills.length - 4} more</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="relative z-10 pt-6 border-t border-white/5 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {job.location || 'Remote'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-emerald-500/70 text-xs font-bold uppercase tracking-wide">
                                                <DollarSign className="w-3.5 h-3.5" />
                                                {job.salaryRange || 'Vetted Salary'}
                                            </div>
                                        </div>
                                        {isStrongFit ? (
                                            <Link
                                                to={`/jobs/${job._id}`}
                                                className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 transition-all duration-300 group-hover:bg-emerald-600 group-hover:border-emerald-500"
                                            >
                                                <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
                                            </Link>
                                        ) : (
                                            <button
                                                disabled
                                                title="You are not perfect fit for this role."
                                                className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-red-500/25 opacity-60 cursor-not-allowed"
                                            >
                                                <ChevronRight className="w-6 h-6 text-red-400/70" />
                                            </button>
                                        )}
                                    </div>
                                    {!isStrongFit && (
                                        <div className="absolute bottom-5 left-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-red-300 font-semibold">
                                            You are not perfect fit for this role.
                                        </div>
                                    )}
                                </div>
                            )})
                        ) : (
                            <div className="col-span-full py-32 text-center glass-premium rounded-[3rem] border-dashed border-2 border-slate-800">
                                <Search className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                                <h3 className="text-2xl font-bold text-slate-400 mb-2">No matching roles found</h3>
                                <p className="text-slate-600 font-medium">Try adjusting your search terms or filters.</p>
                                <button onClick={() => setSearchTerm('')} className="mt-8 text-blue-500 font-bold hover:underline">Clear Search</button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default JobsList;
