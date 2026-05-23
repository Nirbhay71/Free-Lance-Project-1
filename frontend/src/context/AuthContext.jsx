import React, { createContext, useState, useEffect, useContext } from "react";
import API from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchCurrentUser = async () => {
        try {
            setLoading(true);
            const response = await API.get("/users/current-user");
            if (response.data?.success) {
                setUser(response.data.data);
            }
        } catch (err) {
            console.log("No active user session found");
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const login = async (username, email, password) => {
        try {
            setError("");
            // The backend login accepts either email OR username, but we pass both to support flexibility
            const response = await API.post("/users/login", { username, email, password });
            if (response.data?.success) {
                const token = response.data.data?.accessToken;
                if (token) {
                    localStorage.setItem("token", token);
                }
                setUser(response.data.data.user);
                return { success: true };
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Invalid credentials. Please try again.";
            setError(msg);
            return { success: false, message: msg };
        }
    };

    const register = async (username, email, password) => {
        try {
            setError("");
            const response = await API.post("/users/register", { username, email, password });
            if (response.data?.success) {
                return { success: true };
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Registration failed. Try a different username/email.";
            setError(msg);
            return { success: false, message: msg };
        }
    };

    const logout = async () => {
        try {
            await API.post("/users/logout");
        } catch (err) {
            console.error("Logout failed on server:", err);
        } finally {
            localStorage.removeItem("token");
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, setError, login, register, logout, fetchCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
