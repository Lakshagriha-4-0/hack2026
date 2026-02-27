import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();
const USER_CACHE_KEY = 'userData';

const getCachedUser = () => {
    try {
        const raw = localStorage.getItem(USER_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const cachedUser = getCachedUser();
    const hasToken = Boolean(localStorage.getItem('token'));
    const [user, setUser] = useState(cachedUser);
    const [loading, setLoading] = useState(hasToken && !cachedUser);
    const [role, setRole] = useState(localStorage.getItem('userRole') || null);

    useEffect(() => {
        const checkLoggedIn = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const { data } = await api.get('/auth/me');
                    setUser(data);
                    setRole(data.role);
                    localStorage.setItem('userRole', data.role);
                    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data));
                } catch (error) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userRole');
                    localStorage.removeItem(USER_CACHE_KEY);
                    setUser(null);
                    setRole(null);
                }
            }
            setLoading(false);
        };

        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data));
        setUser(data);
        setRole(data.role);
        return data;
    };

    const register = async (name, email, password, userRole) => {
        const { data } = await api.post('/auth/register', { name, email, password, role: userRole });
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data));
        setUser(data);
        setRole(data.role);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem(USER_CACHE_KEY);
        setUser(null);
        setRole(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, role, setRole, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
