import { useMemo, useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { Loader2, FileText, BadgeCheck, UserCircle, Camera } from 'lucide-react';

const ProfileBuilder = () => {
    const [personal, setPersonal] = useState({
        fullName: '',
        email: '',
        phone: '',
        profilePic: '',
    });

    const [publicData, setPublicData] = useState({
        skills: [],
        tagline: '',
        city: '',
        resumeAnonymized: { text: '' },
    });

    const [candidatePublicId, setCandidatePublicId] = useState('');
    const [resumeFile, setResumeFile] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);

    const [loading, setLoading] = useState(true);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const photoInputRef = useRef(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await api.get('/auth/me');
                setCandidatePublicId(data.candidatePublicId || '');

                if (data.candidateProfile) {
                    setPersonal((prev) => ({
                        ...prev,
                        ...data.candidateProfile.personal,
                        fullName: data.candidateProfile.personal?.fullName || data.name || prev.fullName,
                        email: data.candidateProfile.personal?.email || data.email || prev.email,
                    }));
                    setPublicData((prev) => ({ ...prev, ...data.candidateProfile.public }));
                } else {
                    setPersonal((prev) => ({ ...prev, fullName: data.name || prev.fullName, email: data.email || prev.email }));
                }
            } catch (err) {
                setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load profile' });
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const completionPercent = useMemo(() => {
        const checks = [
            !!personal.fullName,
            !!personal.email,
            !!personal.phone,
            !!publicData.city,
            !!publicData.tagline,
            (publicData.skills || []).length > 0,
            !!personal.profilePic,
            !!publicData.resumeAnonymized?.text,
        ];
        const done = checks.filter(Boolean).length;
        return Math.round((done / checks.length) * 100);
    }, [personal, publicData]);

    const handleResumeUpload = async () => {
        if (!resumeFile) return;
        setUploadingResume(true);
        setMessage({ type: '', text: '' });

        try {
            const formData = new FormData();
            formData.append('resume', resumeFile);
            const { data } = await api.post('/candidate/profile/resume', formData);

            if (data.candidateProfile?.personal) {
                setPersonal((prev) => ({ ...prev, ...data.candidateProfile.personal }));
            }
            if (data.candidateProfile?.public) {
                setPublicData((prev) => ({ ...prev, ...data.candidateProfile.public }));
            }
            const updatedFields = Array.isArray(data.updatedFields) ? data.updatedFields : [];
            setMessage({ type: 'success', text: 'Resume uploaded. Open Complete Profile to review/edit auto-filled fields.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Resume upload failed' });
        } finally {
            setUploadingResume(false);
        }
    };

    const handlePhotoUpload = async () => {
        if (!photoFile) return;
        setUploadingPhoto(true);
        setMessage({ type: '', text: '' });

        try {
            const formData = new FormData();
            formData.append('photo', photoFile);
            const { data } = await api.post('/candidate/profile/photo', formData);
            setPersonal((prev) => ({ ...prev, profilePic: data.profilePic }));
            setMessage({ type: 'success', text: 'Profile photo uploaded.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Photo upload failed' });
        } finally {
            setUploadingPhoto(false);
        }
    };

    useEffect(() => {
        if (photoFile) {
            handlePhotoUpload();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [photoFile]);

    const openCompleteProfile = () => {
        window.open('/candidate/profile/edit', '_blank', 'noopener,noreferrer');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
            <Navbar />
            <main className="max-w-6xl mx-auto py-10 px-4 space-y-8">
                <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-2 flex gap-5 items-center">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-blue-500/40 hover:border-blue-400 transition-all"
                                title="Click to upload profile photo"
                            >
                                {personal.profilePic ? (
                                    <img src={personal.profilePic} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                        <UserCircle className="w-16 h-16 text-slate-500" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-xs py-1 flex items-center justify-center gap-1">
                                    {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                                    {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                                </div>
                            </button>
                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                                className="hidden"
                            />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{personal.fullName || 'Candidate Profile'}</h1>
                            <div className="text-slate-400 mt-1">{personal.email || 'No email added'}</div>
                            <div className="text-slate-400">{personal.phone || 'No phone added'}</div>
                            <div className="flex items-center gap-2 mt-3 text-blue-400 font-semibold">
                                <BadgeCheck className="w-4 h-4" /> {candidatePublicId || 'Generating...'}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-3">
                        <div
                            className="w-28 h-28 rounded-full grid place-items-center"
                            style={{
                                background: `conic-gradient(#22c55e ${completionPercent}%, #334155 ${completionPercent}% 100%)`,
                            }}
                        >
                            <div className="w-20 h-20 rounded-full bg-slate-950 grid place-items-center font-bold text-xl">
                                {completionPercent}%
                            </div>
                        </div>
                        <div className="text-slate-300 font-medium">Profile Completion</div>
                        <button onClick={openCompleteProfile} className="mt-2 bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl font-semibold">
                            Complete Profile
                        </button>
                    </div>
                </section>

                {message.text && (
                    <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-red-300 border-red-500/40 bg-red-500/10'}`}>
                        {message.text}
                    </div>
                )}

                <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8">
                    <h2 className="text-xl font-bold mb-4">Upload Resume</h2>
                    <p className="text-slate-400 mb-5">Use this section only to upload/replace your resume.</p>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 max-w-xl">
                            <label className="block text-sm mb-2 text-slate-300">Resume (PDF/DOCX/TXT)</label>
                            <input
                                type="file"
                                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                className="w-full text-sm"
                            />
                            <button
                                type="button"
                                onClick={handleResumeUpload}
                                disabled={!resumeFile || uploadingResume}
                                className="mt-3 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2"
                            >
                                {uploadingResume ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                Upload Resume
                            </button>
                            {personal?.resumeOriginal?.fileName && <div className="mt-4 border-t border-slate-700 pt-3 text-sm text-slate-300">Current resume: {personal.resumeOriginal.fileName}</div>}
                        </div>
                    </div>
                </section>

                <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8">
                    <h2 className="text-2xl font-bold mb-3">Bias-Free Resume Preview</h2>
                    <p className="text-slate-400 mb-4">This is the resume recruiters will receive when you apply.</p>
                    {publicData.resumeAnonymized?.text ? (
                        <pre className="whitespace-pre-wrap text-sm leading-7 bg-slate-800 border border-slate-700 rounded-xl p-4 max-h-96 overflow-auto">
                            {publicData.resumeAnonymized.text}
                        </pre>
                    ) : (
                        <div className="text-slate-500">Upload your resume to generate a bias-free preview.</div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default ProfileBuilder;
