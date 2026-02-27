import { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { ShieldCheck, Loader2, Sparkles, TrendingUp, BadgeCheck, FileText } from 'lucide-react';

const Performance = () => {
    const [publicData, setPublicData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ applied: 0, shortlisted: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [meRes, appRes] = await Promise.all([
                    api.get('/auth/me'),
                    api.get('/candidate/applications')
                ]);

                if (meRes.data.candidateProfile) {
                    setPublicData(meRes.data.candidateProfile.public);
                }

                setStats({
                    applied: appRes.data.length,
                    shortlisted: appRes.data.filter(a => a.status === 'shortlisted').length
                });
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
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            <Navbar />
            <main className="max-w-6xl mx-auto py-12 px-4 relative">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

                <header className="mb-12 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Profile Performance</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tight mb-4">
                        Your <span className="gradient-text">Bias-Free Identity</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium max-w-2xl leading-relaxed">
                        This is how your technical persona performs in the ethical hiring market.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 relative z-10">
                    <div className="glass-premium p-8 rounded-[2.5rem] border-white/5">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                                <BadgeCheck className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Vetting Score</h3>
                                <p className="text-slate-500 text-sm">Based on your verified skills</p>
                            </div>
                        </div>
                        <div className="flex items-end gap-3 mb-6">
                            <span className="text-6xl font-black tracking-tighter">
                                {stats.applied > 0 ? Math.round((stats.shortlisted / stats.applied) * 100) : 0}%
                            </span>
                            <span className="text-emerald-500 font-bold mb-2 uppercase text-xs tracking-widest">Success Rate</span>
                        </div>
                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000"
                                style={{ width: `${stats.applied > 0 ? (stats.shortlisted / stats.applied) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    <div className="glass-premium p-8 rounded-[2.5rem] border-white/5 flex flex-col justify-center">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mb-1">Total Impact</p>
                                <p className="text-3xl font-black">{stats.applied}</p>
                                <p className="text-xs text-slate-500 mt-1 italic">Applications</p>
                            </div>
                            <div>
                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mb-1">Market Match</p>
                                <p className="text-3xl font-black text-emerald-400">{stats.shortlisted}</p>
                                <p className="text-xs text-slate-500 mt-1 italic">Shortlists</p>
                            </div>
                        </div>
                    </div>
                </div>

                <section className="relative z-10">
                    <div className="glass-premium p-8 md:p-12 rounded-[3rem] border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 text-blue-500/5">
                            <ShieldCheck className="w-48 h-48" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
                                    <FileText className="w-7 h-7 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">Anonymized Technical Persona</h2>
                                    <p className="text-slate-500 font-medium">This is exactly what the recruiters see.</p>
                                </div>
                            </div>

                            {publicData?.resumeAnonymized?.text ? (
                                <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/50 rounded-[2rem] p-8 md:p-10 font-mono text-sm text-slate-400 leading-relaxed max-h-[600px] overflow-auto shadow-inner custom-scrollbar">
                                    <div className="flex items-center gap-2 mb-6 text-emerald-500/60 font-bold uppercase tracking-[0.3em] text-[10px]">
                                        <Sparkles className="w-3 h-3" />
                                        <span>Verified AI Anonymization</span>
                                    </div>
                                    <pre className="whitespace-pre-wrap font-sans text-lg text-slate-300">
                                        {publicData.resumeAnonymized.text}
                                    </pre>
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[2rem]">
                                    <p className="text-slate-500 font-medium">Please upload your resume in settings to generate your technical persona.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Performance;
