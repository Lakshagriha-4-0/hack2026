import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserCircle, Briefcase, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { preloadCandidateRoutes, preloadRecruiterRoutes, preloadRoute } from '../utils/preloadRoutes';

const FeatureCard = ({ icon: Icon, title, description, colorClass }) => (
    <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors">
        <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <h3 className="font-semibold text-slate-100">{title}</h3>
            <p className="text-sm text-slate-400">{description}</p>
        </div>
    </div>
);

const Landing = () => {
    const navigate = useNavigate();
    const { setRole } = useAuth();

    const handleRoleSelect = (selectedRole) => {
        preloadRoute('login');
        if (selectedRole === 'candidate') preloadCandidateRoutes();
        if (selectedRole === 'recruiter') preloadRecruiterRoutes();
        setRole(selectedRole);
        localStorage.setItem('userRole', selectedRole);
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30 overflow-hidden relative">
            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            <main className="max-w-7xl mx-auto px-4 pt-20 pb-32 relative z-10">
                <div className="text-center space-y-6 mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium animate-float">
                        <Sparkles className="w-4 h-4" />
                        <span>The Future of Ethical Hiring</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight">
                        Hire on <span className="gradient-text">Merit</span>,<br />
                        Not on <span className="text-slate-500">Identity</span>.
                    </h1>

                    <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        EqualPath bridges the gap with AI-powered anonymous vetting.
                        We help companies find the best skills while ensuring a bias-free application process.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Candidate Side */}
                    <div className="glass-premium rounded-[2.5rem] p-8 md:p-10 flex flex-col items-center group cursor-pointer hover:border-blue-500/30 transition-all duration-500"
                        onMouseEnter={preloadCandidateRoutes}
                        onClick={() => handleRoleSelect('candidate')}>
                        <div className="w-20 h-20 rounded-3xl bg-blue-600/20 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-600/30 transition-all duration-500 shadow-xl shadow-blue-500/10">
                            <UserCircle className="w-10 h-10 text-blue-400" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">I'm a Candidate</h2>
                        <p className="text-slate-400 text-center mb-10 leading-relaxed">
                            Upload your resume, let our Gemini AI anonymize your profile, and compete solely on your brilliance.
                        </p>

                        <div className="w-full space-y-4 pt-6 border-t border-white/5">
                            <FeatureCard
                                icon={ShieldCheck}
                                title="Identity Protection"
                                description="Your personal details stay hidden until the interview stage."
                                colorClass="bg-blue-500/10 text-blue-400"
                            />
                            <FeatureCard
                                icon={Zap}
                                title="AI Auto-Fill"
                                description="Instantly sync your profile with our Gemini-powered parser."
                                colorClass="bg-amber-500/10 text-amber-400"
                            />
                        </div>

                        <button className="mt-10 btn-primary w-full shadow-blue-600/20">
                            Get Started as Candidate
                        </button>
                    </div>

                    {/* Recruiter Side */}
                    <div className="glass-premium rounded-[2.5rem] p-8 md:p-10 flex flex-col items-center group cursor-pointer hover:border-emerald-500/30 transition-all duration-500"
                        onMouseEnter={preloadRecruiterRoutes}
                        onClick={() => handleRoleSelect('recruiter')}>
                        <div className="w-20 h-20 rounded-3xl bg-emerald-600/20 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-emerald-600/30 transition-all duration-500 shadow-xl shadow-emerald-500/10">
                            <Briefcase className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">I'm a Recruiter</h2>
                        <p className="text-slate-400 text-center mb-10 leading-relaxed">
                            Stop scrolling profiles and start seeing skills. Our platform ensures your hiring funnel is meritocratic.
                        </p>

                        <div className="w-full space-y-4 pt-6 border-t border-white/5">
                            <FeatureCard
                                icon={Sparkles}
                                title="Merit-Based Vetting"
                                description="Filter candidates by skill scores and anonymous project portfolios."
                                colorClass="bg-emerald-500/10 text-emerald-400"
                            />
                            <FeatureCard
                                icon={ShieldCheck}
                                title="DEI Compliance"
                                description="Automatically remove unconscious bias from your hiring pipeline."
                                colorClass="bg-purple-500/10 text-purple-400"
                            />
                        </div>

                        <button className="mt-10 btn-primary bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20">
                            Get Started as Recruiter
                        </button>
                    </div>
                </div>

                <footer className="mt-32 text-center text-slate-500 text-sm">
                    <p>© 2026 EqualPath. Built for a Fairer Tomorrow.</p>
                </footer>
            </main>
        </div>
    );
};

export default Landing;
