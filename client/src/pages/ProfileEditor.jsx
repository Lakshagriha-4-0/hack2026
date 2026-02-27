import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { Loader2, Save, FileText, Plus, X, Download, ShieldCheck, RefreshCw } from 'lucide-react';

const SectionCard = ({ title, subtitle, children }) => (
    <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle ? <p className="text-slate-400 mt-1">{subtitle}</p> : null}
        </div>
        {children}
    </section>
);

const ProfileEditor = () => {
    const [personal, setPersonal] = useState({
        fullName: '',
        email: '',
        phone: '',
        gender: '',
        college: '',
        address: '',
        bio: '',
        githubLink: '',
        linkedinLink: '',
        currentRole: '',
        currentCompany: '',
    });

    const [publicData, setPublicData] = useState({
        skills: [],
        experienceYears: 0,
        tagline: '',
        projects: [],
        education: [],
        experience: [],
        portfolioLink: '',
        city: '',
    });

    const [newSkill, setNewSkill] = useState('');
    const [newProject, setNewProject] = useState({ title: '', description: '', link: '' });
    const [newEducation, setNewEducation] = useState({ school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' });
    const [newWork, setNewWork] = useState({ company: '', role: '', location: '', description: '' });

    const [resumeFile, setResumeFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [autofilling, setAutofilling] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [biasFreePreview, setBiasFreePreview] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await api.get('/auth/me');
                if (data.candidateProfile) {
                    setPersonal((prev) => ({
                        ...prev,
                        ...data.candidateProfile.personal,
                        fullName: data.candidateProfile.personal?.fullName || data.name || prev.fullName,
                        email: data.candidateProfile.personal?.email || data.email || prev.email,
                    }));
                    setPublicData((prev) => ({ ...prev, ...data.candidateProfile.public }));
                    setBiasFreePreview(data.candidateProfile.public?.resumeAnonymized?.text || '');

                    if (data.candidateProfile.personal?.resumeOriginal?.fileName) {
                        setMessage({
                            type: 'success',
                            text: 'Resume already uploaded. Auto-filled data is loaded below; you can edit and save.',
                        });
                    } else {
                        setMessage({
                            type: 'error',
                            text: 'No resume uploaded yet. Please upload resume first for auto-fill.',
                        });
                    }
                } else {
                    setPersonal((prev) => ({ ...prev, fullName: data.name || prev.fullName, email: data.email || prev.email }));
                    setMessage({
                        type: 'error',
                        text: 'No resume uploaded yet. Please upload resume first for auto-fill.',
                    });
                }
            } catch (err) {
                setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load profile' });
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

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
                setBiasFreePreview(data.candidateProfile.public?.resumeAnonymized?.text || '');
            }
            const updatedFields = Array.isArray(data.updatedFields) ? data.updatedFields : [];
            setMessage({
                type: updatedFields.length > 0 ? 'success' : 'error',
                text:
                    updatedFields.length > 0
                        ? `Resume uploaded and saved. Updated fields: ${updatedFields.join(', ')}.`
                        : 'Resume uploaded and saved, but no new fields were auto-filled from this file.',
            });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Resume upload failed' });
        } finally {
            setUploadingResume(false);
        }
    };

    const handleAutoFill = async () => {
        setAutofilling(true);
        setMessage({ type: '', text: '' });

        try {
            const { data } = await api.post('/candidate/profile/auto-fill');
            if (data.candidateProfile?.personal) {
                setPersonal((prev) => ({ ...prev, ...data.candidateProfile.personal }));
            }
            if (data.candidateProfile?.public) {
                setPublicData((prev) => ({ ...prev, ...data.candidateProfile.public }));
                setBiasFreePreview(data.candidateProfile.public?.resumeAnonymized?.text || '');
            }
            setMessage({ type: 'success', text: 'Profile successfully re-filled from uploaded resume using Gemini AI.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Auto-fill failed' });
        } finally {
            setAutofilling(false);
        }
    };

    const hasUploadedResume = Boolean(personal?.resumeOriginal?.fileName);

    const handleDownloadResume = async () => {
        try {
            const response = await api.get('/candidate/profile/resume/download', { responseType: 'blob' });
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = personal?.resumeOriginal?.fileName || 'resume';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Resume download failed' });
        }
    };

    const addSkill = () => {
        const skill = newSkill.trim();
        if (!skill) return;
        if ((publicData.skills || []).includes(skill)) return;
        setPublicData((prev) => ({ ...prev, skills: [...(prev.skills || []), skill] }));
        setNewSkill('');
    };

    const addProject = () => {
        if (!newProject.title.trim()) return;
        const updatedProjects = [
            ...(publicData.projects || []),
            {
                title: newProject.title.trim(),
                description: newProject.description.trim(),
                link: newProject.link.trim(),
            },
        ];
        setPublicData((prev) => ({
            ...prev,
            projects: updatedProjects,
        }));
        setNewProject({ title: '', description: '', link: '' });
        // Minimal visual feedback that it's added to local list
    };

    const addEducation = () => {
        if (!newEducation.school.trim() && !newEducation.degree.trim()) return;
        setPublicData((prev) => ({
            ...prev,
            education: [
                ...(prev.education || []),
                {
                    school: newEducation.school.trim(),
                    degree: newEducation.degree.trim(),
                    fieldOfStudy: newEducation.fieldOfStudy.trim(),
                    startYear: newEducation.startYear ? Number(newEducation.startYear) : undefined,
                    endYear: newEducation.endYear ? Number(newEducation.endYear) : undefined,
                },
            ],
        }));
        setNewEducation({ school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' });
    };

    const addExperience = () => {
        if (!newWork.company.trim() && !newWork.role.trim()) return;
        setPublicData((prev) => ({
            ...prev,
            experience: [
                ...(prev.experience || []),
                {
                    company: newWork.company.trim(),
                    role: newWork.role.trim(),
                    location: newWork.location.trim(),
                    description: newWork.description.trim(),
                },
            ],
        }));
        setNewWork({ company: '', role: '', location: '', description: '' });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const sanitizedPersonal = { ...personal };
            delete sanitizedPersonal.resumeOriginal;
            delete sanitizedPersonal.profilePic;
            Object.keys(sanitizedPersonal).forEach((key) => {
                if (typeof sanitizedPersonal[key] === 'string') {
                    sanitizedPersonal[key] = sanitizedPersonal[key].trim();
                }
            });

            const sanitizedPublic = { ...publicData };
            delete sanitizedPublic.resumeAnonymized;
            sanitizedPublic.skills = (sanitizedPublic.skills || [])
                .map((skill) => String(skill || '').trim())
                .filter(Boolean);
            sanitizedPublic.projects = (sanitizedPublic.projects || [])
                .map((project) => ({
                    title: String(project?.title || '').trim(),
                    description: String(project?.description || '').trim(),
                    link: String(project?.link || '').trim(),
                }))
                .filter((project) => project.title || project.description || project.link);
            sanitizedPublic.education = (sanitizedPublic.education || [])
                .map((edu) => ({
                    school: String(edu?.school || '').trim(),
                    degree: String(edu?.degree || '').trim(),
                    fieldOfStudy: String(edu?.fieldOfStudy || '').trim(),
                    startYear: edu?.startYear ? Number(edu.startYear) : undefined,
                    endYear: edu?.endYear ? Number(edu.endYear) : undefined,
                }))
                .filter((edu) => edu.school || edu.degree || edu.fieldOfStudy || edu.startYear || edu.endYear);
            sanitizedPublic.experience = (sanitizedPublic.experience || [])
                .map((work) => ({
                    company: String(work?.company || '').trim(),
                    role: String(work?.role || '').trim(),
                    location: String(work?.location || '').trim(),
                    description: String(work?.description || '').trim(),
                    startDate: String(work?.startDate || '').trim(),
                    endDate: String(work?.endDate || '').trim(),
                    isCurrent: Boolean(work?.isCurrent),
                }))
                .filter((work) => work.company || work.role || work.location || work.description || work.startDate || work.endDate);

            await api.put('/candidate/profile', {
                personal: sanitizedPersonal,
                public: {
                    ...sanitizedPublic,
                    experienceYears: Number(publicData.experienceYears) || 0,
                },
            });
            setMessage({ type: 'success', text: 'Profile updated successfully.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save profile' });
        } finally {
            setSaving(false);
        }
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
            <main className="max-w-5xl mx-auto py-10 px-4 space-y-8">
                <SectionCard
                    title="Complete Profile"
                    subtitle={
                        hasUploadedResume
                            ? 'Resume is uploaded. You can re-upload to refresh or use AI Auto-Fill to populate missing fields.'
                            : 'Upload resume first to auto-fill profile fields using Gemini AI.'
                    }
                >
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <input
                                type="file"
                                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                className="flex-1 text-sm bg-slate-800/50 border border-slate-700 rounded-xl p-2"
                            />
                            <button
                                type="button"
                                onClick={handleResumeUpload}
                                disabled={!resumeFile || uploadingResume}
                                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                            >
                                {uploadingResume ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                {hasUploadedResume ? 'Update & Re-fill' : 'Upload & Auto-Fill'}
                            </button>
                        </div>

                        {hasUploadedResume && (
                            <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-800/30 border border-slate-700/50 rounded-2xl gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{personal.resumeOriginal.fileName}</p>
                                        <p className="text-xs text-slate-500">Uploaded on {new Date(personal.resumeOriginal.uploadedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDownloadResume}
                                        className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Download
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAutoFill}
                                        disabled={autofilling}
                                        className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
                                    >
                                        {autofilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                        Run AI Auto-Fill
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </SectionCard>

                {biasFreePreview && (
                    <SectionCard
                        title="Bias-Free Resume Preview"
                        subtitle="This is how recruiters see your profile to ensure fair hiring. Identity details are hidden."
                    >
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 font-mono text-sm text-slate-400 whitespace-pre-wrap leading-relaxed shadow-inner">
                                <div className="absolute top-4 right-4 text-emerald-500/50">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                {biasFreePreview}
                            </div>
                        </div>
                    </SectionCard>
                )}

                {message.text && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${message.type === 'success' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-red-300 border-red-500/40 bg-red-500/10'}`}>
                        {message.type === 'success' ? <RefreshCw className="w-5 h-5 mt-0.5" /> : <X className="w-5 h-5 mt-0.5" />}
                        <div>
                            <p className="font-semibold">{message.type === 'success' ? 'Success' : 'Notice'}</p>
                            <p className="text-sm opacity-90">{message.text}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    <SectionCard title="Personal Details" subtitle="Private information used after shortlist.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Full Name" value={personal.fullName} onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Email" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Phone" value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Gender" value={personal.gender} onChange={(e) => setPersonal({ ...personal, gender: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="College" value={personal.college} onChange={(e) => setPersonal({ ...personal, college: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Address" value={personal.address} onChange={(e) => setPersonal({ ...personal, address: e.target.value })} />
                        </div>
                        <textarea className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" rows="3" placeholder="Bio" value={personal.bio} onChange={(e) => setPersonal({ ...personal, bio: e.target.value })} />
                    </SectionCard>

                    <SectionCard title="Professional Overview" subtitle="Public summary shown to recruiters.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Current Role" value={personal.currentRole} onChange={(e) => setPersonal({ ...personal, currentRole: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Current Company" value={personal.currentCompany} onChange={(e) => setPersonal({ ...personal, currentCompany: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Tagline" value={publicData.tagline} onChange={(e) => setPublicData({ ...publicData, tagline: e.target.value })} />
                            <input type="number" className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Experience Years" value={publicData.experienceYears} onChange={(e) => setPublicData({ ...publicData, experienceYears: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="City" value={publicData.city} onChange={(e) => setPublicData({ ...publicData, city: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Portfolio Link" value={publicData.portfolioLink} onChange={(e) => setPublicData({ ...publicData, portfolioLink: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="GitHub" value={personal.githubLink} onChange={(e) => setPersonal({ ...personal, githubLink: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="LinkedIn" value={personal.linkedinLink} onChange={(e) => setPersonal({ ...personal, linkedinLink: e.target.value })} />
                        </div>
                    </SectionCard>

                    <SectionCard title="Skills" subtitle="Add and manage core skills.">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
                                placeholder="Add skill"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                            />
                            <button type="button" onClick={addSkill} className="bg-blue-600 hover:bg-blue-500 px-4 rounded-xl">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {(publicData.skills || []).map((skill) => (
                                <span key={skill} className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg flex items-center gap-2">
                                    {skill}
                                    <X className="w-4 h-4 cursor-pointer text-slate-400 hover:text-red-300" onClick={() => setPublicData((prev) => ({ ...prev, skills: (prev.skills || []).filter((s) => s !== skill) }))} />
                                </span>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard title="Projects" subtitle="Add project work shown in public profile.">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Project title" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Project link" value={newProject.link} onChange={(e) => setNewProject({ ...newProject, link: e.target.value })} />
                            <button type="button" className="bg-slate-800 border border-slate-700 rounded-xl px-4 flex items-center justify-center" onClick={addProject} title="Add project">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <textarea className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" rows="2" placeholder="Project description" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} />
                        {(publicData.projects || []).length > 0 && (
                            <div className="space-y-2">
                                {(publicData.projects || []).map((p, idx) => (
                                    <div key={`${p.title}-${idx}`} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-start justify-between gap-3">
                                        <div className="flex-1 space-y-2">
                                            <input
                                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                                                placeholder="Project title"
                                                value={p.title || ''}
                                                onChange={(e) =>
                                                    setPublicData((prev) => ({
                                                        ...prev,
                                                        projects: (prev.projects || []).map((item, i) => (i === idx ? { ...item, title: e.target.value } : item)),
                                                    }))
                                                }
                                            />
                                            <input
                                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                                                placeholder="Project link"
                                                value={p.link || ''}
                                                onChange={(e) =>
                                                    setPublicData((prev) => ({
                                                        ...prev,
                                                        projects: (prev.projects || []).map((item, i) => (i === idx ? { ...item, link: e.target.value } : item)),
                                                    }))
                                                }
                                            />
                                            <textarea
                                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                                                rows="2"
                                                placeholder="Project description"
                                                value={p.description || ''}
                                                onChange={(e) =>
                                                    setPublicData((prev) => ({
                                                        ...prev,
                                                        projects: (prev.projects || []).map((item, i) => (i === idx ? { ...item, description: e.target.value } : item)),
                                                    }))
                                                }
                                            />
                                        </div>
                                        <button type="button" className="text-slate-400 hover:text-red-300" onClick={() => setPublicData((prev) => ({ ...prev, projects: (prev.projects || []).filter((_, i) => i !== idx) }))}>
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="Education" subtitle="Academic background details.">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="School/College" value={newEducation.school} onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Degree" value={newEducation.degree} onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Field of study" value={newEducation.fieldOfStudy} onChange={(e) => setNewEducation({ ...newEducation, fieldOfStudy: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Start year" value={newEducation.startYear} onChange={(e) => setNewEducation({ ...newEducation, startYear: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="End year" value={newEducation.endYear} onChange={(e) => setNewEducation({ ...newEducation, endYear: e.target.value })} />
                            <button type="button" className="md:col-span-5 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-center" onClick={addEducation} title="Add education">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        {(publicData.education || []).length > 0 && (
                            <div className="space-y-2">
                                {(publicData.education || []).map((e, idx) => (
                                    <div key={`${e.school}-${idx}`} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-start justify-between gap-3">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <input
                                                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                                                placeholder="School"
                                                value={e.school || ''}
                                                onChange={(ev) =>
                                                    setPublicData((prev) => ({
                                                        ...prev,
                                                        education: (prev.education || []).map((item, i) => (i === idx ? { ...item, school: ev.target.value } : item)),
                                                    }))
                                                }
                                            />
                                            <input
                                                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                                                placeholder="Degree"
                                                value={e.degree || ''}
                                                onChange={(ev) =>
                                                    setPublicData((prev) => ({
                                                        ...prev,
                                                        education: (prev.education || []).map((item, i) => (i === idx ? { ...item, degree: ev.target.value } : item)),
                                                    }))
                                                }
                                            />
                                            <input
                                                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                                                placeholder="Field of study"
                                                value={e.fieldOfStudy || ''}
                                                onChange={(ev) =>
                                                    setPublicData((prev) => ({
                                                        ...prev,
                                                        education: (prev.education || []).map((item, i) => (i === idx ? { ...item, fieldOfStudy: ev.target.value } : item)),
                                                    }))
                                                }
                                            />
                                        </div>
                                        <button type="button" className="text-slate-400 hover:text-red-300" onClick={() => setPublicData((prev) => ({ ...prev, education: (prev.education || []).filter((_, i) => i !== idx) }))}>
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="Experience" subtitle="Professional work experience.">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Company" value={newWork.company} onChange={(e) => setNewWork({ ...newWork, company: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Role" value={newWork.role} onChange={(e) => setNewWork({ ...newWork, role: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" placeholder="Location" value={newWork.location} onChange={(e) => setNewWork({ ...newWork, location: e.target.value })} />
                            <button type="button" className="bg-slate-800 border border-slate-700 rounded-xl px-4 flex items-center justify-center" onClick={addExperience} title="Add experience">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <textarea className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3" rows="2" placeholder="Work description" value={newWork.description} onChange={(e) => setNewWork({ ...newWork, description: e.target.value })} />
                        {(publicData.experience || []).length > 0 && (
                            <div className="space-y-2">
                                {(publicData.experience || []).map((x, idx) => (
                                    <div key={`${x.company}-${idx}`} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-start justify-between gap-3">
                                        <div className="flex-1 space-y-2">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                <input
                                                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                                                    placeholder="Company"
                                                    value={x.company || ''}
                                                    onChange={(ev) =>
                                                        setPublicData((prev) => ({
                                                            ...prev,
                                                            experience: (prev.experience || []).map((item, i) => (i === idx ? { ...item, company: ev.target.value } : item)),
                                                        }))
                                                    }
                                                />
                                                <input
                                                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                                                    placeholder="Role"
                                                    value={x.role || ''}
                                                    onChange={(ev) =>
                                                        setPublicData((prev) => ({
                                                            ...prev,
                                                            experience: (prev.experience || []).map((item, i) => (i === idx ? { ...item, role: ev.target.value } : item)),
                                                        }))
                                                    }
                                                />
                                                <input
                                                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                                                    placeholder="Location"
                                                    value={x.location || ''}
                                                    onChange={(ev) =>
                                                        setPublicData((prev) => ({
                                                            ...prev,
                                                            experience: (prev.experience || []).map((item, i) => (i === idx ? { ...item, location: ev.target.value } : item)),
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <textarea
                                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                                                rows="2"
                                                placeholder="Work description"
                                                value={x.description || ''}
                                                onChange={(ev) =>
                                                    setPublicData((prev) => ({
                                                        ...prev,
                                                        experience: (prev.experience || []).map((item, i) => (i === idx ? { ...item, description: ev.target.value } : item)),
                                                    }))
                                                }
                                            />
                                        </div>
                                        <button type="button" className="text-slate-400 hover:text-red-300" onClick={() => setPublicData((prev) => ({ ...prev, experience: (prev.experience || []).filter((_, i) => i !== idx) }))}>
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    <div className="sticky bottom-6 z-50 flex flex-col items-center gap-2">
                        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-2 rounded-2xl shadow-2xl flex items-center gap-4">
                            <button type="submit" disabled={saving} className="btn-primary h-12 px-8 flex items-center gap-2 shadow-blue-600/20">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {saving ? 'Saving...' : 'Save All Changes'}
                            </button>
                            <div className="h-8 w-px bg-slate-700 mx-2" />
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-4">
                                Draft changes stored locally
                            </p>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default ProfileEditor;
