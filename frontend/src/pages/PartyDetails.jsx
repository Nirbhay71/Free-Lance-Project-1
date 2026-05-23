import React, { useState, useEffect, useRef } from "react";
import API from "../api";
import { 
    ArrowLeft, Plus, Image as ImageIcon, CheckCircle2, AlertTriangle, 
    DollarSign, Trash2, Camera, Sliders, ChevronDown, ChevronUp, Save, Eye, X,
    BarChart3, Download, Calendar
} from "lucide-react";
import html2pdf from "html2pdf.js";

const PartyDetails = ({ partyName, onBack }) => {
    const reportRef = useRef(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterTab, setFilterTab] = useState("all"); // all, initial, completed, rejected
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Report States
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    const [partyReportData, setPartyReportData] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [reportError, setReportError] = useState("");
    
    // Add Item states
    const [showAddForm, setShowAddForm] = useState(false);
    const [color, setColor] = useState("");
    const [sizeLength, setSizeLength] = useState("");
    const [sizeWidth, setSizeWidth] = useState("");
    const [price, setPrice] = useState("");
    const [quantityArrived, setQuantityArrived] = useState("");
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const fileInputRef = useRef(null);
    const [addingItem, setAddingItem] = useState(false);

    // Modal Image Preview State
    const [previewImageUrl, setPreviewImageUrl] = useState(null);

    // Active Action States for Item Cards
    // Structure: { [itemId]: 'complete' | 'reject' | 'payment' | 'edit' | null }
    const [activeActionId, setActiveActionId] = useState(null);
    const [actionType, setActionType] = useState(null); // complete, reject, payment, edit
    
    // Action inputs
    const [actionValue, setActionValue] = useState("");
    const [editInputs, setEditInputs] = useState({
        color: "",
        size_length: "",
        size_width: "",
        price: ""
    });

    const fetchItems = async () => {
        try {
            setLoading(true);
            setError("");
            let url = `/items/party/${partyName}`;
            if (filterTab === "initial") url = `/items/initial-list/${partyName}`;
            else if (filterTab === "completed") url = `/items/completed-list/${partyName}`;
            else if (filterTab === "rejected") url = `/items/rejected-list/${partyName}`;

            const response = await API.get(url);
            if (response.data?.success) {
                setItems(response.data.data || []);
            }
        } catch (err) {
            // 404 is standard if no items are found for this tab, handle it cleanly
            if (err.response?.status === 404) {
                setItems([]);
            } else {
                setError("Failed to load items ledger.");
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchPartyReport = async (m, y) => {
        setLoadingReport(true);
        setReportError("");
        setPartyReportData(null);
        try {
            const response = await API.post(`/parties/report/single/${partyName}`, {
                month: Number(m),
                year: Number(y)
            });
            if (response.data?.success) {
                setPartyReportData(response.data.data);
            }
        } catch (err) {
            setReportError(err.response?.data?.message || "No report data found for this period.");
        } finally {
            setLoadingReport(false);
        }
    };

    const handleQuickReport = (type) => {
        const now = new Date();
        let m = now.getMonth() + 1;
        let y = now.getFullYear();

        if (type === "prev") {
            if (m === 1) {
                m = 12;
                y -= 1;
            } else {
                m -= 1;
            }
        }
        setReportMonth(m);
        setReportYear(y);
        fetchPartyReport(m, y);
    };

    const handleManualReportSubmit = (e) => {
        e.preventDefault();
        fetchPartyReport(reportMonth, reportYear);
    };

    const handleDownloadPDF = () => {
        const element = reportRef.current;
        if (!element) return;

        const opt = {
            margin:       [10, 10, 10, 10],
            filename:     `${partyName}_Report_${new Date(2000, reportMonth - 1).toLocaleString('default', { month: 'short' })}_${reportYear}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: '#0a0f1e'
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
    };

    useEffect(() => {
        fetchItems();
    }, [filterTab, partyName]);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleAddItemSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!color.trim() || !sizeLength || !sizeWidth || !price || !quantityArrived || !photoFile) {
            setError("All fields (including the item photo) are required.");
            return;
        }

        try {
            setAddingItem(true);
            const formData = new FormData();
            formData.append("color", color.trim());
            formData.append("size_length", sizeLength);
            formData.append("size_width", sizeWidth);
            formData.append("price", price);
            formData.append("quantityArrived", quantityArrived);
            formData.append("photo", photoFile);

            const response = await API.post(`/items/new/${partyName}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            if (response.data?.success) {
                setSuccess("New item added to party database!");
                setShowAddForm(false);
                // Reset fields
                setColor("");
                setSizeLength("");
                setSizeWidth("");
                setPrice("");
                setQuantityArrived("");
                setPhotoFile(null);
                setPhotoPreview(null);
                fetchItems();
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to upload and add item.";
            setError(msg);
        } finally {
            setAddingItem(false);
        }
    };

    const handleToggleAction = (item, type) => {
        if (activeActionId === item._id && actionType === type) {
            // Close if clicked again
            setActiveActionId(null);
            setActionType(null);
            setActionValue("");
        } else {
            setActiveActionId(item._id);
            setActionType(type);
            setActionValue("");
            if (type === "edit") {
                setEditInputs({
                    color: item.color,
                    size_length: item.size_length,
                    size_width: item.size_width,
                    price: item.price,
                    outgoingDate: item.outgoingDate ? new Date(item.outgoingDate).toISOString().split('T')[0] : "",
                    quantityCompleted: item.quantityCompleted || 0,
                    quantityRejected: item.quantityRejected || 0
                });
            } else if (type === "outgoing") {
                setActionValue(item.outgoingDate ? new Date(item.outgoingDate).toISOString().split('T')[0] : "");
            }
        }
    };

    const handleApplyAction = async (item) => {
        setError("");
        setSuccess("");
        const val = Number(actionValue);

        try {
            if (actionType === "complete") {
                if (isNaN(val) || val <= 0) {
                    setError("Please enter a valid positive quantity.");
                    return;
                }
                if (item.quantityCompleted + item.quantityRejected + val > item.quantityArrived) {
                    setError("Total completed + rejected cannot exceed the arrived quantity.");
                    return;
                }
                const res = await API.patch(`/items/completed/${item._id}`, { quantityCompleted: val });
                if (res.data?.success) {
                    setSuccess(`Marked ${val} units as Completed!`);
                    setActiveActionId(null);
                    fetchItems();
                }
            } 
            else if (actionType === "reject") {
                if (isNaN(val) || val <= 0) {
                    setError("Please enter a valid positive quantity.");
                    return;
                }
                if (item.quantityCompleted + item.quantityRejected + val > item.quantityArrived) {
                    setError("Total completed + rejected cannot exceed the arrived quantity.");
                    return;
                }
                const res = await API.patch(`/items/rejected/${item._id}`, { quantityRejected: val });
                if (res.data?.success) {
                    setSuccess(`Marked ${val} units as Rejected!`);
                    setActiveActionId(null);
                    fetchItems();
                }
            } 
            else if (actionType === "payment") {
                if (isNaN(val) || val <= 0) {
                    setError("Please enter a valid payment amount.");
                    return;
                }
                const res = await API.patch(`/items/payment/${item._id}`, { paymentReceived: val });
                if (res.data?.success) {
                    setSuccess(`Recorded payment of ₹${val}!`);
                    setActiveActionId(null);
                    fetchItems();
                }
            }
            else if (actionType === "outgoing") {
                const res = await API.patch(`/items/outgoing-date/${item._id}`, { outgoingDate: actionValue || null });
                if (res.data?.success) {
                    setSuccess(actionValue ? `Outgoing date set to ${actionValue}!` : `Cleared outgoing date!`);
                    setActiveActionId(null);
                    fetchItems();
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || "Operation failed.");
        }
    };

    const handleApplyEdit = async (item) => {
        setError("");
        setSuccess("");
        
        try {
            // We need to check which fields changed and call their respective endpoints
            let updated = false;

            if (editInputs.color !== item.color) {
                await API.patch(`/items/color/${item._id}`, { color: editInputs.color });
                updated = true;
            }
            if (Number(editInputs.size_length) !== item.size_length) {
                await API.patch(`/items/size-length/${item._id}`, { size_length: Number(editInputs.size_length) });
                updated = true;
            }
            if (Number(editInputs.size_width) !== item.size_width) {
                await API.patch(`/items/size-width/${item._id}`, { size_width: Number(editInputs.size_width) });
                updated = true;
            }
            if (Number(editInputs.price) !== item.price) {
                await API.patch(`/items/price/${item._id}`, { price: Number(editInputs.price) });
                updated = true;
            }
            
            const itemOutgoingYMD = item.outgoingDate ? new Date(item.outgoingDate).toISOString().split('T')[0] : "";
            if (editInputs.outgoingDate !== itemOutgoingYMD) {
                await API.patch(`/items/outgoing-date/${item._id}`, { outgoingDate: editInputs.outgoingDate || null });
                updated = true;
            }

            if (Number(editInputs.quantityCompleted) !== (item.quantityCompleted || 0)) {
                await API.patch(`/items/completed/${item._id}`, { quantityCompleted: Number(editInputs.quantityCompleted), isAbsolute: true });
                updated = true;
            }
            if (Number(editInputs.quantityRejected) !== (item.quantityRejected || 0)) {
                await API.patch(`/items/rejected/${item._id}`, { quantityRejected: Number(editInputs.quantityRejected), isAbsolute: true });
                updated = true;
            }

            if (updated) {
                setSuccess("Item details updated successfully!");
                setActiveActionId(null);
                fetchItems();
            } else {
                setActiveActionId(null);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update item details.");
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm("Are you sure you want to permanently delete this item? This will also remove the image from Cloudinary.")) {
            return;
        }

        setError("");
        setSuccess("");
        try {
            const res = await API.delete(`/items/delete/${itemId}`);
            if (res.data?.success) {
                setSuccess("Item deleted successfully!");
                fetchItems();
            }
        } catch (err) {
            setError("Failed to delete item.");
        }
    };

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button onClick={onBack} className="btn btn-icon-only" style={{ width: "40px", height: "40px" }}>
                    <ArrowLeft size={20} />
                </button>
                <div style={{ flexGrow: 1 }}>
                    <h1 className="page-title" style={{ fontSize: "22px" }}>{partyName}</h1>
                    <p className="page-subtitle">Batch Items & Quantity ledger</p>
                </div>
                {/* Report Generation Button */}
                <button 
                    onClick={() => {
                        setShowReportModal(true);
                        handleQuickReport("this");
                    }} 
                    className="btn btn-secondary" 
                    style={{ height: "40px", minHeight: "40px", padding: "0 10px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                    <BarChart3 size={16} />
                    <span style={{ fontSize: "13px" }}>Report</span>
                </button>

                <button 
                    onClick={() => setShowAddForm(!showAddForm)} 
                    className="btn btn-primary" 
                    style={{ height: "40px", minHeight: "40px", padding: "0 12px" }}
                >
                    <Plus size={18} />
                    <span>New Item</span>
                </button>
            </div>

            {/* Success & Error Banners */}
            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="alert alert-success" style={{ marginBottom: 0 }}>
                    <span>{success}</span>
                </div>
            )}

            {/* Add New Item Form Overlay / Accordion */}
            {showAddForm && (
                <form onSubmit={handleAddItemSubmit} className="glass-panel glass-panel-glow animate-fade-in" style={{
                    padding: "20px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px"
                }}>
                    <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "16px", textAlign: "left" }}>
                        Upload New Production Item
                    </h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Color</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Red, Blue, etc."
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Price (per Sq. Ft)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="₹ Price"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Length (in)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="L"
                                value={sizeLength}
                                onChange={(e) => setSizeLength(e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Width (in)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="W"
                                value={sizeWidth}
                                onChange={(e) => setSizeWidth(e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Quantity</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="Arrived"
                                value={quantityArrived}
                                onChange={(e) => setQuantityArrived(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Camera / File upload field */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Item Photo</label>
                        <div className="file-upload-wrapper">
                            <Camera size={24} color="var(--accent-light)" style={{ marginBottom: "8px" }} />
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                                {photoFile ? photoFile.name : "Capture Image / Upload Photo"}
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                                Tap to open mobile camera or gallery
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="file-upload-input"
                                onChange={handlePhotoChange}
                                ref={fileInputRef}
                            />
                        </div>
                        {photoPreview && (
                            <div style={{ position: "relative", width: "100%", height: "150px", marginTop: "12px", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                                <img src={photoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPhotoFile(null);
                                        setPhotoPreview(null);
                                    }}
                                    style={{
                                        position: "absolute",
                                        top: "8px",
                                        right: "8px",
                                        background: "rgba(0,0,0,0.6)",
                                        border: "none",
                                        borderRadius: "50%",
                                        width: "28px",
                                        height: "28px",
                                        color: "white",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                        <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }} disabled={addingItem}>
                            {addingItem ? (
                                <div className="spinner" style={{ width: "20px", height: "20px", borderWidth: "2px" }}></div>
                            ) : "Upload and Save"}
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={() => {
                                setShowAddForm(false);
                                setPhotoFile(null);
                                setPhotoPreview(null);
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Filter Tabs (Horizontal Scroll on Mobile) */}
            <div style={{
                display: "flex",
                overflowX: "auto",
                gap: "8px",
                paddingBottom: "4px"
            }}>
                {[
                    { id: "all", label: "All Items" },
                    { id: "initial", label: "Pending" },
                    { id: "completed", label: "Completed" },
                    { id: "rejected", label: "Rejected" }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterTab(tab.id)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "20px",
                            border: "1px solid",
                            borderColor: filterTab === tab.id ? "var(--accent-light)" : "var(--border-color)",
                            background: filterTab === tab.id ? "rgba(139,92,246,0.15)" : "rgba(15,23,42,0.4)",
                            color: filterTab === tab.id ? "var(--accent-light)" : "var(--text-secondary)",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            transition: "all var(--transition-fast)"
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Items Grid/List */}
            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                    <div className="spinner"></div>
                </div>
            ) : items.length === 0 ? (
                <div className="glass-panel" style={{ padding: "40px 20px", color: "var(--text-secondary)" }}>
                    <ImageIcon size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
                    <p>No items found matching the selected filter.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {items.map(item => {
                        const isPending = item.quantityArrived !== (item.quantityCompleted + item.quantityRejected);
                        return (
                            <div 
                                key={item._id} 
                                className="glass-panel animate-fade-in"
                                style={{
                                    padding: "16px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "12px",
                                    position: "relative"
                                }}
                            >
                                {/* Core Card Info */}
                                <div style={{ display: "flex", gap: "12px" }}>
                                    {/* Left: Image Thumbnail with Preview click handler */}
                                    <div 
                                        onClick={() => setPreviewImageUrl(item.photo)}
                                        style={{ 
                                            width: "80px", 
                                            height: "80px", 
                                            borderRadius: "var(--radius-sm)", 
                                            overflow: "hidden", 
                                            cursor: "zoom-in",
                                            position: "relative",
                                            flexShrink: 0
                                        }}
                                    >
                                        <img 
                                            src={item.photo} 
                                            alt="Item" 
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                        />
                                        <div style={{
                                            position: "absolute",
                                            bottom: "2px",
                                            right: "2px",
                                            background: "rgba(0,0,0,0.6)",
                                            borderRadius: "50%",
                                            width: "18px",
                                            height: "18px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "white"
                                        }}>
                                            <Eye size={10} />
                                        </div>
                                    </div>

                                    {/* Right: Text Specifications */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexGrow: 1, textAlign: "left" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                                                {item.color} Item
                                            </span>
                                            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent-light)" }}>
                                                ₹{item.price}/sqft
                                            </span>
                                        </div>
                                        
                                        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                            Dimensions: <strong>{item.size_length}L × {item.size_width}W</strong> inches
                                        </div>
                                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                            Outgoing Date: <strong style={{ color: item.outgoingDate ? "var(--success)" : "var(--warning)" }}>
                                                {item.outgoingDate ? new Date(item.outgoingDate).toLocaleDateString() : "Not Dispatched"}
                                            </strong>
                                        </div>

                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                                            <span className="badge badge-warning" style={{ fontSize: "10px", padding: "2px 6px" }}>
                                                Arrived: {item.quantityArrived}
                                            </span>
                                            {item.quantityCompleted > 0 && (
                                                <span className="badge badge-success" style={{ fontSize: "10px", padding: "2px 6px" }}>
                                                    Done: {item.quantityCompleted}
                                                </span>
                                            )}
                                            {item.quantityRejected > 0 && (
                                                <span className="badge badge-danger" style={{ fontSize: "10px", padding: "2px 6px" }}>
                                                    Fail: {item.quantityRejected}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Divider line */}
                                <div style={{ borderTop: "1px solid var(--border-color)", margin: "4px 0" }}></div>

                                {/* Financial Tracking Status */}
                                <div style={{ 
                                    display: "flex", 
                                    justifyContent: "space-between", 
                                    fontSize: "13px", 
                                    background: "rgba(15,23,42,0.3)", 
                                    padding: "8px 12px", 
                                    borderRadius: "var(--radius-sm)" 
                                }}>
                                    <span style={{ color: "var(--text-secondary)" }}>
                                        Received: <strong>₹{item.paymentReceived}</strong>
                                    </span>
                                    {isPending ? (
                                        <span style={{ color: "var(--warning)" }}>
                                            Pending Process
                                        </span>
                                    ) : (
                                        <span style={{ color: "var(--success)", fontWeight: "600" }}>
                                            Fully Processed
                                        </span>
                                    )}
                                </div>

                                {/* Action Buttons Panel (Quick triggers) */}
                                <div style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
                                    <button 
                                        onClick={() => handleToggleAction(item, "complete")} 
                                        className="btn btn-secondary" 
                                        style={{ height: "36px", minHeight: "36px", padding: "0 10px", flexGrow: 1, fontSize: "12px" }}
                                    >
                                        <CheckCircle2 size={14} color="var(--success)" />
                                        Complete
                                    </button>
                                    <button 
                                        onClick={() => handleToggleAction(item, "reject")} 
                                        className="btn btn-secondary" 
                                        style={{ height: "36px", minHeight: "36px", padding: "0 10px", flexGrow: 1, fontSize: "12px" }}
                                    >
                                        <AlertTriangle size={14} color="var(--danger)" />
                                        Reject
                                    </button>
                                    <button 
                                        onClick={() => handleToggleAction(item, "payment")} 
                                        className="btn btn-secondary" 
                                        style={{ height: "36px", minHeight: "36px", padding: "0 10px", flexGrow: 1, fontSize: "12px" }}
                                    >
                                        <DollarSign size={14} color="gold" />
                                        Payment
                                    </button>
                                    <button 
                                        onClick={() => handleToggleAction(item, "outgoing")} 
                                        className="btn btn-secondary" 
                                        style={{ height: "36px", minHeight: "36px", padding: "0 10px", flexGrow: 1, fontSize: "12px" }}
                                    >
                                        <Calendar size={14} color="var(--accent-light)" />
                                        Outgoing
                                    </button>
                                    <button 
                                        onClick={() => handleToggleAction(item, "edit")} 
                                        className="btn btn-secondary" 
                                        style={{ height: "36px", minHeight: "36px", padding: "0 10px", fontSize: "12px" }}
                                    >
                                        <Sliders size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteItem(item._id)} 
                                        className="btn btn-secondary" 
                                        style={{ height: "36px", minHeight: "36px", padding: "0 10px", color: "var(--danger)" }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {/* Expanded form section for action buttons */}
                                {activeActionId === item._id && (
                                    <div className="glass-panel animate-fade-in" style={{
                                        background: "rgba(15,23,42,0.6)",
                                        padding: "12px",
                                        marginTop: "8px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "10px"
                                    }}>
                                        {actionType === "complete" && (
                                            <>
                                                <div style={{ fontSize: "13px", fontWeight: "600", textAlign: "left" }}>Record Completed Quantity</div>
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <input 
                                                        type="number" 
                                                        className="form-input" 
                                                        placeholder="Number of units completed" 
                                                        value={actionValue}
                                                        onChange={(e) => setActionValue(e.target.value)}
                                                        style={{ padding: "8px 12px", height: "38px" }}
                                                    />
                                                    <button onClick={() => handleApplyAction(item)} className="btn btn-primary" style={{ height: "38px", minHeight: "38px", padding: "0 14px" }}>
                                                        Save
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {actionType === "reject" && (
                                            <>
                                                <div style={{ fontSize: "13px", fontWeight: "600", textAlign: "left" }}>Record Rejected / Damaged Quantity</div>
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <input 
                                                        type="number" 
                                                        className="form-input" 
                                                        placeholder="Number of units rejected" 
                                                        value={actionValue}
                                                        onChange={(e) => setActionValue(e.target.value)}
                                                        style={{ padding: "8px 12px", height: "38px" }}
                                                    />
                                                    <button onClick={() => handleApplyAction(item)} className="btn btn-danger" style={{ height: "38px", minHeight: "38px", padding: "0 14px" }}>
                                                        Reject
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {actionType === "payment" && (
                                            <>
                                                <div style={{ fontSize: "13px", fontWeight: "600", textAlign: "left" }}>Add Payment Received</div>
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <input 
                                                        type="number" 
                                                        className="form-input" 
                                                        placeholder="Amount in ₹" 
                                                        value={actionValue}
                                                        onChange={(e) => setActionValue(e.target.value)}
                                                        style={{ padding: "8px 12px", height: "38px" }}
                                                    />
                                                    <button onClick={() => handleApplyAction(item)} className="btn btn-primary" style={{ height: "38px", minHeight: "38px", padding: "0 14px" }}>
                                                        Record
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {actionType === "outgoing" && (
                                            <>
                                                <div style={{ fontSize: "13px", fontWeight: "600", textAlign: "left" }}>Set Outgoing Date (Dispatch Item)</div>
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <input 
                                                        type="date" 
                                                        className="form-input" 
                                                        value={actionValue}
                                                        onChange={(e) => setActionValue(e.target.value)}
                                                        style={{ padding: "8px 12px", height: "38px" }}
                                                    />
                                                    <button onClick={() => handleApplyAction(item)} className="btn btn-primary" style={{ height: "38px", minHeight: "38px", padding: "0 14px" }}>
                                                        Save
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {actionType === "edit" && (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                                <div style={{ fontSize: "13px", fontWeight: "600", textAlign: "left" }}>Edit Item Details</div>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                                    <input 
                                                        type="text" 
                                                        className="form-input" 
                                                        placeholder="Color"
                                                        value={editInputs.color}
                                                        onChange={(e) => setEditInputs({...editInputs, color: e.target.value})}
                                                        style={{ padding: "8px 12px", height: "38px" }}
                                                    />
                                                    <input 
                                                        type="number" 
                                                        className="form-input" 
                                                        placeholder="Price"
                                                        value={editInputs.price}
                                                        onChange={(e) => setEditInputs({...editInputs, price: e.target.value})}
                                                        style={{ padding: "8px 12px", height: "38px" }}
                                                    />
                                                </div>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                                    <input 
                                                        type="number" 
                                                        className="form-input" 
                                                        placeholder="Length"
                                                        value={editInputs.size_length}
                                                        onChange={(e) => setEditInputs({...editInputs, size_length: e.target.value})}
                                                        style={{ padding: "8px 12px", height: "38px" }}
                                                    />
                                                    <input 
                                                        type="number" 
                                                        className="form-input" 
                                                        placeholder="Width"
                                                        value={editInputs.size_width}
                                                        onChange={(e) => setEditInputs({...editInputs, size_width: e.target.value})}
                                                        style={{ padding: "8px 12px", height: "38px" }}
                                                    />
                                                </div>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "left", marginBottom: "8px" }}>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", textAlign: "left", marginBottom: "8px" }}>
                                                     <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                         <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Total Completed</label>
                                                         <input 
                                                             type="number" 
                                                             className="form-input" 
                                                             value={editInputs.quantityCompleted}
                                                             onChange={(e) => setEditInputs({...editInputs, quantityCompleted: e.target.value})}
                                                             style={{ padding: "8px 12px", height: "38px" }}
                                                         />
                                                     </div>
                                                     <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                         <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Total Rejected</label>
                                                         <input 
                                                             type="number" 
                                                             className="form-input" 
                                                             value={editInputs.quantityRejected}
                                                             onChange={(e) => setEditInputs({...editInputs, quantityRejected: e.target.value})}
                                                             style={{ padding: "8px 12px", height: "38px" }}
                                                         />
                                                     </div>
                                                 </div>
                                                    <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Outgoing Date</label>
                                                    <input 
                                                        type="date" 
                                                        className="form-input" 
                                                        value={editInputs.outgoingDate || ""}
                                                        onChange={(e) => setEditInputs({...editInputs, outgoingDate: e.target.value})}
                                                        style={{ padding: "8px 12px", height: "38px" }}
                                                    />
                                                </div>
                                                <button onClick={() => handleApplyEdit(item)} className="btn btn-primary" style={{ width: "100%", height: "38px", minHeight: "38px" }}>
                                                    <Save size={16} /> Save Changes
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Image Zoom Viewer */}
            {previewImageUrl && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0, 0, 0, 0.95)",
                    zIndex: 1000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px"
                }}>
                    <button 
                        onClick={() => setPreviewImageUrl(null)} 
                        style={{
                            position: "absolute",
                            top: "24px",
                            right: "24px",
                            background: "rgba(255,255,255,0.15)",
                            border: "none",
                            borderRadius: "50%",
                            width: "44px",
                            height: "44px",
                            color: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <X size={24} />
                    </button>
                    <img 
                        src={previewImageUrl} 
                        alt="Zoom Preview" 
                        style={{
                            maxWidth: "100%",
                            maxHeight: "85%",
                            borderRadius: "var(--radius-md)",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
                        }}
                    />
                </div>
            )}

            {/* Modal Single Party Report */}
            {showReportModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(10, 15, 30, 0.96)",
                    backdropFilter: "blur(12px)",
                    zIndex: 1000,
                    display: "flex",
                    flexDirection: "column",
                    padding: "20px 16px",
                    overflowY: "auto",
                }} className="animate-fade-in">
                    {/* Modal Header */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: "12px",
                        borderBottom: "1px solid var(--border-color)",
                        marginBottom: "16px"
                    }}>
                        <div style={{ textAlign: "left" }}>
                            <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "18px", color: "var(--text-primary)" }}>
                                {partyName} Report
                            </h2>
                            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                                Monthly Billing & Production Analytics
                            </p>
                        </div>
                        <button 
                            onClick={() => {
                                setShowReportModal(false);
                                setPartyReportData(null);
                                setReportError("");
                            }} 
                            style={{
                                background: "rgba(255,255,255,0.08)",
                                border: "none",
                                borderRadius: "50%",
                                width: "36px",
                                height: "36px",
                                color: "var(--text-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer"
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Quick Selection Buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                        <button 
                            onClick={() => handleQuickReport("this")}
                            className="btn btn-secondary" 
                            style={{ height: "40px", fontSize: "13px", background: "rgba(139,92,246,0.15)" }}
                        >
                            This Month
                        </button>
                        <button 
                            onClick={() => handleQuickReport("prev")}
                            className="btn btn-secondary" 
                            style={{ height: "40px", fontSize: "13px", background: "rgba(139,92,246,0.15)" }}
                        >
                            Previous Month
                        </button>
                    </div>

                    {/* Manual Month/Year Selection Form */}
                    <form onSubmit={handleManualReportSubmit} className="glass-panel" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            <div className="form-group" style={{ marginBottom: 0, textAlign: "left" }}>
                                <label className="form-label" style={{ fontSize: "11px" }}>Month</label>
                                <select 
                                    value={reportMonth} 
                                    onChange={(e) => setReportMonth(e.target.value)} 
                                    className="form-input"
                                    style={{ height: "38px", padding: "4px 8px", background: "var(--bg-primary)" }}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0, textAlign: "left" }}>
                                <label className="form-label" style={{ fontSize: "11px" }}>Year</label>
                                <input 
                                    type="number" 
                                    value={reportYear} 
                                    onChange={(e) => setReportYear(e.target.value)} 
                                    className="form-input" 
                                    style={{ height: "38px", padding: "4px 8px" }}
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: "100%", height: "38px" }}>
                            Fetch Custom Report
                        </button>
                    </form>

                    {/* Report Content Loading / Data Display */}
                    {loadingReport && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: "12px" }}>
                            <div className="spinner"></div>
                            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Compiling ledger data...</span>
                        </div>
                    )}

                    {reportError && (
                        <div className="alert alert-danger" style={{ marginTop: "8px" }}>
                            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                            <span style={{ textAlign: "left" }}>{reportError}</span>
                        </div>
                    )}

                    {partyReportData && (
                        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {/* Download PDF Button */}
                            <button 
                                onClick={handleDownloadPDF} 
                                className="btn btn-primary" 
                                style={{ width: "100%", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                            >
                                <Download size={16} />
                                <span>Download PDF Report</span>
                            </button>

                            {/* Printable Report Container */}
                            <div ref={reportRef} style={{ 
                                display: "flex", 
                                flexDirection: "column", 
                                gap: "16px",
                                padding: "16px 12px",
                                background: "#0a0f1e",
                                borderRadius: "8px"
                            }}>
                                {/* Period Title */}
                                <div style={{ textAlign: "left", fontSize: "14px", fontWeight: "700", color: "var(--accent-light)" }}>
                                    Report Period: {new Date(2000, reportMonth - 1).toLocaleString('default', { month: 'long' })} {reportYear}
                                </div>

                                {/* Billing Statistics Grid */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                    <div className="glass-panel" style={{ padding: "12px", borderLeft: "4px solid var(--accent-light)", textAlign: "left" }}>
                                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Total Billing</div>
                                        <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "4px" }}>₹{partyReportData.totalCost}</div>
                                    </div>
                                    <div className="glass-panel" style={{ padding: "12px", borderLeft: "4px solid var(--success)", textAlign: "left" }}>
                                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Received</div>
                                        <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "4px", color: "var(--success)" }}>₹{partyReportData.totalPaymentReceived}</div>
                                    </div>
                                </div>

                                <div className="glass-panel" style={{ padding: "12px 16px", borderLeft: "4px solid var(--warning)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ textAlign: "left" }}>
                                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Balance Outstanding</div>
                                        <div style={{ fontSize: "20px", fontWeight: "800", marginTop: "4px", color: "var(--warning)" }}>₹{partyReportData.totalPaymentPending}</div>
                                    </div>
                                    <DollarSign size={24} color="var(--warning)" style={{ opacity: 0.6 }} />
                                </div>

                                {/* Production Statistics Grid */}
                                <h3 style={{ margin: "8px 0 0 0", fontSize: "14px", fontFamily: "var(--font-heading)", textAlign: "left" }}>
                                    Production Volume Breakdown
                                </h3>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                    <div className="glass-panel" style={{ padding: "10px", textAlign: "left" }}>
                                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Arrived</span>
                                        <div style={{ fontSize: "16px", fontWeight: "700" }}>{partyReportData.totalQuantityArrived} pcs</div>
                                    </div>
                                    <div className="glass-panel" style={{ padding: "10px", textAlign: "left" }}>
                                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Completed</span>
                                        <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--success)" }}>{partyReportData.totalQuantityCompleted} pcs</div>
                                    </div>
                                    <div className="glass-panel" style={{ padding: "10px", textAlign: "left" }}>
                                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Rejected</span>
                                        <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--danger)" }}>{partyReportData.totalQuantityRejected} pcs</div>
                                    </div>
                                    <div className="glass-panel" style={{ padding: "10px", textAlign: "left" }}>
                                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Pending Process</span>
                                        <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--warning)" }}>{partyReportData.totalQuantityPending} pcs</div>
                                    </div>
                                </div>

                                {/* Detailed Items List */}
                                {partyReportData.items && partyReportData.items.length > 0 && (
                                    <>
                                        <h3 style={{ margin: "8px 0 0 0", fontSize: "14px", fontFamily: "var(--font-heading)", textAlign: "left" }}>
                                            Item Ledger Details ({partyReportData.items.length})
                                        </h3>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            {partyReportData.items.map((item, idx) => (
                                                <div key={item._id || idx} className="glass-panel" style={{ padding: "10px 12px", display: "flex", gap: "10px", alignItems: "center" }}>
                                                    {item.photo && (
                                                        <img src={item.photo} alt="Item" style={{ width: "36px", height: "36px", borderRadius: "4px", objectFit: "cover" }} />
                                                    )}
                                                    <div style={{ flexGrow: 1, textAlign: "left", fontSize: "12px" }}>
                                                        <div style={{ fontWeight: "700" }}>{item.color} - {item.size_length}x{item.size_width}</div>
                                                        <div style={{ color: "var(--text-secondary)" }}>
                                                            Done: {item.quantityCompleted} | Fail: {item.quantityRejected} | Pend: {item.quantityPending}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: "right", fontSize: "12px" }}>
                                                        <div style={{ fontWeight: "700", color: "var(--accent-light)" }}>₹{item.itemCost}</div>
                                                        {item.pendingPayment > 0 && (
                                                            <div style={{ color: "var(--warning)", fontSize: "10px" }}>Due: ₹{item.pendingPayment}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PartyDetails;
