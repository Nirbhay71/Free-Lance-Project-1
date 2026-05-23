import React, { useState, useEffect } from "react";
import API from "../api";
import { Plus, Search, Edit2, Check, X, Users, ChevronRight, BookOpen, AlertCircle } from "lucide-react";

const Dashboard = ({ onSelectParty }) => {
    const [parties, setParties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [newPartyName, setNewPartyName] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    
    // Rename states
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState("");

    const fetchParties = async () => {
        try {
            setLoading(true);
            const response = await API.get("/parties/all");
            if (response.data?.success) {
                setParties(response.data.data || []);
            }
        } catch (err) {
            console.error("Failed to load parties:", err);
            setError("Could not load parties ledger. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParties();
    }, []);

    const handleCreateParty = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        if (!newPartyName.trim()) {
            setError("Party Name cannot be empty");
            return;
        }

        try {
            const response = await API.post("/parties/create", { partyName: newPartyName.trim() });
            if (response.data?.success) {
                setSuccess(`Party "${newPartyName.trim()}" created successfully!`);
                setNewPartyName("");
                fetchParties();
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to create party.";
            setError(msg);
        }
    };

    const handleStartRename = (party) => {
        setRenamingId(party._id);
        setRenameValue(party.partyName);
        setError("");
        setSuccess("");
    };

    const handleCancelRename = () => {
        setRenamingId(null);
        setRenameValue("");
    };

    const handleSaveRename = async (oldName) => {
        setError("");
        setSuccess("");
        if (!renameValue.trim()) {
            setError("New Party Name cannot be empty");
            return;
        }

        try {
            const response = await API.patch("/parties/update-name", {
                oldName: oldName,
                newName: renameValue.trim()
            });

            if (response.data?.success) {
                setSuccess(`Successfully renamed to "${renameValue.trim()}"!`);
                setRenamingId(null);
                setRenameValue("");
                fetchParties();
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to rename party.";
            setError(msg);
        }
    };

    const filteredParties = parties.filter(party =>
        party.partyName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Page Header */}
            <div>
                <h1 className="page-title">Parties & Partners</h1>
                <p className="page-subtitle">Manage factories, clothing brands, and processing ledgers</p>
            </div>

            {/* Success & Error Banners */}
            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="alert alert-success" style={{ marginBottom: 0 }}>
                    <span>{success}</span>
                </div>
            )}

            {/* Quick Stats Panel (Cards) */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px"
            }}>
                <div className="glass-panel" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ padding: "10px", background: "rgba(139,92,246,0.15)", borderRadius: "50%" }}>
                        <Users size={20} color="var(--accent-light)" />
                    </div>
                    <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total Parties</div>
                        <div style={{ fontSize: "20px", fontWeight: "700", fontFamily: "var(--font-heading)" }}>{parties.length}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ padding: "10px", background: "rgba(16,185,129,0.15)", borderRadius: "50%" }}>
                        <BookOpen size={20} color="var(--success)" />
                    </div>
                    <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Active Ledger</div>
                        <div style={{ fontSize: "20px", fontWeight: "700", fontFamily: "var(--font-heading)" }}>Online</div>
                    </div>
                </div>
            </div>

            {/* Create Party Inline Form */}
            <form onSubmit={handleCreateParty} className="glass-panel" style={{
                padding: "20px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
            }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", textAlign: "left", fontFamily: "var(--font-heading)" }}>
                    Add New Party Ledger
                </h3>
                <div style={{ display: "flex", gap: "8px" }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter brand/factory name"
                        value={newPartyName}
                        onChange={(e) => setNewPartyName(e.target.value)}
                        style={{ padding: "12px 14px" }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: "0 16px" }}>
                        <Plus size={20} />
                        <span style={{ display: "none" }}>Add</span>
                    </button>
                </div>
            </form>

            {/* Search Input */}
            <div style={{ position: "relative", width: "100%" }}>
                <Search size={18} color="var(--text-muted)" style={{ position: "absolute", left: "14px", top: "14px" }} />
                <input
                    type="text"
                    className="form-input"
                    placeholder="Search active parties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: "42px", padding: "12px 42px" }}
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        style={{
                            position: "absolute",
                            right: "14px",
                            top: "14px",
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer"
                        }}
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Party Lists */}
            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                    <div className="spinner"></div>
                </div>
            ) : filteredParties.length === 0 ? (
                <div className="glass-panel" style={{ padding: "40px 20px", color: "var(--text-secondary)" }}>
                    <Users size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
                    <p>{searchQuery ? "No parties match your search query." : "No parties found. Create your first ledger above!"}</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {filteredParties.map((party) => (
                        <div
                            key={party._id}
                            className="glass-panel"
                            style={{
                                padding: "16px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                transition: "transform var(--transition-fast)"
                            }}
                        >
                            {renamingId === party._id ? (
                                <div style={{ display: "flex", gap: "8px", width: "100%", alignItems: "center" }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        style={{ padding: "8px 12px", height: "38px" }}
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => handleSaveRename(party.partyName)}
                                        className="btn btn-icon-only"
                                        style={{ width: "38px", height: "38px", color: "var(--success)" }}
                                    >
                                        <Check size={18} />
                                    </button>
                                    <button
                                        onClick={handleCancelRename}
                                        className="btn btn-icon-only"
                                        style={{ width: "38px", height: "38px", color: "var(--danger)" }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div 
                                        onClick={() => onSelectParty(party.partyName)}
                                        style={{ 
                                            textAlign: "left", 
                                            cursor: "pointer", 
                                            flexGrow: 1, 
                                            paddingRight: "16px" 
                                        }}
                                    >
                                        <div style={{ 
                                            fontFamily: "var(--font-heading)", 
                                            fontWeight: "600", 
                                            fontSize: "16px" 
                                        }}>
                                            {party.partyName}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                            Click to view items list
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                        <button
                                            onClick={() => handleStartRename(party)}
                                            className="btn btn-icon-only"
                                            style={{ width: "38px", height: "38px" }}
                                            title="Rename Party"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => onSelectParty(party.partyName)}
                                            className="btn btn-icon-only"
                                            style={{ width: "38px", height: "38px", background: "rgba(139,92,246,0.15)", borderColor: "var(--accent-glow)" }}
                                        >
                                            <ChevronRight size={18} color="var(--accent-light)" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
