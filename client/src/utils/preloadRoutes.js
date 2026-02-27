const routePreloaders = {
    landing: () => import('../pages/Landing'),
    login: () => import('../pages/Login'),
    register: () => import('../pages/Register'),
    candidateDashboard: () => import('../pages/CandidateDashboard'),
    recruiterDashboard: () => import('../pages/RecruiterDashboard'),
    jobs: () => import('../pages/JobsList'),
    jobDetails: () => import('../pages/JobDetails'),
    applications: () => import('../pages/Applications'),
    jobApplications: () => import('../pages/JobApplications'),
    profileBuilder: () => import('../pages/ProfileBuilder'),
    profileEditor: () => import('../pages/ProfileEditor'),
};

const loaded = new Set();

export const preloadRoute = (key) => {
    if (loaded.has(key) || !routePreloaders[key]) return;
    loaded.add(key);
    routePreloaders[key]().catch(() => {
        loaded.delete(key);
    });
};

export const preloadCandidateRoutes = () => {
    preloadRoute('candidateDashboard');
    preloadRoute('profileBuilder');
    preloadRoute('jobs');
    preloadRoute('applications');
};

export const preloadRecruiterRoutes = () => {
    preloadRoute('recruiterDashboard');
    preloadRoute('jobApplications');
};

