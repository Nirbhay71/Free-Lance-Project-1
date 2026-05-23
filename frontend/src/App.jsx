import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PartyDetails from "./pages/PartyDetails";
import Reports from "./pages/Reports";
import { LayoutDashboard, BarChart3, User, LogOut, Factory, Mail, Award } from "lucide-react";
import "./App.css";

const AppContent = () => {
    const { user, loading, logout } = useAuth();
    const [activePage, setActivePage] = useState("dashboard"); // dashboard, reports, profile
    const [selectedPartyName, setSelectedPartyName] = useState("");

    if (loading) {
        return (
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100vh",
                flexDirection: "column",
                gap: "16px",
                background: "var(--bg-primary)"
            }}>
                <div className="spinner"></div>
                <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>
                    Loading factory ledger...
                </span>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="app-container" style={{ justifyContent: "center" }}>
                <Login />
            </div>
        );
    }

    return (
        <div className="app-container">
            {/* Top Minimal Branding Header */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0 16px 0",
                borderBottom: "1px solid var(--border-color)",
                marginBottom: "20px"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Factory size={22} color="var(--accent-light)" />
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: "800", fontSize: "18px", letterSpacing: "0.5px" }}>
                        KARKHANU
                    </span>
                </div>
                <div className="badge badge-success" style={{ fontSize: "10px", textTransform: "capitalize" }}>
                    {user.username}
                </div>
            </div>

            {/* Active Page View Rendering */}
            <main style={{ flexGrow: 1 }}>
                {activePage === "dashboard" && (
                    selectedPartyName ? (
                        <PartyDetails 
                            partyName={selectedPartyName} 
                            onBack={() => setSelectedPartyName("")} 
                        />
                    ) : (
                        <Dashboard 
                            onSelectParty={(name) => setSelectedPartyName(name)} 
                        />
                    )
                )}

                {activePage === "reports" && <Reports />}

                {activePage === "profile" && (
                    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        <div>
                            <h1 className="page-title">Profile Settings</h1>
                            <p className="page-subtitle">Configure accounts and active sessions</p>
                        </div>

                        <div className="glass-panel" style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "20px", textAlign: "center" }}>
                            <div style={{
                                width: "72px",
                                height: "72px",
                                background: "rgba(139,92,246,0.15)",
                                border: "1px solid var(--border-glow)",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto"
                            }}>
                                <User size={36} color="var(--accent-light)" />
                            </div>

                            <div>
                                <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "20px" }}>{user.username}</h3>
                                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>Active Factory Partner</p>
                            </div>

                            <div style={{ borderTop: "1px solid var(--border-color)" }}></div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", textAlign: "left", fontSize: "14px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <Mail size={16} color="var(--text-muted)" />
                                    <span>Email: <strong>{user.email}</strong></span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <Award size={16} color="var(--text-muted)" />
                                    <span>Permissions: <strong>Administrator</strong></span>
                                </div>
                            </div>

                            <button 
                                onClick={logout} 
                                className="btn btn-danger" 
                                style={{ width: "100%", marginTop: "12px" }}
                            >
                                <LogOut size={18} />
                                Log Out Account
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom/Top Mobile Navigation Bar */}
            <nav className="mobile-nav-bar">
                <button 
                    onClick={() => {
                        setActivePage("dashboard");
                        setSelectedPartyName(""); // Reset detail view when tapping tab
                    }} 
                    className={`mobile-nav-item ${activePage === "dashboard" ? "active" : ""}`}
                >
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </button>

                <button 
                    onClick={() => setActivePage("reports")} 
                    className={`mobile-nav-item ${activePage === "reports" ? "active" : ""}`}
                >
                    <BarChart3 size={20} />
                    <span>Reports</span>
                </button>

                <button 
                    onClick={() => setActivePage("profile")} 
                    className={`mobile-nav-item ${activePage === "profile" ? "active" : ""}`}
                >
                    <User size={20} />
                    <span>Profile</span>
                </button>
            </nav>
        </div>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
