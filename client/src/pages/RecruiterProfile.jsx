import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const RecruiterProfile = () => {
    const navigate = useNavigate();
    const [account, setAccount] = useState({ name: '', email: '' });
    const [form, setForm] = useState({
        companyName: '',
        designation: '',
        phone: '',
        website: '',
        linkedin: '',
        location: '',
        about: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const { data } = await api.get('/auth/me');
                const rp = data.recruiterProfile || {};
                setForm((prev) => ({ ...prev, ...rp }));
                setAccount({
                    name: data.name || '',
                    email: data.email || '',
                });
            } catch (err) {
                setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load recruiter profile' });
            } finally {
                setLoading(false);
            }
        };
        fetchMe();
    }, []);

    const onSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const { data } = await api.put('/recruiter/profile', form);
            setForm((prev) => ({ ...prev, ...(data.recruiterProfile || {}) }));
            setMessage({ type: 'success', text: 'Recruiter profile updated' });
            setEditing(false);
            navigate('/recruiter');
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save recruiter profile' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
                Loading profile...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 py-10">
                <h1 className="text-3xl font-bold mb-2">Recruiter Profile</h1>
                <p className="text-slate-500 mb-8">Add your recruiter and company details.</p>

                {message.text && (
                    <div className={`mb-6 p-3 rounded-xl border ${message.type === 'success' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-red-300 border-red-500/40 bg-red-500/10'}`}>
                        {message.text}
                    </div>
                )}

                {!editing ? (
                    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Account</p>
                                <p className="text-sm text-slate-100 font-semibold">{account.name || 'Not set'}</p>
                                <p className="text-xs text-slate-400">{account.email || 'Not set'}</p>
                            </div>
                            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 md:col-span-2">
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Company</p>
                                <div className="grid md:grid-cols-2 gap-2 text-sm">
                                    <p><span className="text-slate-500">Name:</span> <span className="text-slate-200">{form.companyName || 'Not set'}</span></p>
                                    <p><span className="text-slate-500">Designation:</span> <span className="text-slate-200">{form.designation || 'Not set'}</span></p>
                                    <p><span className="text-slate-500">Location:</span> <span className="text-slate-200">{form.location || 'Not set'}</span></p>
                                    <p><span className="text-slate-500">Phone:</span> <span className="text-slate-200">{form.phone || 'Not set'}</span></p>
                                </div>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 text-sm">
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Professional Links</p>
                                <p><span className="text-slate-500">Website:</span> <span className="text-slate-200">{form.website || 'Not set'}</span></p>
                                <p className="mt-1"><span className="text-slate-500">LinkedIn:</span> <span className="text-slate-200">{form.linkedin || 'Not set'}</span></p>
                            </div>
                            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 text-sm">
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">About</p>
                                <p className="text-slate-200 whitespace-pre-wrap">{form.about || 'Not set'}</p>
                            </div>
                        </div>
                        <button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-lg font-semibold">
                            Edit Profile
                        </button>
                    </section>
                ) : (
                    <form onSubmit={onSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <input className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2" placeholder="Company Name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2" placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2" placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                            <input className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2" placeholder="LinkedIn" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
                        </div>
                        <textarea className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2" rows={4} placeholder="About company / hiring philosophy" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
                        <div className="flex gap-3">
                            <button disabled={saving} className="bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-lg font-semibold disabled:bg-slate-700">
                                {saving ? 'Saving...' : 'Save Profile'}
                            </button>
                            <button type="button" onClick={() => setEditing(false)} className="px-5 py-2.5 rounded-lg font-semibold bg-slate-800 hover:bg-slate-700">
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </main>
        </div>
    );
};

export default RecruiterProfile;
