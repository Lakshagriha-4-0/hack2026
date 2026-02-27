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
    const [createError, setCreateError] = useState('');
    const [newJob, setNewJob] = useState({
        title: '',
        description: '',
        requiredSkills: '',
        location: '',
        salaryRange: '',
    });

    useEffect(() => {
        fetchMyJobs();
    }, []);

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
            const skillsArray = newJob.requiredSkills.split(',').map(s => s.trim()).filter(s => s);
            await api.post('/jobs', { ...newJob, requiredSkills: skillsArray });
            setShowCreate(false);
            setNewJob({ title: '', description: '', requiredSkills: '', location: '', salaryRange: '' });
            fetchMyJobs();
        } catch (err) {
            setCreateError(err.response?.data?.message || 'Failed to create job');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <main className="max-w-6xl mx-auto py-12 px-4">
                <div className="flex justify-between items-center mb-12">
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
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                        <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-8 shadow-2xl">
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
                                <div className="flex gap-4 pt-4">
                                    <button type="submit" className="flex-1 bg-emerald-600 py-3 rounded-xl font-bold hover:bg-emerald-500">Create Posting</button>
                                    <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-3 border border-slate-700 rounded-xl hover:bg-slate-800">Cancel</button>
                                </div>
                            </form>
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
