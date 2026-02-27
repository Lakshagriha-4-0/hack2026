import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register, role: initialRole } = useAuth();
    const [selectedRole, setSelectedRole] = useState(initialRole || 'candidate');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const createdUser = await register(name, email, password, selectedRole);
            navigate(createdUser.role === 'recruiter' ? '/recruiter' : '/candidate/profile');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[120px]"></div>

            <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors group">
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Home</span>
            </Link>

            <div className="w-full max-w-md relative z-10 py-10">
                <div className="glass-premium rounded-[2rem] p-8 md:p-10 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="inline-flex p-4 bg-emerald-500/10 rounded-2xl mb-6 shadow-xl shadow-emerald-500/5">
                            <UserPlus className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h2 className="text-4xl font-bold mb-3 tracking-tight">Create Account</h2>
                        <p className="text-slate-400 font-medium tracking-wide uppercase text-xs opacity-70">
                            Join the movement for fair hiring
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl mb-8 text-sm flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-300 ml-1">Joining as</label>
                            <select
                                className="input-field w-full appearance-none"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                            >
                                <option value="candidate">Candidate (Find Jobs)</option>
                                <option value="recruiter">Recruiter (Post Jobs)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-300 ml-1">Full Name</label>
                            <input
                                type="text"
                                required
                                className="input-field w-full"
                                placeholder="Enter your full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-300 ml-1">Email Address</label>
                            <input
                                type="email"
                                required
                                className="input-field w-full"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-300 ml-1">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="input-field w-full pr-12"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary h-14 text-lg bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
                        >
                            {loading ? 'Creating Account...' : 'Get Started'}
                        </button>
                    </form>

                    <div className="mt-10 text-center space-y-4">
                        <p className="text-slate-500 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <footer className="mb-10 text-slate-600 text-xs tracking-widest uppercase">
                Privacy • Merit • Equality
            </footer>
        </div>
    );
};

export default Register;
