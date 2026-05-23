import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogIn, UserPlus, Key, Mail, User, ShieldAlert } from "lucide-react";

const Login = () => {
    const { login, register, error, setError } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        setSuccessMessage("");

        if (isRegister) {
            if (!username.trim() || !email.trim() || !password.trim()) {
                setError("All fields are required");
                setSubmitting(false);
                return;
            }
            const res = await register(username.trim(), email.trim(), password);
            if (res.success) {
                setSuccessMessage("Registration successful! You can now log in.");
                setIsRegister(false);
                setUsername("");
            }
        } else {
            if (!email.trim() && !username.trim()) {
                setError("Please enter your Username or Email");
                setSubmitting(false);
                return;
            }
            if (!password) {
                setError("Please enter your password");
                setSubmitting(false);
                return;
            }
            // Backend login supports either email or username, we'll send both for validation
            await login(email.trim(), email.trim(), password);
        }
        setSubmitting(false);
    };

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "80vh",
            padding: "20px 0"
        }}>
            <div className="glass-panel glass-panel-glow animate-fade-in" style={{
                width: "100%",
                maxWidth: "400px",
                padding: "32px 24px",
                textAlign: "center"
            }}>
                <div style={{
                    background: "rgba(139, 92, 246, 0.15)",
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px auto",
                    border: "1px solid rgba(139, 92, 246, 0.3)"
                }}>
                    {isRegister ? (
                        <UserPlus size={28} color="var(--accent-light)" />
                    ) : (
                        <LogIn size={28} color="var(--accent-light)" />
                    )}
                </div>

                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
                    {isRegister ? "Create Account" : "Karkhanu Partner Login"}
                </h2>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "28px" }}>
                    {isRegister ? "Sign up to manage your items and financial records" : "Access your factory dashboard & party ledgers"}
                </p>

                {error && (
                    <div className="alert alert-danger">
                        <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                        <span>{error}</span>
                    </div>
                )}

                {successMessage && (
                    <div className="alert alert-success">
                        <span>{successMessage}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ width: "100%" }}>
                    {isRegister && (
                        <div className="form-group animate-fade-in">
                            <label className="form-label">Username</label>
                            <div style={{ width: "100%", position: "relative" }}>
                                <User size={18} color="var(--text-muted)" style={{ position: "absolute", left: "14px", top: "16px" }} />
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ paddingLeft: "42px" }}
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={submitting}
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">{isRegister ? "Email Address" : "Username or Email"}</label>
                        <div style={{ width: "100%", position: "relative" }}>
                            <Mail size={18} color="var(--text-muted)" style={{ position: "absolute", left: "14px", top: "16px" }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: "42px" }}
                                placeholder={isRegister ? "name@email.com" : "Enter email or username"}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div style={{ width: "100%", position: "relative" }}>
                            <Key size={18} color="var(--text-muted)" style={{ position: "absolute", left: "14px", top: "16px" }} />
                            <input
                                type="password"
                                className="form-input"
                                style={{ paddingLeft: "42px" }}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "8px" }} disabled={submitting}>
                        {submitting ? (
                            <div className="spinner" style={{ width: "20px", height: "20px", borderWidth: "2px" }}></div>
                        ) : isRegister ? (
                            <>
                                <UserPlus size={18} />
                                Register
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                Log In
                            </>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: "24px", fontSize: "14px", color: "var(--text-secondary)" }}>
                    {isRegister ? (
                        <span>
                            Already have an account?{" "}
                            <button
                                className="btn-link"
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--accent-light)",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    padding: "0"
                                }}
                                onClick={() => {
                                    setIsRegister(false);
                                    setError("");
                                }}
                            >
                                Sign In
                            </button>
                        </span>
                    ) : (
                        <span>
                            Don't have an account?{" "}
                            <button
                                className="btn-link"
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--accent-light)",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    padding: "0"
                                }}
                                onClick={() => {
                                    setIsRegister(true);
                                    setError("");
                                }}
                            >
                                Register Now
                            </button>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
