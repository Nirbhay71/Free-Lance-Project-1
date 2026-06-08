import React, { useState, useEffect, useRef } from "react";
import API from "../api";
import {
    ArrowLeft, Plus, Image as ImageIcon, CheckCircle2, AlertTriangle,
    DollarSign, Trash2, Camera, Sliders, Save, Eye, X,
    BarChart3, Download, Calendar, Pencil, Package, ChevronDown, ChevronUp
} from "lucide-react";
import html2pdf from "html2pdf.js";

const COLORS = ["gold", "rose gold", "black"];
const colorDot = (c) => c === "gold" ? "#ffd700" : c === "rose gold" ? "#b76e79" : "#222";

const ColorPicker = ({ value, onChange, name }) => (
    <div style={{ display: "flex", gap: "8px" }}>
        {COLORS.map(c => {
            const sel = value === c;
            const dot = colorDot(c);
            return (
                <label key={c} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px 4px", borderRadius: "var(--radius-sm)", border: `${sel ? "2px solid var(--accent-light)" : "1px solid var(--border-color)"}`, background: sel ? "rgba(139,92,246,0.10)" : "#f8fafc", cursor: "pointer", transition: "all 0.15s", userSelect: "none" }}>
                    <input type="radio" name={name} value={c} checked={sel} onChange={() => onChange(c)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                    <div style={{ width: "11px", height: "11px", borderRadius: "50%", background: dot, border: "1px solid rgba(0,0,0,0.2)", flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", fontWeight: sel ? "700" : "500", textTransform: "capitalize", color: sel ? "var(--accent-light)" : "var(--text-primary)" }}>{c}</span>
                </label>
            );
        })}
    </div>
);

const Modal = ({ onClose, children, maxW = "400px" }) => (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)" }} />
        <div onClick={e => e.stopPropagation()} className="animate-fade-in" style={{ background: "var(--bg-primary)", borderRadius: "var(--radius-md)", boxShadow: "0 24px 60px rgba(0,0,0,0.25), 0 0 0 1px var(--border-color)", padding: "24px", width: "100%", maxWidth: maxW, display: "flex", flexDirection: "column", gap: "16px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={onClose} style={{ position: "absolute", top: "12px", right: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}><X size={14} /></button>
            {children}
        </div>
    </div>
);

const PartyDetails = ({ partyName, onBack }) => {
    const reportRef = useRef(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [expandedOrders, setExpandedOrders] = useState({});

    // Payment summary
    const [paymentSummary, setPaymentSummary] = useState({ totalOrderValue: 0, paymentReceived: 0, outstanding: 0 });
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentInput, setPaymentInput] = useState("");

    // Add Order form
    const [showAddOrder, setShowAddOrder] = useState(false);
    const [orderName, setOrderName] = useState("");
    const [orderPrice, setOrderPrice] = useState("");
    const [orderItems, setOrderItems] = useState([
        { itemName: "", color: "gold", size_length: "", size_width: "", quantityArrived: "", photo: null, preview: null }
    ]);
    const [addingOrder, setAddingOrder] = useState(false);
    const fileRefs = useRef([]);
    const camRefs = useRef([]);

    // Item action modals
    const [completeModal, setCompleteModal] = useState(null);
    const [completeVal, setCompleteVal] = useState("");
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectVal, setRejectVal] = useState("");
    const [editModal, setEditModal] = useState(null);
    const [editFields, setEditFields] = useState(new Set());
    const [editInputs, setEditInputs] = useState({});
    const [previewUrl, setPreviewUrl] = useState(null);

    // Order edit modal
    const [editOrderModal, setEditOrderModal] = useState(null);
    const [editOrderFields, setEditOrderFields] = useState(new Set());
    const [editOrderInputs, setEditOrderInputs] = useState({});

    // Report
    const [showReport, setShowReport] = useState(false);
    const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [reportError, setReportError] = useState("");

    const fmt = (d) => {
        if (!d) return "";
        const dt = new Date(d);
        const h = dt.getHours() % 12 || 12, m = String(dt.getMinutes()).padStart(2, "0"), ap = dt.getHours() >= 12 ? "pm" : "am";
        return `${h}:${m} ${ap} ${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await API.get(`/orders/party/${partyName}`);
            if (res.data?.success) {
                setOrders(res.data.data.orders || []);
                const exp = {};
                (res.data.data.orders || []).forEach(o => { exp[o._id] = false; });
                setExpandedOrders(exp);
            }
        } catch (e) {
            if (e.response?.status !== 404) setError("Failed to load orders.");
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentSummary = async () => {
        try {
            const res = await API.get(`/parties/payment-summary/${partyName}`);
            if (res.data?.success) setPaymentSummary(res.data.data);
        } catch { }
    };

    const fetchAll = () => { fetchOrders(); fetchPaymentSummary(); };

    useEffect(() => { fetchAll(); }, [partyName]);

    const handlePaymentSubmit = async () => {
        const val = Number(paymentInput);
        if (isNaN(val) || val < 0) { setError("Enter a valid amount."); return; }
        try {
            const res = await API.patch(`/parties/payment/${partyName}`, { paymentReceived: val });
            if (res.data?.success) {
                setSuccess("Payment recorded!");
                setPaymentModalOpen(false);
                setPaymentInput("");
                fetchPaymentSummary();
            }
        } catch (e) { setError(e.response?.data?.message || "Payment failed."); }
    };

    const addOrderItem = () => setOrderItems(prev => [
        ...prev,
        { itemName: "", color: "gold", size_length: "", size_width: "", quantityArrived: "", photo: null, preview: null }
    ]);

    const removeOrderItem = (i) => setOrderItems(prev => prev.filter((_, idx) => idx !== i));

    const updateOrderItem = (i, field, val) => setOrderItems(prev => {
        const next = [...prev];
        next[i] = { ...next[i], [field]: val };
        return next;
    });

    const handleItemPhoto = (i, file) => {
        if (!file) return;
        const preview = URL.createObjectURL(file);
        setOrderItems(prev => {
            const next = [...prev];
            next[i] = { ...next[i], photo: file, preview };
            return next;
        });
    };

    const handleAddOrderSubmit = async (e) => {
        e.preventDefault();
        if (!orderName.trim() || !orderPrice) { setError("Order name and price are required."); return; }
        for (let i = 0; i < orderItems.length; i++) {
            const it = orderItems[i];
            if (!it.color || !it.size_length || !it.size_width || !it.quantityArrived) {
                setError(`Item ${i + 1}: color, length, width and quantity are required.`); return;
            }
        }
        try {
            setAddingOrder(true);
            const fd = new FormData();
            fd.append("orderName", orderName.trim());
            fd.append("price", orderPrice);
            orderItems.forEach((it, i) => {
                fd.append(`items[${i}][itemName]`, it.itemName || "");
                fd.append(`items[${i}][color]`, it.color);
                fd.append(`items[${i}][size_length]`, it.size_length);
                fd.append(`items[${i}][size_width]`, it.size_width);
                fd.append(`items[${i}][quantityArrived]`, it.quantityArrived);
                if (it.photo) fd.append(`photo_${i}`, it.photo);
            });
            const res = await API.post(`/orders/new/${partyName}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
            if (res.data?.success) {
                setSuccess("Order added successfully!");
                setShowAddOrder(false);
                setOrderName(""); setOrderPrice("");
                setOrderItems([{ itemName: "", color: "gold", size_length: "", size_width: "", quantityArrived: "", photo: null, preview: null }]);
                fetchAll();
            }
        } catch (e) { setError(e.response?.data?.message || "Failed to add order."); }
        finally { setAddingOrder(false); }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm("Delete this order and all its items?")) return;
        try {
            await API.delete(`/orders/${orderId}`);
            setSuccess("Order deleted."); fetchAll();
        } catch { setError("Failed to delete order."); }
    };

    const openEditOrder = (order) => {
        setEditOrderModal(order);
        setEditOrderFields(new Set());
        setEditOrderInputs({
            orderName: order.orderName || "",
            price: order.price || 0,
        });
    };

    const handleSaveEditOrder = async () => {
        setError(""); setSuccess("");
        try {
            let updated = false;
            if (editOrderInputs.orderName !== editOrderModal.orderName || editOrderInputs.price !== editOrderModal.price) {
                await API.patch(`/orders/${editOrderModal._id}`, {
                    orderName: editOrderInputs.orderName,
                    price: editOrderInputs.price
                });
                updated = true;
            }
            if (updated) setSuccess("Order updated!");
            setEditOrderModal(null); setEditOrderFields(new Set()); fetchAll();
        } catch (e) { setError(e.response?.data?.message || "Order update failed."); }
    };

    const handleComplete = async () => {
        const val = Number(completeVal);
        if (isNaN(val) || val <= 0) { setError("Enter a valid quantity."); return; }
        if (completeModal.quantityCompleted + completeModal.quantityRejected + val > completeModal.quantityArrived) {
            setError("Total cannot exceed arrived quantity."); return;
        }
        try {
            const res = await API.patch(`/items/completed/${completeModal._id}`, { quantityCompleted: val });
            if (res.data?.success) { setSuccess(`${val} units completed!`); setCompleteModal(null); setCompleteVal(""); fetchOrders(); }
        } catch (e) { setError(e.response?.data?.message || "Failed."); }
    };

    const handleReject = async () => {
        const val = Number(rejectVal);
        if (isNaN(val) || val <= 0) { setError("Enter a valid quantity."); return; }
        if (rejectModal.quantityCompleted + rejectModal.quantityRejected + val > rejectModal.quantityArrived) {
            setError("Total cannot exceed arrived quantity."); return;
        }
        try {
            const res = await API.patch(`/items/rejected/${rejectModal._id}`, { quantityRejected: val });
            if (res.data?.success) { setSuccess(`${val} units rejected!`); setRejectModal(null); setRejectVal(""); fetchOrders(); }
        } catch (e) { setError(e.response?.data?.message || "Failed."); }
    };

    const handleOutgoing = async (item) => {
        try {
            const targetDate = item.outgoingDate ? null : new Date().toISOString();
            if (item.outgoingDate && !window.confirm("Clear outgoing date?")) return;
            const res = await API.patch(`/items/outgoing-date/${item._id}`, { outgoingDate: targetDate });
            if (res.data?.success) { setSuccess(targetDate ? "Marked dispatched!" : "Cleared dispatch date!"); fetchOrders(); }
        } catch (e) { setError(e.response?.data?.message || "Failed to update outgoing date."); }
    };

    const openEdit = (item) => {
        setEditModal(item);
        setEditFields(new Set());
        setEditInputs({
            itemName: item.itemName || "",
            color: item.color,
            size_length: item.size_length,
            size_width: item.size_width,
            quantityArrived: item.quantityArrived || 0,
            outgoingDate: item.outgoingDate ? new Date(new Date(item.outgoingDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
            quantityCompleted: item.quantityCompleted || 0,
            quantityRejected: item.quantityRejected || 0,
        });
    };

    const handleSaveEdit = async () => {
        setError(""); setSuccess("");
        try {
            let updated = false;
            if (editInputs.itemName !== (editModal.itemName || "")) { await API.patch(`/items/name/${editModal._id}`, { itemName: editInputs.itemName }); updated = true; }
            if (editInputs.color !== editModal.color) { await API.patch(`/items/color/${editModal._id}`, { color: editInputs.color }); updated = true; }
            if (Number(editInputs.size_length) !== editModal.size_length) { await API.patch(`/items/size-length/${editModal._id}`, { size_length: Number(editInputs.size_length) }); updated = true; }
            if (Number(editInputs.size_width) !== editModal.size_width) { await API.patch(`/items/size-width/${editModal._id}`, { size_width: Number(editInputs.size_width) }); updated = true; }
            if (Number(editInputs.quantityArrived) !== (editModal.quantityArrived || 0)) { await API.patch(`/items/quantity-arrived/${editModal._id}`, { quantityArrived: Number(editInputs.quantityArrived) }); updated = true; }
            const origDT = editModal.outgoingDate ? new Date(new Date(editModal.outgoingDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
            if (editInputs.outgoingDate !== origDT) { await API.patch(`/items/outgoing-date/${editModal._id}`, { outgoingDate: editInputs.outgoingDate ? new Date(editInputs.outgoingDate).toISOString() : null }); updated = true; }
            if (Number(editInputs.quantityCompleted) !== (editModal.quantityCompleted || 0)) { await API.patch(`/items/completed/${editModal._id}`, { quantityCompleted: Number(editInputs.quantityCompleted), isAbsolute: true }); updated = true; }
            if (Number(editInputs.quantityRejected) !== (editModal.quantityRejected || 0)) { await API.patch(`/items/rejected/${editModal._id}`, { quantityRejected: Number(editInputs.quantityRejected), isAbsolute: true }); updated = true; }
            if (updated) setSuccess("Item updated!");
            setEditModal(null); setEditFields(new Set()); fetchOrders();
        } catch (e) { setError(e.response?.data?.message || "Update failed."); }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm("Delete this item?")) return;
        try {
            await API.delete(`/items/delete/${itemId}`);
            setSuccess("Item deleted."); fetchOrders();
        } catch { setError("Failed to delete item."); }
    };

    // Report
    const fetchReport = async (m, y) => {
        setLoadingReport(true); setReportError(""); setReportData(null);
        try {
            const res = await API.post(`/parties/report/single/${partyName}`, { month: Number(m), year: Number(y) });
            if (res.data?.success) setReportData(res.data.data);
        } catch (e) { setReportError(e.response?.data?.message || "No data found for this period."); }
        finally { setLoadingReport(false); }
    };

    const handleDownloadPDF = () => {
        if (!reportRef.current) return;
        html2pdf().set({
            margin: [10, 10, 10, 10],
            filename: `${partyName}_Report_${new Date(2000, reportMonth - 1).toLocaleString("default", { month: "short" })}_${reportYear}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        }).from(reportRef.current).save();
    };

    const toggleOrder = (id) => setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));

    // ---- Render helpers ----


    return (
        <>
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button onClick={onBack} className="btn btn-icon-only" style={{ width: "40px", height: "40px" }}><ArrowLeft size={20} /></button>
                    <div style={{ flexGrow: 1 }}>
                        <h1 className="page-title" style={{ fontSize: "22px" }}>{partyName}</h1>
                        <p className="page-subtitle">Orders &amp; Items Ledger</p>
                    </div>
                    <button onClick={() => { setShowReport(true); fetchReport(reportMonth, reportYear); }} className="btn btn-secondary" style={{ height: "40px", padding: "0 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <BarChart3 size={16} /><span style={{ fontSize: "13px" }}>Report</span>
                    </button>
                    <button onClick={() => setShowAddOrder(!showAddOrder)} className="btn btn-primary" style={{ height: "40px", padding: "0 12px" }}>
                        <Plus size={18} /><span>Add Order</span>
                    </button>
                </div>

                {/* Alerts */}
                {error && <div className="alert alert-danger" style={{ marginBottom: 0 }}><AlertTriangle size={16} style={{ flexShrink: 0 }} /><span>{error}</span><button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}><X size={14} /></button></div>}
                {success && <div className="alert alert-success" style={{ marginBottom: 0 }}><span>{success}</span><button onClick={() => setSuccess("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}><X size={14} /></button></div>}

                {/* Payment Summary Panel */}
                <div className="glass-panel" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, fontSize: "14px", fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>💰 Party Payment Summary</h3>
                        <button onClick={() => { setPaymentModalOpen(true); setPaymentInput(String(paymentSummary.paymentReceived)); }} className="btn btn-primary" style={{ height: "34px", padding: "0 12px", fontSize: "12px" }}>
                            <DollarSign size={13} /> Record Payment
                        </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                        {[
                            { label: "Total Orders Value", val: `₹${paymentSummary.totalOrderValue || 0}`, color: "var(--accent-light)" },
                            { label: "Payment Received", val: `₹${paymentSummary.paymentReceived || 0}`, color: "var(--success)" },
                            { label: "Remaining Balance", val: `₹${paymentSummary.outstanding || 0}`, color: (paymentSummary.outstanding || 0) > 0 ? "var(--warning)" : "var(--success)" }
                        ].map(s => (
                            <div key={s.label} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "10px 12px", textAlign: "left" }}>
                                <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "4px" }}>{s.label}</div>
                                <div style={{ fontSize: "16px", fontWeight: "800", color: s.color }}>{s.val}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Order Form */}
                {showAddOrder && (
                    <div className="glass-panel glass-panel-glow animate-fade-in" style={{ padding: "20px" }}>
                        <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontFamily: "var(--font-heading)" }}>New Order</h3>
                        <form onSubmit={handleAddOrderSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {/* Order Name + Price */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Order Name</label>
                                    <input className="form-input" placeholder="e.g. Order 1" value={orderName} onChange={e => setOrderName(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Order Price (₹)</label>
                                    <input type="number" className="form-input" placeholder="Total price" value={orderPrice} onChange={e => setOrderPrice(e.target.value)} />
                                </div>
                            </div>

                            {/* Items */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>Items in this Order</span>
                                    <button type="button" onClick={addOrderItem} className="btn btn-secondary" style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}><Plus size={12} /> Add Item</button>
                                </div>

                                {orderItems.map((it, i) => (
                                    <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "14px", display: "flex", flexDirection: "column", gap: "10px", position: "relative" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--accent-light)" }}>Item {i + 1}</span>
                                            {orderItems.length > 1 && (
                                                <button type="button" onClick={() => removeOrderItem(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}><Trash2 size={14} /></button>
                                            )}
                                        </div>
                                        {/* Item Name */}
                                        <input className="form-input" placeholder="Item name (optional)" value={it.itemName} onChange={e => updateOrderItem(i, "itemName", e.target.value)} style={{ height: "36px" }} />
                                        {/* Color */}
                                        <ColorPicker value={it.color} onChange={v => updateOrderItem(i, "color", v)} name={`color_${i}`} />
                                        {/* Dimensions + Qty */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                                            <input type="number" className="form-input" placeholder="Length" value={it.size_length} onChange={e => updateOrderItem(i, "size_length", e.target.value)} style={{ height: "36px" }} />
                                            <input type="number" className="form-input" placeholder="Width" value={it.size_width} onChange={e => updateOrderItem(i, "size_width", e.target.value)} style={{ height: "36px" }} />
                                            <input type="number" className="form-input" placeholder="Qty" value={it.quantityArrived} onChange={e => updateOrderItem(i, "quantityArrived", e.target.value)} style={{ height: "36px" }} />
                                        </div>
                                        {/* Optional Photo */}
                                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                            <input ref={el => fileRefs.current[i] = el} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleItemPhoto(i, e.target.files[0])} />
                                            <input ref={el => camRefs.current[i] = el} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleItemPhoto(i, e.target.files[0])} />
                                            {it.preview ? (
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <img src={it.preview} alt="preview" style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }} />
                                                    <button type="button" onClick={() => updateOrderItem(i, "photo", null) || updateOrderItem(i, "preview", null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: "11px" }}>Remove</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    <button type="button" onClick={() => camRefs.current[i]?.click()} className="btn btn-secondary" style={{ height: "32px", padding: "0 10px", fontSize: "11px" }}><Camera size={12} /> Camera</button>
                                                    <button type="button" onClick={() => fileRefs.current[i]?.click()} className="btn btn-secondary" style={{ height: "32px", padding: "0 10px", fontSize: "11px" }}><ImageIcon size={12} /> Gallery</button>
                                                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>Photo optional</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "flex", gap: "10px" }}>
                                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }} disabled={addingOrder}>
                                    {addingOrder ? <div className="spinner" style={{ width: "18px", height: "18px", borderWidth: "2px" }} /> : "Save Order"}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddOrder(false); setOrderName(""); setOrderPrice(""); setOrderItems([{ itemName: "", color: "gold", size_length: "", size_width: "", quantityArrived: "", photo: null, preview: null }]); }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Orders List */}
                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}><div className="spinner" /></div>
                ) : orders.length === 0 ? (
                    <div className="glass-panel" style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary)" }}>
                        <Package size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
                        <p>No orders yet. Click "Add Order" to create the first one.</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {orders.map(order => (
                            <div key={order._id} className="glass-panel animate-fade-in" style={{ padding: "0", overflow: "hidden" }}>
                                {/* Order Header */}
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "var(--bg-secondary)", cursor: "pointer" }} onClick={() => toggleOrder(order._id)}>
                                    <div style={{ flexGrow: 1, textAlign: "left" }}>
                                        <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                                            <Package size={14} style={{ marginRight: "6px", color: "var(--accent-light)" }} />
                                            {order.orderName}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                            {order.items?.length || 0} item(s) · Created {fmt(order.createdAt)}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--accent-light)" }}>₹{order.totalPrice ?? order.price}</div>
                                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                        <button onClick={e => { e.stopPropagation(); openEditOrder(order); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px" }}><Pencil size={15} /></button>
                                        <button onClick={e => { e.stopPropagation(); handleDeleteOrder(order._id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: "4px" }}><Trash2 size={15} /></button>
                                        {expandedOrders[order._id] ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
                                    </div>
                                </div>

                                {/* Order Items */}
                                {expandedOrders[order._id] && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "14px 16px" }}>
                                        {(!order.items || order.items.length === 0) ? (
                                            <p style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center" }}>No items in this order.</p>
                                        ) : order.items.map(item => {
                                            const isPending = item.quantityArrived !== (item.quantityCompleted + item.quantityRejected);
                                            return (
                                                <div key={item._id} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                                    {/* Item Info Row */}
                                                    <div style={{ display: "flex", gap: "10px" }}>
                                                        {item.photo ? (
                                                            <div onClick={() => setPreviewUrl(item.photo)} style={{ width: "64px", height: "64px", borderRadius: "var(--radius-sm)", overflow: "hidden", cursor: "zoom-in", flexShrink: 0, position: "relative" }}>
                                                                <img src={item.photo} alt="Item" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                                <div style={{ position: "absolute", bottom: "2px", right: "2px", background: "rgba(0,0,0,0.55)", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}><Eye size={9} color="#fff" /></div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: "64px", height: "64px", borderRadius: "var(--radius-sm)", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--border-color)" }}>
                                                                <ImageIcon size={22} color="var(--text-secondary)" style={{ opacity: 0.4 }} />
                                                            </div>
                                                        )}
                                                        <div style={{ flexGrow: 1, textAlign: "left" }}>
                                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                                <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                                                                    {item.itemName || `${item.color} item`}
                                                                </span>
                                                                <span style={{ fontSize: "12px", color: isPending ? "var(--warning)" : "var(--success)", fontWeight: "600" }}>
                                                                    {isPending ? "Pending" : "Done"}
                                                                </span>
                                                            </div>
                                                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                                                <span style={{ textTransform: "capitalize" }}>{item.color}</span> · {item.size_length}L × {item.size_width}W in
                                                            </div>
                                                            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "4px" }}>
                                                                <span className="badge badge-warning" style={{ fontSize: "10px", padding: "2px 6px" }}>Arrived: {item.quantityArrived}</span>
                                                                {item.quantityCompleted > 0 && <span className="badge badge-success" style={{ fontSize: "10px", padding: "2px 6px" }}>Done: {item.quantityCompleted}</span>}
                                                                {item.quantityRejected > 0 && <span className="badge badge-danger" style={{ fontSize: "10px", padding: "2px 6px" }}>Fail: {item.quantityRejected}</span>}
                                                            </div>
                                                            {item.outgoingDate && <div style={{ fontSize: "11px", color: "var(--success)", marginTop: "2px" }}>Dispatched: {fmt(item.outgoingDate)}</div>}
                                                        </div>
                                                    </div>
                                                    {/* Item Actions */}
                                                    <div style={{ display: "flex", gap: "5px", overflowX: "auto" }}>
                                                        <button onClick={() => { setCompleteModal(item); setCompleteVal(""); }} className="btn btn-secondary" style={{ height: "32px", padding: "0 8px", fontSize: "11px", flexGrow: 1 }}><CheckCircle2 size={12} color="var(--success)" /> Complete</button>
                                                        <button onClick={() => { setRejectModal(item); setRejectVal(""); }} className="btn btn-secondary" style={{ height: "32px", padding: "0 8px", fontSize: "11px", flexGrow: 1 }}><AlertTriangle size={12} color="var(--danger)" /> Reject</button>
                                                        <button onClick={() => handleOutgoing(item)} className="btn btn-secondary" style={{ height: "32px", padding: "0 8px", fontSize: "11px", flexGrow: 1 }}><Calendar size={12} color="var(--accent-light)" /> {item.outgoingDate ? "Clear" : "Dispatch"}</button>
                                                        <button onClick={() => openEdit(item)} className="btn btn-secondary" style={{ height: "32px", padding: "0 8px", fontSize: "11px" }}><Sliders size={12} /></button>
                                                        <button onClick={() => handleDeleteItem(item._id)} className="btn btn-secondary" style={{ height: "32px", padding: "0 8px", color: "var(--danger)" }}><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Party Payment Modal */}
            {paymentModalOpen && (
                <Modal onClose={() => setPaymentModalOpen(false)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(255,200,0,0.12)", border: "1.5px solid rgba(255,200,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><DollarSign size={20} color="gold" /></div>
                        <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: "15px", fontWeight: "700", fontFamily: "var(--font-heading)" }}>Record Payment</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total due: ₹{paymentSummary.totalOrderPrice}</div>
                        </div>
                    </div>
                    <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Currently Received</span>
                        <strong style={{ color: "var(--success)" }}>₹{paymentSummary.paymentReceived}</strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textAlign: "left" }}>Set Total Payment Received (₹)</label>
                        <input type="number" className="form-input" placeholder="Amount in ₹" value={paymentInput} onChange={e => setPaymentInput(e.target.value)} autoFocus style={{ height: "48px", fontSize: "16px" }} />
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button className="btn btn-primary" style={{ flexGrow: 1, height: "44px" }} onClick={handlePaymentSubmit}>Save Payment</button>
                        <button className="btn btn-secondary" style={{ height: "44px", padding: "0 14px" }} onClick={() => setPaymentModalOpen(false)}>Cancel</button>
                    </div>
                </Modal>
            )}

            {/* Complete Modal */}
            {completeModal && (
                <Modal onClose={() => setCompleteModal(null)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={20} color="var(--success)" /></div>
                        <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: "15px", fontWeight: "700", fontFamily: "var(--font-heading)" }}>Record Completed</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{completeModal.itemName || completeModal.color} · Arrived: {completeModal.quantityArrived} · Done so far: {completeModal.quantityCompleted}</div>
                        </div>
                    </div>
                    <input type="number" className="form-input" placeholder="Units completed now" value={completeVal} onChange={e => setCompleteVal(e.target.value)} autoFocus style={{ height: "48px", fontSize: "16px" }} />
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button className="btn btn-primary" style={{ flexGrow: 1, height: "44px", background: "var(--success)", borderColor: "var(--success)" }} onClick={handleComplete}>Save</button>
                        <button className="btn btn-secondary" style={{ height: "44px", padding: "0 14px" }} onClick={() => setCompleteModal(null)}>Cancel</button>
                    </div>
                </Modal>
            )}

            {/* Reject Modal */}
            {rejectModal && (
                <Modal onClose={() => setRejectModal(null)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}><AlertTriangle size={20} color="var(--danger)" /></div>
                        <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: "15px", fontWeight: "700", fontFamily: "var(--font-heading)" }}>Record Rejected</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{rejectModal.itemName || rejectModal.color} · Arrived: {rejectModal.quantityArrived} · Rejected so far: {rejectModal.quantityRejected}</div>
                        </div>
                    </div>
                    <input type="number" className="form-input" placeholder="Units rejected now" value={rejectVal} onChange={e => setRejectVal(e.target.value)} autoFocus style={{ height: "48px", fontSize: "16px" }} />
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button className="btn btn-danger" style={{ flexGrow: 1, height: "44px" }} onClick={handleReject}>Confirm Reject</button>
                        <button className="btn btn-secondary" style={{ height: "44px", padding: "0 14px" }} onClick={() => setRejectModal(null)}>Cancel</button>
                    </div>
                </Modal>
            )}

            {/* Edit Item Modal */}
            {editModal && (() => {
                const tog = (f) => setEditFields(p => { const n = new Set(p); n.has(f) ? n.delete(f) : n.add(f); return n; });
                const isE = (f) => editFields.has(f);
                return (
                    <Modal onClose={() => { setEditModal(null); setEditFields(new Set()); }} maxW="420px">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(139,92,246,0.12)", border: "1.5px solid rgba(139,92,246,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}><Sliders size={20} color="var(--accent-light)" /></div>
                            <div style={{ textAlign: "left" }}>
                                <div style={{ fontSize: "15px", fontWeight: "700", fontFamily: "var(--font-heading)" }}>Edit Item</div>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Tap ✏️ to unlock a field</div>
                            </div>
                        </div>
                        <div style={{ borderTop: "1px solid var(--border-color)" }} />

                        {/* Recursive Row Helper (Inlined to prevent re-mount) */}
                        {[
                            { label: "Item Name", f: "itemName", val: editInputs.itemName || "No name", type: "text" },
                            { label: "Color", f: "color", val: editInputs.color, type: "color" },
                            { label: "Length (in)", f: "size_length", val: editInputs.size_length, type: "number" },
                            { label: "Width (in)", f: "size_width", val: editInputs.size_width, type: "number" },
                            { label: "Qty Arrived", f: "quantityArrived", val: editInputs.quantityArrived, type: "number" },
                            { label: "Completed", f: "quantityCompleted", val: editInputs.quantityCompleted, type: "number" },
                            { label: "Rejected", f: "quantityRejected", val: editInputs.quantityRejected, type: "number" },
                            { label: "Outgoing Date", f: "outgoingDate", val: editInputs.outgoingDate, type: "date" }
                        ].map(row => (
                            <div key={row.f} style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "left" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>{row.label}</label>
                                    <button type="button" onClick={() => tog(row.f)} style={{ background: isE(row.f) ? "rgba(139,92,246,0.12)" : "var(--bg-secondary)", border: `1px solid ${isE(row.f) ? "var(--accent-light)" : "var(--border-color)"}`, borderRadius: "8px", width: "30px", height: "30px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <Pencil size={12} color={isE(row.f) ? "var(--accent-light)" : "var(--text-secondary)"} />
                                    </button>
                                </div>
                                {isE(row.f) ? (
                                    row.type === "color" ? (
                                        <ColorPicker value={editInputs.color} onChange={v => setEditInputs(p => ({ ...p, color: v }))} name="editColor" />
                                    ) : row.type === "date" ? (
                                        <input type="datetime-local" className="form-input" value={editInputs.outgoingDate || ""} onChange={e => setEditInputs(p => ({ ...p, outgoingDate: e.target.value }))} style={{ height: "40px" }} />
                                    ) : (
                                        <input
                                            type={row.type}
                                            className="form-input"
                                            value={row.f === "itemName" ? editInputs.itemName : editInputs[row.f]}
                                            onChange={e => {
                                                let val = e.target.value;
                                                if (row.type === "number") val = Math.max(0, val);
                                                setEditInputs(p => ({ ...p, [row.f]: val }));
                                            }}
                                            min={row.type === "number" ? 0 : undefined}
                                            style={{ height: "40px" }}
                                        />
                                    )
                                ) : (
                                    <div style={{ padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: "600" }}>
                                        {row.type === "color" ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", textTransform: "capitalize" }}>
                                                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: colorDot(editInputs.color) }} />{editInputs.color}
                                            </div>
                                        ) : row.type === "date" ? (
                                            editInputs.outgoingDate ? editInputs.outgoingDate.replace("T", " ") : "Not set"
                                        ) : (
                                            row.val
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                            <button className="btn btn-primary" style={{ flexGrow: 1, height: "44px" }} onClick={handleSaveEdit}><Save size={15} /> Save Changes</button>
                            <button className="btn btn-secondary" style={{ height: "44px", padding: "0 14px" }} onClick={() => { setEditModal(null); setEditFields(new Set()); }}>Cancel</button>
                        </div>
                    </Modal>
                );
            })()}

            {/* Edit Order Modal */}
            {editOrderModal && (() => {
                const tog = (f) => setEditOrderFields(p => { const n = new Set(p); n.has(f) ? n.delete(f) : n.add(f); return n; });
                const isE = (f) => editOrderFields.has(f);
                return (
                    <Modal onClose={() => { setEditOrderModal(null); setEditOrderFields(new Set()); }} maxW="420px">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(139,92,246,0.12)", border: "1.5px solid rgba(139,92,246,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}><Sliders size={20} color="var(--accent-light)" /></div>
                            <div style={{ textAlign: "left" }}>
                                <div style={{ fontSize: "15px", fontWeight: "700", fontFamily: "var(--font-heading)" }}>Edit Order</div>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Tap ✏️ to unlock a field</div>
                            </div>
                        </div>
                        <div style={{ borderTop: "1px solid var(--border-color)" }} />

                        {[
                            { label: "Order Name", f: "orderName", val: editOrderInputs.orderName, type: "text" },
                            { label: "Price per Sq. Inch", f: "price", val: editOrderInputs.price, type: "number" }
                        ].map(row => (
                            <div key={row.f} style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "left" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>{row.label}</label>
                                    <button type="button" onClick={() => tog(row.f)} style={{ background: isE(row.f) ? "rgba(139,92,246,0.12)" : "var(--bg-secondary)", border: `1px solid ${isE(row.f) ? "var(--accent-light)" : "var(--border-color)"}`, borderRadius: "8px", width: "30px", height: "30px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <Pencil size={12} color={isE(row.f) ? "var(--accent-light)" : "var(--text-secondary)"} />
                                    </button>
                                </div>
                                {isE(row.f) ? (
                                    <input
                                        type={row.type}
                                        className="form-input"
                                        value={editOrderInputs[row.f]}
                                        onChange={e => {
                                            let val = e.target.value;
                                            if (row.type === "number") val = Math.max(0, val);
                                            setEditOrderInputs(p => ({ ...p, [row.f]: val }));
                                        }}
                                        min={row.type === "number" ? 0 : undefined}
                                        style={{ height: "40px" }}
                                    />
                                ) : (
                                    <div style={{ padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: "600" }}>{row.val}</div>
                                )}
                            </div>
                        ))}

                        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                            <button className="btn btn-primary" style={{ flexGrow: 1, height: "44px" }} onClick={handleSaveEditOrder}><Save size={15} /> Save Changes</button>
                            <button className="btn btn-secondary" style={{ height: "44px", padding: "0 14px" }} onClick={() => { setEditOrderModal(null); setEditOrderFields(new Set()); }}>Cancel</button>
                        </div>
                    </Modal>
                );
            })()}

            {/* Image Zoom */}
            {previewUrl && (
                <div onClick={() => setPreviewUrl(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                    <button style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "40px", height: "40px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={22} /></button>
                    <img src={previewUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "var(--radius-md)" }} />
                </div>
            )}

            {/* Report Modal */}
            {showReport && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(248,250,252,0.98)", backdropFilter: "blur(12px)", zIndex: 1000, overflowY: "auto" }} className="animate-fade-in">
                    <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto", padding: "40px 16px 100px", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)", marginBottom: "16px" }}>
                            <div>
                                <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "22px", fontWeight: "800" }}>{partyName} Report</h2>
                                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>Monthly Billing &amp; Production Analytics</p>
                            </div>
                            <button onClick={() => { setShowReport(false); setReportData(null); setReportError(""); }} className="btn btn-icon-only" style={{ borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}><ArrowLeft size={20} /></button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                            <button onClick={() => { const n = new Date(); fetchReport(n.getMonth() + 1, n.getFullYear()); }} className="btn btn-secondary" style={{ height: "44px", fontSize: "14px", fontWeight: "600", background: "rgba(139,92,246,0.10)" }}>This Month</button>
                            <button onClick={() => { const n = new Date(); let m = n.getMonth(); let y = n.getFullYear(); if (m === 0) { m = 12; y--; } fetchReport(m, y); }} className="btn btn-secondary" style={{ height: "44px", fontSize: "14px", fontWeight: "600", background: "rgba(139,92,246,0.10)" }}>Previous Month</button>
                        </div>

                        <form className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }} onSubmit={e => { e.preventDefault(); fetchReport(reportMonth, reportYear); }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Month</label>
                                    <select value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="form-input" style={{ height: "44px", background: "var(--bg-primary)" }}>
                                        {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("default", { month: "long" })}</option>))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Year</label>
                                    <input type="number" value={reportYear} onChange={e => setReportYear(e.target.value)} className="form-input" style={{ height: "44px" }} />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ height: "44px", fontWeight: "700" }}>Fetch Report & Analysis</button>
                        </form>

                        {loadingReport && <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}><div className="spinner" style={{ width: "32px", height: "32px" }} /></div>}
                        {reportError && <div className="alert alert-danger" style={{ padding: "16px" }}><AlertTriangle size={18} /><span>{reportError}</span></div>}

                        {reportData && (
                            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                <button onClick={handleDownloadPDF} className="btn btn-primary" style={{ height: "48px", fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: "var(--accent-light)" }}><Download size={18} /> Download Full Report (PDF)</button>
                                <div ref={reportRef} style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "24px", background: "white", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", border: "1px solid var(--border-color)" }}>
                                    <div style={{ textAlign: "left", fontSize: "14px", fontWeight: "700", color: "var(--accent-light)" }}>
                                        Report Period: {new Date(2000, reportMonth - 1).toLocaleString("default", { month: "long" })} {reportYear}
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                        {[
                                            { label: "Opening (Prev)", val: `₹${reportData.openingBalance || 0}`, border: "var(--text-muted)" },
                                            { label: "Month Billing", val: `₹${reportData.totalCost || 0}`, border: "var(--accent-light)" },
                                            { label: "Recvd (Month)", val: `₹${reportData.totalPaymentReceived || 0}`, border: "var(--success)" },
                                            { label: "Outstanding", val: `₹${reportData.totalPaymentPending || 0}`, border: "var(--warning)", color: "var(--warning)" },
                                        ].map(s => (
                                            <div key={s.label} className="glass-panel" style={{ padding: "12px", borderLeft: `4px solid ${s.border}`, textAlign: "left" }}>
                                                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{s.label}</div>
                                                <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "4px", color: s.color }}>{s.val}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                        {[
                                            { label: "Arrived", val: reportData.totalQuantityArrived },
                                            { label: "Completed", val: reportData.totalQuantityCompleted, color: "var(--success)" },
                                            { label: "Rejected", val: reportData.totalQuantityRejected, color: "var(--danger)" },
                                            { label: "Pending", val: reportData.totalQuantityPending, color: "var(--warning)" },
                                        ].map(s => (
                                            <div key={s.label} className="glass-panel" style={{ padding: "10px", textAlign: "left" }}>
                                                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{s.label}</div>
                                                <div style={{ fontSize: "16px", fontWeight: "700", color: s.color }}>{s.val} pcs</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default PartyDetails;
