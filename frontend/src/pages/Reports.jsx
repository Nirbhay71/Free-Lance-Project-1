import React, { useState, useEffect } from "react";
import API from "../api";
import { 
    Calendar, FileText, TrendingUp, AlertCircle, DollarSign, 
    Activity, ChevronRight, Download, BarChart2, ShieldAlert
} from "lucide-react";

const Reports = () => {
    const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12
    const [year, setYear] = useState(new Date().getFullYear());
    const [parties, setParties] = useState([]);
    
    // Select report type: "single" | "all"
    const [reportType, setReportType] = useState("all");
    const [selectedParty, setSelectedParty] = useState("");
    
    // Loaded reports data
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    const formatDateTime = (dateString) => {
        if (!dateString) return "";
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutes = String(d.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes} ${ampm} ${day}/${month}/${year}`;
    };

    const [error, setError] = useState("");

    // Load available parties for single party selection dropdown
    useEffect(() => {
        const fetchParties = async () => {
            try {
                const response = await API.get("/parties/all");
                if (response.data?.success) {
                    setParties(response.data.data || []);
                    if (response.data.data?.length > 0) {
                        setSelectedParty(response.data.data[0].partyName);
                    }
                }
            } catch (err) {
                console.error("Failed to load parties for reports:", err);
            }
        };
        fetchParties();
    }, []);

    const handleGenerateReport = async (e) => {
        if (e) e.preventDefault();
        setError("");
        setReportData(null);
        setLoading(true);

        try {
            if (reportType === "single") {
                if (!selectedParty) {
                    setError("Please select a party.");
                    setLoading(false);
                    return;
                }
                const response = await API.post(`/parties/report/single/${selectedParty}`, {
                    month: Number(month),
                    year: Number(year)
                });
                if (response.data?.success) {
                    setReportData(response.data.data);
                }
            } else {
                const response = await API.post("/parties/report/all", {
                    month: Number(month),
                    year: Number(year)
                });
                if (response.data?.success) {
                    setReportData(response.data.data);
                }
            }
        } catch (err) {
            const msg = err.response?.data?.message || "No ledger items found for the selected month/year.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch report on tab change or month/year change
    useEffect(() => {
        handleGenerateReport();
    }, [reportType, month, year, selectedParty]);

    // Helpers to convert month number to string
    const monthsList = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Header */}
            <div>
                <h1 className="page-title">Financial Reports</h1>
                <p className="page-subtitle">Month-by-month billing and production analytics</p>
            </div>

            {/* Config Panel */}
            <div className="glass-panel" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Switch between Single or All Parties */}
                <div style={{ display: "flex", background: "rgba(15,23,42,0.4)", borderRadius: "var(--radius-sm)", padding: "4px" }}>
                    <button
                        onClick={() => setReportType("all")}
                        style={{
                            flexGrow: 1,
                            padding: "8px",
                            border: "none",
                            borderRadius: "4px",
                            background: reportType === "all" ? "var(--accent)" : "none",
                            color: "white",
                            fontWeight: "600",
                            fontSize: "13px",
                            cursor: "pointer",
                            transition: "all var(--transition-fast)"
                        }}
                    >
                        All Parties
                    </button>
                    <button
                        onClick={() => setReportType("single")}
                        style={{
                            flexGrow: 1,
                            padding: "8px",
                            border: "none",
                            borderRadius: "4px",
                            background: reportType === "single" ? "var(--accent)" : "none",
                            color: "white",
                            fontWeight: "600",
                            fontSize: "13px",
                            cursor: "pointer",
                            transition: "all var(--transition-fast)"
                        }}
                    >
                        Single Party
                    </button>
                </div>

                {/* Dropdowns for Month, Year, and Party */}
                <div style={{ display: "grid", gridTemplateColumns: reportType === "single" ? "1fr 1fr" : "1fr 1fr", gap: "8px" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Month</label>
                        <select 
                            className="form-input" 
                            value={month} 
                            onChange={(e) => setMonth(e.target.value)}
                            style={{ height: "46px", padding: "8px 12px", background: "rgba(15,23,42,0.6)" }}
                        >
                            {monthsList.map((mName, idx) => (
                                <option key={idx} value={idx + 1} style={{ background: "var(--bg-secondary)" }}>{mName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Year</label>
                        <select 
                            className="form-input" 
                            value={year} 
                            onChange={(e) => setYear(e.target.value)}
                            style={{ height: "46px", padding: "8px 12px", background: "rgba(15,23,42,0.6)" }}
                        >
                            {[2025, 2026, 2027, 2028].map(yr => (
                                <option key={yr} value={yr} style={{ background: "var(--bg-secondary)" }}>{yr}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {reportType === "single" && (
                    <div className="form-group animate-fade-in" style={{ marginBottom: 0 }}>
                        <label className="form-label">Select Party</label>
                        <select 
                            className="form-input" 
                            value={selectedParty} 
                            onChange={(e) => setSelectedParty(e.target.value)}
                            style={{ height: "46px", padding: "8px 12px", background: "rgba(15,23,42,0.6)" }}
                        >
                            {parties.map(p => (
                                <option key={p._id} value={p.partyName} style={{ background: "var(--bg-secondary)" }}>{p.partyName}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="alert alert-danger" style={{ textAlign: "left" }}>
                    <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                </div>
            )}

            {/* Loading Indicator */}
            {loading && (
                <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
                    <div className="spinner"></div>
                </div>
            )}

            {/* Report Output Content */}
            {!loading && reportData && (
                <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {reportType === "all" ? (
                        /* MULTI-PARTY SUMMARY REPORT DISPLAY */
                        <>
                            {/* Summary Financial Cards */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div className="glass-panel" style={{ padding: "16px", textAlign: "left" }}>
                                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Total Billings</div>
                                    <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--success)", marginTop: "4px" }}>
                                        ₹{reportData.grandTotalCost || 0}
                                    </div>
                                </div>
                                <div className="glass-panel" style={{ padding: "16px", textAlign: "left" }}>
                                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Total Outstanding</div>
                                    <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--danger)", marginTop: "4px" }}>
                                        ₹{reportData.grandTotalPaymentPending || 0}
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel" style={{ padding: "16px", textAlign: "left" }}>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Summary Metrics</div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "13px" }}>
                                    <span>Parties Count: <strong>{reportData.parties?.length || 0}</strong></span>
                                    <span>Rejections Value: <strong>₹{reportData.grandTotalRejectedCost || 0}</strong></span>
                                </div>
                            </div>

                            {/* Parties Card List */}
                            <h3 style={{ margin: "10px 0 0 0", fontSize: "16px", fontWeight: "700", textAlign: "left", fontFamily: "var(--font-heading)" }}>
                                Party Breakdown List
                            </h3>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {reportData.parties?.map((pReport, idx) => (
                                    <div key={idx} className="glass-panel" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontFamily: "var(--font-heading)", fontWeight: "600", fontSize: "15px" }}>
                                                {pReport.partyName}
                                            </span>
                                            {pReport.totalQuantityPending > 0 ? (
                                                <span className="badge badge-warning" style={{ fontSize: "9px" }}>
                                                    {pReport.totalQuantityPending} Pending
                                                </span>
                                            ) : (
                                                <span className="badge badge-success" style={{ fontSize: "9px" }}>
                                                    Done
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ borderTop: "1px solid var(--border-color)", margin: "4px 0" }}></div>

                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", textAlign: "left" }}>
                                            <div>Billings: <strong>₹{pReport.totalCost}</strong></div>
                                            <div>Received: <strong>₹{pReport.paymentReceived}</strong></div>
                                            <div>Rejections: <strong>₹{pReport.totalRejectedCost}</strong></div>
                                            <div style={{ color: pReport.paymentPending > 0 ? "var(--danger)" : "var(--success)" }}>
                                                Due: <strong>₹{pReport.paymentPending}</strong>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        /* SINGLE PARTY DETAILED REPORT DISPLAY */
                        <>
                            {/* General Stats */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div className="glass-panel" style={{ padding: "16px", textAlign: "left" }}>
                                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Total Earned</div>
                                    <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--success)", marginTop: "4px" }}>
                                        ₹{reportData.totalCost || 0}
                                    </div>
                                </div>
                                <div className="glass-panel" style={{ padding: "16px", textAlign: "left" }}>
                                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Outstanding Balance</div>
                                    <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--danger)", marginTop: "4px" }}>
                                        ₹{reportData.totalPaymentPending || 0}
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", textAlign: "left" }}>
                                <div>Total Received Payment: <strong>₹{reportData.totalPaymentReceived || 0}</strong></div>
                                <div>Total Cost of Rejected items: <strong>₹{reportData.totalRejectedCost || 0}</strong></div>
                                <div>Total Arrived items: <strong>{reportData.totalQuantityArrived || 0} units</strong></div>
                                <div>Total Pending Work: <strong>{reportData.totalQuantityPending || 0} units</strong></div>
                            </div>

                            {/* Item Ledger Details */}
                            <h3 style={{ margin: "10px 0 0 0", fontSize: "16px", fontWeight: "700", textAlign: "left", fontFamily: "var(--font-heading)" }}>
                                Ledger Items Detail
                            </h3>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {reportData.items?.length === 0 ? (
                                    <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>No items recorded.</div>
                                ) : (
                                    reportData.items?.map((item, idx) => (
                                        <div key={idx} className="glass-panel" style={{ padding: "12px", display: "flex", gap: "12px" }}>
                                            {item.photo && (
                                                <img 
                                                    src={item.photo} 
                                                    alt="item" 
                                                    style={{ width: "60px", height: "60px", borderRadius: "var(--radius-sm)", objectFit: "cover" }} 
                                                />
                                            )}
                                            <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexGrow: 1, textAlign: "left" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "600" }}>
                                                    <span>{item.color}</span>
                                                    <span style={{ color: "var(--accent-light)" }}>₹{item.price}/sqft</span>
                                                </div>
                                                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                                    Size: {item.size_length}L × {item.size_width}W in
                                                </div>
                                                {item.outgoingDate && (
                                                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                                        Outgoing: <strong>{formatDateTime(item.outgoingDate)}</strong>
                                                    </div>
                                                )}
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                                                    <span>Done: {item.quantityCompleted} | Fail: {item.quantityRejected}</span>
                                                    <span>Paid: ₹{item.paymentReceived}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Reports;
