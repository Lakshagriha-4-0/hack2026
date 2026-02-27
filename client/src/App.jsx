import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';
import { preloadCandidateRoutes, preloadRecruiterRoutes, preloadRoute } from './utils/preloadRoutes';

// Lazy load pages
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const CandidateDashboard = lazy(() => import('./pages/CandidateDashboard'));
const RecruiterDashboard = lazy(() => import('./pages/RecruiterDashboard'));
const JobsList = lazy(() => import('./pages/JobsList'));
const JobDetails = lazy(() => import('./pages/JobDetails'));
const Applications = lazy(() => import('./pages/Applications'));
const JobApplications = lazy(() => import('./pages/JobApplications'));
const ProfileBuilder = lazy(() => import('./pages/ProfileBuilder'));
const ProfileEditor = lazy(() => import('./pages/ProfileEditor'));
const Performance = lazy(() => import('./pages/Performance'));

const LoadingFallback = () => (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="text-sm font-medium animate-pulse">Loading EqualPath...</p>
    </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading, role } = useAuth();

    if (loading) return <LoadingFallback />;
    if (!user) return <Navigate to="/login" />;
    if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" />;

    return children;
};

function App() {
    const { role } = useAuth();

    useEffect(() => {
        const run = () => {
            preloadRoute('login');
            preloadRoute('register');
            preloadRoute('jobs');
            if (role === 'candidate') preloadCandidateRoutes();
            if (role === 'recruiter') preloadRecruiterRoutes();
        };

        let timerId;
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(run);
        } else {
            timerId = setTimeout(run, 350);
        }
        return () => {
            if (timerId) clearTimeout(timerId);
        };
    }, [role]);

    return (
        <Router>
            <div className="min-h-screen bg-slate-950">
                <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        {/* Candidate Routes */}
                        <Route path="/candidate" element={
                            <ProtectedRoute allowedRoles={['candidate']}>
                                <CandidateDashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/candidate/profile" element={
                            <ProtectedRoute allowedRoles={['candidate']}>
                                <ProfileBuilder />
                            </ProtectedRoute>
                        } />
                        <Route path="/candidate/profile/edit" element={
                            <ProtectedRoute allowedRoles={['candidate']}>
                                <ProfileEditor />
                            </ProtectedRoute>
                        } />
                        <Route path="/jobs" element={<JobsList />} />
                        <Route path="/jobs/:id" element={<JobDetails />} />
                        <Route path="/candidate/applications" element={
                            <ProtectedRoute allowedRoles={['candidate']}>
                                <Applications />
                            </ProtectedRoute>
                        } />
                        <Route path="/performance" element={
                            <ProtectedRoute allowedRoles={['candidate']}>
                                <Performance />
                            </ProtectedRoute>
                        } />

                        {/* Recruiter Routes */}
                        <Route path="/recruiter" element={
                            <ProtectedRoute allowedRoles={['recruiter']}>
                                <RecruiterDashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/recruiter/jobs/:jobId/applications" element={
                            <ProtectedRoute allowedRoles={['recruiter']}>
                                <JobApplications />
                            </ProtectedRoute>
                        } />

                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </Suspense>
            </div>
        </Router>
    );
}

export default App;
