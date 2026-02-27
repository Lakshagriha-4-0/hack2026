import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Briefcase, FileText, LayoutDashboard, ChevronDown, TrendingUp, LogOut } from 'lucide-react';
import { preloadRoute } from '../utils/preloadRoutes';

const Navbar = () => {
    const { logout, role, user } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    const handleLogout = () => {
        logout();
        setOpen(false);
        navigate('/');
    };

    useEffect(() => {
        const onClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    return (
        <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
            <Link to="/" className="text-2xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent tracking-tighter hover:opacity-80 transition-opacity">
                EqualPath
            </Link>

            <div className="flex items-center gap-8">
                {/* Navigation Links - Right Aligned as requested */}
                <div className="hidden md:flex items-center gap-6 border-r border-slate-800 pr-8 mr-2 transition-all">
                    {role === 'candidate' && (
                        <>
                            <Link
                                to="/candidate"
                                className="text-slate-400 hover:text-blue-400 text-sm font-bold flex items-center gap-2 transition-colors uppercase tracking-widest text-[11px]"
                                onMouseEnter={() => preloadRoute('candidateDashboard')}
                            >
                                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                            </Link>
                            <Link
                                to="/jobs"
                                className="text-slate-400 hover:text-blue-400 text-sm font-bold flex items-center gap-2 transition-colors uppercase tracking-widest text-[11px]"
                                onMouseEnter={() => preloadRoute('jobs')}
                            >
                                <Briefcase className="w-3.5 h-3.5" /> Jobs
                            </Link>
                            <Link
                                to="/candidate/applications"
                                className="text-slate-400 hover:text-blue-400 text-sm font-bold flex items-center gap-2 transition-colors uppercase tracking-widest text-[11px]"
                                onMouseEnter={() => preloadRoute('applications')}
                            >
                                <FileText className="w-3.5 h-3.5" /> Track
                            </Link>
                            <Link
                                to="/performance"
                                className="text-slate-400 hover:text-emerald-400 text-sm font-bold flex items-center gap-2 transition-colors uppercase tracking-widest text-[11px]"
                                onMouseEnter={() => preloadRoute('performance')}
                            >
                                <TrendingUp className="w-3.5 h-3.5" /> Performance
                            </Link>
                        </>
                    )}
                    {role === 'recruiter' && (
                        <Link
                            to="/recruiter"
                            className="text-slate-400 hover:text-blue-400 text-sm font-bold transition-colors uppercase tracking-widest text-[11px]"
                            onMouseEnter={() => preloadRoute('recruiterDashboard')}
                        >
                            Dashboard
                        </Link>
                    )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setOpen((prev) => !prev)}
                        className="flex items-center gap-3 p-1 pr-3 rounded-2xl hover:bg-white/5 transition-all group"
                    >
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-105 transition-transform">
                            {user?.name?.charAt(0) || <User className="w-5 h-5" />}
                        </div>
                        <span className="hidden sm:block text-slate-300 font-bold text-sm tracking-tight">{user?.name || 'Account'}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                    </button>

                    {open && (
                        <div className="absolute right-0 mt-3 w-56 glass-premium border-white/5 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="px-4 py-3 bg-white/5 border-b border-white/5">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-0.5">Signed in as</p>
                                <p className="text-sm font-bold text-slate-200 truncate">{user?.email}</p>
                            </div>

                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        navigate(role === 'candidate' ? '/candidate/profile' : '/recruiter');
                                        setOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-300 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                                >
                                    <User className="w-4 h-4" /> My Profile
                                </button>

                                {role === 'candidate' && (
                                    <button
                                        onClick={() => {
                                            navigate('/performance');
                                            setOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                                    >
                                        <TrendingUp className="w-4 h-4" /> Performance
                                    </button>
                                )}

                                <div className="h-px bg-white/5 my-1 mx-2" />

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                    <LogOut className="w-4 h-4" /> Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
