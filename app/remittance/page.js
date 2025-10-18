'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// --- INITIAL DATA ---
const initialRemittanceData = [
    { remittanceRef: 'FIRC-CT-001', remittanceDate: '2025-12-10', senderBankRef: 'SNDR-REF-123', senderBankRefDate: '2025-12-09', remitter: 'GlobeTech Inc.', remittanceInstructedValue: 150500, fbChargesDeducted: 500, remittanceNetValue: 150000, currency: 'USD', partyDetails: { name: 'GlobeTech Inc.', customerCode: 'GT-001', address: '123 Innovation Drive, Silicon Valley, CA' }, bankDetails: { name: 'Citibank NA', swift: 'CITIUS33', country: 'USA' }, settlements: [ { settlementNumber: 'SET-25-001A', creditAccount: 'ABC Exporters Pvt Ltd - 123456789', creditAmountFCY: 149500, purposeCode: 'P0102', purposeDescription: 'Export of Goods', linkedInvoices: [ { sbNumber: 'SB-2025-001', sbDate: '2025-10-05', invNumber: 'INV-1022', invDate: '2025-10-01', dueDate: '2025-12-15', invValue: '150,000 USD', remUtilization: 149500, conversionRate: 1.0, } ] }, { settlementNumber: 'SET-25-001B', creditAccount: 'ABC Exporters Pvt Ltd - 987654321', creditAmountFCY: 500, purposeCode: 'P1302', purposeDescription: 'Refund for charges / expenses' } ] },
    { remittanceRef: 'FIRC-HSBC-002', remittanceDate: '2025-12-28', senderBankRef: 'SNDR-REF-456', senderBankRefDate: '2025-12-27', remitter: 'Nexus Systems', remittanceInstructedValue: 125624, fbChargesDeducted: 312, remittanceNetValue: 125312, currency: 'USD', partyDetails: { name: 'Nexus Systems', customerCode: 'NS-003', address: '789 Tech Park, London, UK' }, bankDetails: { name: 'HSBC UK Bank plc', swift: 'MIDLGB22', country: 'UK' }, settlements: [ { settlementNumber: 'SET-25-002', creditAccount: 'ABC Exporters Pvt Ltd - 123456789', creditAmountFCY: 125312, purposeCode: 'P0102', purposeDescription: 'Export of Goods', linkedInvoices: [ { sbNumber: 'SB-2025-003', sbDate: '2025-10-12', invNumber: 'INV-1024', invDate: '2025-10-10', dueDate: '2026-01-10', invValue: '100249.60 GBP', remUtilization: 125312, conversionRate: 0.8, } ] } ] },
    { remittanceRef: 'FIRC-BOA-001', remittanceDate: '2025-11-20', senderBankRef: 'SNDR-REF-987', senderBankRefDate: '2025-11-19', remitter: 'Apex Innovations', remittanceInstructedValue: 75000, fbChargesDeducted: 0, remittanceNetValue: 75000, currency: 'USD', partyDetails: { name: 'Apex Innovations', customerCode: 'AI-005', address: '555 Future Way, Austin, TX' }, bankDetails: { name: 'Bank of America', swift: 'BOFAUS3N', country: 'USA' }, settlements: [] },
    { remittanceRef: 'FIRC-DB-006', remittanceDate: '2026-02-25', senderBankRef: 'SNDR-REF-XYZ', senderBankRefDate: '2026-02-24', remitter: 'Synergy Corp', remittanceInstructedValue: 400000, fbChargesDeducted: 600, remittanceNetValue: 399400, currency: 'EUR', partyDetails: { name: 'Synergy Corp', customerCode: 'SC-008', address: '200 Business Park, Singapore' }, bankDetails: { name: 'Deutsche Bank', swift: 'DEUTDEFF', country: 'Germany' }, settlements: [ { settlementNumber: 'SET-26-005', creditAccount: 'ABC Exporters Pvt Ltd - 123456789', creditAmountFCY: 399400, purposeCode: 'P0102', purposeDescription: 'Export of Goods', linkedInvoices: [ { sbNumber: 'SB-2025-008', sbDate: '2025-11-01', invNumber: 'INV-1031', invDate: '2025-10-28', dueDate: '2026-02-28', invValue: '400,000 EUR', remUtilization: 250000, conversionRate: 1.0, }, { sbNumber: 'SB-2025-008', sbDate: '2025-11-01', invNumber: 'INV-1031', invDate: '2025-10-28', dueDate: '2026-02-28', invValue: '400,000 EUR', remUtilization: 149400, conversionRate: 1.0, } ] } ] },
    { remittanceRef: 'FIRC-JPM-010', remittanceDate: '2025-10-15', senderBankRef: 'SNDR-REF-ADV1', senderBankRefDate: '2025-10-14', remitter: 'Stellar Imports', remittanceInstructedValue: 50000, fbChargesDeducted: 100, remittanceNetValue: 49900, currency: 'USD', partyDetails: { name: 'Stellar Imports', customerCode: 'SI-010', address: '321 Galaxy Rd, Houston, TX' }, bankDetails: { name: 'JPMorgan Chase', swift: 'CHASUS33', country: 'USA' }, settlements: [ { settlementNumber: 'SET-25-ADV1', creditAccount: 'ABC Exporters Pvt Ltd - 123456789', creditAmountFCY: 49900, purposeCode: 'P0103', purposeDescription: 'Advance against export' } ] },
    { remittanceRef: 'FIRC-ANZ-005', remittanceDate: '2025-11-05', senderBankRef: 'SNDR-REF-SPLT1', senderBankRefDate: '2025-11-04', remitter: 'Zenith Exports', remittanceInstructedValue: 200000, fbChargesDeducted: 400, remittanceNetValue: 199600, currency: 'AUD', partyDetails: { name: 'Zenith Exports', customerCode: 'ZE-011', address: 'Level 20, 100 Market St, Sydney, NSW' }, bankDetails: { name: 'ANZ Banking Group', swift: 'ANZBAU3M', country: 'Australia' }, settlements: [ { settlementNumber: 'SET-25-SPLT1A', creditAccount: 'ABC Exporters Pvt Ltd - 123456789', creditAmountFCY: 50000, purposeCode: 'P0103', purposeDescription: 'Advance against export' }, { settlementNumber: 'SET-25-SPLT1B', creditAccount: 'ABC Exporters Pvt Ltd - 123456789', creditAmountFCY: 149600, purposeCode: 'P0102', purposeDescription: 'Export of Goods', linkedInvoices: [ { sbNumber: 'SB-2025-015', sbDate: '2025-10-20', invNumber: 'INV-1040', invDate: '2025-10-18', dueDate: '2025-12-30', invValue: '150,000 AUD', remUtilization: 149600, conversionRate: 1.0, } ] } ] },
    { remittanceRef: 'FIRC-SCB-015', remittanceDate: '2026-03-10', senderBankRef: 'SNDR-REF-PART1', senderBankRefDate: '2026-03-09', remitter: 'Quantum Solutions', remittanceInstructedValue: 100250, fbChargesDeducted: 250, remittanceNetValue: 100000, currency: 'USD', partyDetails: { name: 'Quantum Solutions', customerCode: 'QS-015', address: '42 Quantum Leap, Geneva, CH' }, bankDetails: { name: 'Standard Chartered', swift: 'SCBLUS33', country: 'USA' }, settlements: [ { settlementNumber: 'SET-26-PART1', creditAccount: 'ABC Exporters Pvt Ltd - 123456789', creditAmountFCY: 100000, purposeCode: 'P0102', purposeDescription: 'Export of Goods', linkedInvoices: [ { sbNumber: 'SB-2026-001', sbDate: '2026-02-15', invNumber: 'INV-1050', invDate: '2026-02-10', dueDate: '2026-04-10', invValue: '150,000 USD', remUtilization: 80000, conversionRate: 1.0, } ] } ] }
];

// --- HELPER FUNCTIONS ---
const getSettlementStatusInfo = (settlement) => {
    if (!settlement.linkedInvoices || settlement.linkedInvoices.length === 0) {
        return { text: 'Un-utilized', class: 'bg-blue-100 text-blue-800' };
    }
    const totalUtilized = settlement.linkedInvoices.reduce((sum, inv) => sum + inv.remUtilization, 0);
    const isFullyUtilized = totalUtilized >= (settlement.creditAmountFCY - 0.001);

    if (isFullyUtilized) {
        return { text: 'Utilized', class: 'bg-green-100 text-green-800' };
    } else if (totalUtilized > 0 && !isFullyUtilized) {
        return { text: 'Part Utilized', class: 'bg-yellow-100 text-yellow-800' };
    } else {
        return { text: 'Un-utilized', class: 'bg-blue-100 text-blue-800' };
    }
};

const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN');

const filterBadgeColors = {
    'All': 'bg-gray-200 text-gray-800',
    'Utilized': 'bg-green-200 text-green-800',
    'Part Utilized': 'bg-yellow-200 text-yellow-800',
    'Un-utilized': 'bg-blue-200 text-blue-800',
    'Outstanding': 'bg-red-200 text-red-800',
};

// --- DATA FOR SETTLEMENT MODALS ---
const availableInvoicesData = [
    { id: 1, invNumber: 'INV-1022', invDate: '2025-10-01', sbNumber: 'SB-2025-001', sbDate: '2025-10-05', customerName: 'GlobeTech Inc.', customerCode: 'GT-001', invValue: 150000, invCurrency: 'USD', outstanding: 150000 },
    { id: 2, invNumber: 'INV-1024', invDate: '2025-10-10', sbNumber: 'SB-2025-003', sbDate: '2025-10-12', customerName: 'Nexus Systems', customerCode: 'NS-003', invValue: 125312, invCurrency: 'USD', outstanding: 125312 },
    { id: 3, invNumber: 'INV-1031', invDate: '2025-10-28', sbNumber: 'SB-2025-008', sbDate: '2025-11-01', customerName: 'Synergy Corp', customerCode: 'SC-008', invValue: 400000, invCurrency: 'EUR', outstanding: 250000 },
    { id: 4, invNumber: 'INV-1050', invDate: '2026-02-10', sbNumber: 'SB-2026-001', sbDate: '2026-02-15', customerName: 'Quantum Solutions', customerCode: 'QS-015', invValue: 150000, invCurrency: 'USD', outstanding: 70000 },
];

const purposeOptions = [
    { value: "", label: "Select Purpose" },
    { value: "P0102", label: "P0102 - Export of Goods" },
    { value: "P0103", label: "P0103 - Advance against export" },
    { value: "P1302", label: "P1302 - Refund for charges / expenses" }
];


// --- Sub-Modal: DealDetailsModal ---
function DealDetailsModal({ remittance, settlement, onSave, onClose }) {
    const [deals, setDeals] = useState(() => settlement.deals || [{ dealId: '', dealAmount: 0 }]);

    const handleAddDealRow = () => {
        setDeals([...deals, { dealId: '', dealAmount: 0 }]);
    };

    const handleRemoveDealRow = (index) => {
        setDeals(deals.filter((_, i) => i !== index));
    };

    const handleDealChange = (index, field, value) => {
        const newDeals = [...deals];
        newDeals[index][field] = value;
        setDeals(newDeals);
    };

    const totalAmount = useMemo(() => {
        return deals.reduce((sum, deal) => sum + (parseFloat(deal.dealAmount) || 0), 0);
    }, [deals]);

    const handleSave = () => {
        onSave(settlement.id, deals, totalAmount);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="modal bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col">
                <div className="p-5 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Deal Details</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 text-left font-semibold">Deal ID</th>
                                    <th className="p-2 text-left font-semibold">Deal Amount ({remittance.currency})</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {deals.map((deal, index) => (
                                    <tr key={index}>
                                        <td className="p-1"><input type="text" value={deal.dealId} onChange={(e) => handleDealChange(index, 'dealId', e.target.value)} className="w-full border border-gray-300 rounded-md p-1 text-sm" /></td>
                                        <td className="p-1"><input type="number" step="0.01" value={deal.dealAmount} onChange={(e) => handleDealChange(index, 'dealAmount', e.target.value)} className="w-full border border-gray-300 rounded-md p-1 text-sm" /></td>
                                        <td className="p-1 text-center">
                                            <button type="button" onClick={() => handleRemoveDealRow(index)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold">
                                <tr>
                                    <td className="p-2 text-right">Total</td>
                                    <td className="p-2">{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <button type="button" onClick={handleAddDealRow} className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        Add Deal
                    </button>
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <button type="button" onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Done</button>
                </div>
            </div>
        </div>
    );
}

// --- Sub-Modal: FetchInvoicesModal ---
function FetchInvoicesModal({ remittance, settlement, onProceed, onClose }) {
    const [invoices, setInvoices] = useState([]);
    const [selectedIds, setSelectedIds] = useState(() => new Set(settlement.linkedInvoices.map(inv => inv.id)));

    // Mock fetching invoices
    const handleFetch = () => {
        // In a real app, you'd filter availableInvoicesData based on search criteria
        setInvoices(availableInvoicesData);
    };

    const handleSelect = (id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };
    
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(new Set(invoices.map(inv => inv.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleProceed = () => {
        const selectedInvoices = invoices.filter(inv => selectedIds.has(inv.id));
        onProceed(settlement.id, selectedInvoices);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="modal bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col h-5/6">
                <div className="p-5 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Fetch Available Invoices</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                    {/* Filter Section */}
                    <div className="p-4 bg-gray-50 rounded-lg border grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        {/* ... Filter inputs ... */}
                        <div>
                            <button onClick={handleFetch} className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Fetch List</button>
                        </div>
                    </div>
                    {/* Invoice List Table */}
                    <div className="overflow-y-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-2 w-10"><input type="checkbox" onChange={handleSelectAll} /></th>
                                    <th className="p-2 text-left font-semibold">Invoice Details</th>
                                    <th className="p-2 text-left font-semibold">Shipping Bill</th>
                                    <th className="p-2 text-left font-semibold">Customer</th>
                                    <th className="p-2 text-left font-semibold">Invoice Value</th>
                                    <th className="p-2 text-left font-semibold">Outstanding</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(inv => (
                                    <tr key={inv.id} className="border-b">
                                        <td className="p-2 text-center"><input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => handleSelect(inv.id)} /></td>
                                        <td className="p-2"><div>{inv.invNumber}</div><div className="text-xs text-gray-500">{new Date(inv.invDate).toLocaleDateString('en-IN')}</div></td>
                                        <td className="p-2"><div>{inv.sbNumber}</div><div className="text-xs text-gray-500">{new Date(inv.sbDate).toLocaleDateString('en-IN')}</div></td>
                                        <td className="p-2"><div>{inv.customerName}</div><div className="text-xs text-gray-500">{inv.customerCode}</div></td>
                                        <td className="p-2">{inv.invValue.toLocaleString('en-IN')} {inv.invCurrency}</td>
                                        <td className="p-2">{inv.outstanding.toLocaleString('en-IN')} {inv.invCurrency}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <button type="button" onClick={handleProceed} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Proceed</button>
                </div>
            </div>
        </div>
    );
}

// --- Main SettleRemittanceModal Component ---
function SettleRemittanceModal({ remittance, onClose, onSettleSubmit }) {
    const [settlements, setSettlements] = useState([]);
    const [activeTabId, setActiveTabId] = useState(1);
    const [nextId, setNextId] = useState(2);

    const [modalState, setModalState] = useState({
        isDealModalOpen: false,
        isInvoiceModalOpen: false,
        currentSettlement: null
    });

    // Initialize the first settlement tab when the modal opens
    useEffect(() => {
        setSettlements([
            {
                id: 1,
                creditAccount: 'ICICI Bank - 1234567890 (INR)',
                creditAmountFCY: remittance.remittanceNetValue,
                purposeCode: '',
                purposeDescription: '',
                dealType: 'Bank',
                deals: [],
                dealAmountMapped: 0,
                linkedInvoices: []
            }
        ]);
        setActiveTabId(1);
        setNextId(2);
    }, [remittance]);

    const totalSettled = useMemo(() => {
        return settlements.reduce((sum, s) => sum + (parseFloat(s.creditAmountFCY) || 0), 0);
    }, [settlements]);

    const balanceAmount = useMemo(() => {
        return remittance.remittanceNetValue - totalSettled;
    }, [remittance, totalSettled]);
    
    const handleAddTab = () => {
        const newSettlement = {
            id: nextId,
            creditAccount: 'ICICI Bank - 1234567890 (INR)',
            creditAmountFCY: balanceAmount > 0.001 ? balanceAmount : 0,
            purposeCode: '',
            purposeDescription: '',
            dealType: 'Bank',
            deals: [],
            dealAmountMapped: 0,
            linkedInvoices: []
        };
        setSettlements([...settlements, newSettlement]);
        setActiveTabId(nextId);
        setNextId(nextId + 1);
    };

    // --- Main Change Handler ---
    const handleChange = (id, field, value) => {
        let newSettlements = settlements.map(s =>
            s.id === id ? { ...s, [field]: value } : s
        );

        if (field === 'purposeCode') {
            const purpose = purposeOptions.find(p => p.value === value);
            newSettlements = newSettlements.map(s =>
                s.id === id ? { ...s, purposeDescription: purpose ? purpose.label.split(' - ')[1] || '' : '' } : s
            );
        }
        
        if (field === 'creditAccount') {
             const accountCurrency = value.match(/\(([^)]+)\)/)[1];
             newSettlements = newSettlements.map(s => {
                if(s.id === id) {
                    const newDealType = (accountCurrency === remittance.currency) ? 'EEFC' : 'Bank';
                    return {...s, dealType: newDealType};
                }
                return s;
             });
        }
        
        setSettlements(newSettlements);
    };
    
    // --- Invoice Sub-table Handlers ---
    const handleInvoiceChange = (settlementId, invoiceId, field, value) => {
        setSettlements(prev => prev.map(s => {
            if (s.id === settlementId) {
                const newInvoices = s.linkedInvoices.map(inv => {
                    if (inv.id === invoiceId) {
                        const newInv = { ...inv, [field]: value };
                        
                        // Recalculate realized and charges
                        const util = parseFloat(field === 'remUtilization' ? value : inv.remUtilization) || 0;
                        const rate = parseFloat(field === 'conversionRate' ? value : inv.conversionRate) || 0;
                        newInv.invRealization = util * rate;
                        newInv.fbCharges = (remittance.remittanceNetValue > 0 && remittance.fbChargesDeducted > 0)
                            ? (remittance.fbChargesDeducted * (util / remittance.remittanceNetValue))
                            : 0;
                        
                        return newInv;
                    }
                    return inv;
                });
                return { ...s, linkedInvoices: newInvoices };
            }
            return s;
        }));
    };
    
    const getInvoiceTotals = (settlement) => {
        return (settlement.linkedInvoices || []).reduce((acc, inv) => {
            acc.totalUtil += parseFloat(inv.remUtilization) || 0;
            acc.totalRealized += parseFloat(inv.invRealization) || 0;
            acc.totalFbCharges += parseFloat(inv.fbCharges) || 0;
            return acc;
        }, { totalUtil: 0, totalRealized: 0, totalFbCharges: 0 });
    };

    // --- Deal Modal Handlers ---
    const handleSaveDeals = (settlementId, deals, totalAmount) => {
        setSettlements(prev => prev.map(s =>
            s.id === settlementId ? { ...s, deals: deals, dealAmountMapped: totalAmount } : s
        ));
    };
    
    // --- Invoice Modal Handlers ---
    const handleProceedWithInvoices = (settlementId, selectedInvoices) => {
        setSettlements(prev => prev.map(s => {
            if (s.id === settlementId) {
                const newLinkedBases = selectedInvoices.map(inv => {
                    const existing = s.linkedInvoices.find(li => li.id === inv.id);
                    if (existing) return existing; // Keep existing data if already added
                    
                    const convRate = remittance.currency === inv.invCurrency ? 1.0 : '';
                    const util = inv.outstanding;
                    const realized = util * (parseFloat(convRate) || 0);
                    const fbCharges = (remittance.remittanceNetValue > 0 && remittance.fbChargesDeducted > 0)
                        ? (remittance.fbChargesDeducted * (util / remittance.remittanceNetValue))
                        : 0;

                    return {
                        ...inv,
                        remUtilization: util,
                        conversionRate: convRate,
                        invRealization: realized,
                        fbCharges: fbCharges,
                    };
                });
                return { ...s, linkedInvoices: newLinkedBases };
            }
            return s;
        }));
    };

    // --- Form Submission ---
    const handleSubmit = (e) => {
        e.preventDefault();
        // Format data to match the original requirement
        const finalSettlements = settlements.map((s, i) => ({
            settlementNumber: `${remittance.remittanceRef}-SET-${i + 1}`,
            creditAccount: s.creditAccount,
            creditAmountFCY: parseFloat(s.creditAmountFCY),
            purposeCode: s.purposeCode,
            purposeDescription: s.purposeDescription,
            // Add other fields like dealType, deals if needed
            linkedInvoices: s.linkedInvoices.map(inv => ({
                sbNumber: inv.sbNumber,
                sbDate: inv.sbDate,
                invNumber: inv.invNumber,
                invDate: inv.invDate,
                dueDate: inv.invDate, // Placeholder from original
                invValue: `${inv.invValue.toLocaleString('en-IN')} ${inv.invCurrency}`,
                outstanding: inv.outstanding,
                remUtilization: parseFloat(inv.remUtilization),
                conversionRate: parseFloat(inv.conversionRate) || 1.0,
            }))
        }));
        
        onSettleSubmit(remittance.remittanceRef, finalSettlements);
    };

    const openModal = (type, settlement) => {
        setModalState({ ...modalState, [`is${type}ModalOpen`]: true, currentSettlement: settlement });
    };
    const closeModal = (type) => {
        setModalState({ ...modalState, [`is${type}ModalOpen`]: false, currentSettlement: null });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="modal bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col h-5/6">
                <div className="p-5 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Settle Outstanding Remittance</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div>
                            <label className="block text-sm font-medium text-gray-500">Total Remittance Amount</label>
                            <p className="text-xl font-bold text-gray-800">{remittance.remittanceNetValue.toLocaleString('en-IN')} {remittance.currency}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-red-500">Balance Amount</label>
                            <p className="text-xl font-bold text-red-600">{balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {remittance.currency}</p>
                        </div>
                    </div>

                    <div className="flex items-center border-b border-gray-200">
                        <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                            {settlements.map((s, i) => (
                                <button
                                    type="button"
                                    key={s.id}
                                    onClick={() => setActiveTabId(s.id)}
                                    className={`border-b-2 p-2 text-sm font-medium ${activeTabId === s.id ? 'active bg-indigo-50 text-indigo-700 border-indigo-500' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                                >
                                    Settlement {i + 1}
                                </button>
                            ))}
                        </nav>
                        {balanceAmount > 0.001 && (
                            <button type="button" onClick={handleAddTab} className="ml-4 mb-px bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md hover:bg-green-200 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Add Settlement
                            </button>
                        )}
                    </div>

                    <div className="py-4">
                        {settlements.map((s, index) => {
                            const accountCurrency = s.creditAccount.match(/\(([^)]+)\)/)[1];
                            const isEefcDisabled = accountCurrency === 'INR';
                            const invoiceTotals = getInvoiceTotals(s);
                            const availableForMapping = (parseFloat(s.creditAmountFCY) || 0) - invoiceTotals.totalUtil;

                            return (
                                <div key={s.id} className={`settlement-tab-pane space-y-4 ${activeTabId !== s.id ? 'hidden' : ''}`}>
                                    <h3 className="text-lg font-semibold">Settlement & Purpose Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Credit Account</label>
                                            <select value={s.creditAccount} onChange={(e) => handleChange(s.id, 'creditAccount', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                                <option value="ICICI Bank - 1234567890 (INR)">ICICI Bank - 1234567890 (INR)</option>
                                                <option value="ICICI Bank - 0987654321 (USD)">ICICI Bank - 0987654321 (USD)</option>
                                                <option value="ICICI Bank - 5678901234 (EUR)">ICICI Bank - 5678901234 (EUR)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Credit Amount ({remittance.currency})</label>
                                            <input type="number" step="0.01" value={s.creditAmountFCY} onChange={(e) => handleChange(s.id, 'creditAmountFCY', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Purpose Code</label>
                                            <select value={s.purposeCode} onChange={(e) => handleChange(s.id, 'purposeCode', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                                                {purposeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Purpose Description</label>
                                            <input type="text" value={s.purposeDescription} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100" readOnly />
                                        </div>
                                        <div className="flex items-end space-x-2">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-gray-700">Deal Type</label>
                                                <select value={s.dealType} onChange={(e) => handleChange(s.id, 'dealType', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                                    <option value="Bank">Bank</option>
                                                    <option value="EEFC" disabled={isEefcDisabled}>EEFC</option>
                                                    <option value="Deal Available">Deal Available</option>
                                                    <option value="Take Later">Take Later</option>
                                                </select>
                                            </div>
                                            {s.dealType === 'Deal Available' && (
                                                <button type="button" onClick={() => openModal('Deal', s)} className="p-2 border rounded-md hover:bg-gray-100">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12s-3.55-6-8-6-8 6-8 6 3.55 6 8 6 8-6 8-6z" /><circle cx="12" cy="12" r="3" /></svg>
                                                </button>
                                            )}
                                        </div>
                                        {s.dealType === 'Deal Available' && (
                                            <div className="deal-amount-mapped-container">
                                                <label className="block text-sm font-medium text-gray-700">Total Deal Amount Mapped</label>
                                                <input type="text" value={s.dealAmountMapped.toLocaleString('en-IN', { minimumFractionDigits: 2 })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100" readOnly />
                                            </div>
                                        )}
                                        {/* Attachment Input - State for this can be added if file handling is needed */}
                                    </div>

                                    {s.purposeCode === 'P0102' && (
                                        <div className="pt-4 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-lg font-semibold">Linked Invoice Details</h3>
                                                <span className="text-sm">
                                                    <span className="font-medium text-gray-600">Available for Mapping: </span>
                                                    <span className="font-bold text-indigo-700">{availableForMapping.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {remittance.currency}</span>
                                                </span>
                                                <button type="button" onClick={() => openModal('Invoice', s)} className="text-sm bg-indigo-100 text-indigo-700 font-semibold px-3 py-1 rounded-md hover:bg-indigo-200">Fetch Available Invoices</button>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            <th className="p-2 text-left font-semibold">Invoice Details</th>
                                                            <th className="p-2 text-left font-semibold">Shipping Bill</th>
                                                            <th className="p-2 text-left font-semibold">Invoice Value</th>
                                                            <th className="p-2 text-left font-semibold">Remittance Utilized</th>
                                                            <th className="p-2 text-left font-semibold">Conv. Rate</th>
                                                            <th className="p-2 text-left font-semibold">Invoice Realized</th>
                                                            <th className="p-2 text-left font-semibold">FB Charges</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {s.linkedInvoices.map(inv => (
                                                            <tr key={inv.id}>
                                                                <td className="p-1"><div>{inv.invNumber}</div><div className="text-xs">{new Date(inv.invDate).toLocaleDateString('en-IN')}</div></td>
                                                                <td className="p-1"><div>{inv.sbNumber}</div><div className="text-xs">{new Date(inv.sbDate).toLocaleDateString('en-IN')}</div></td>
                                                                <td className="p-1">{inv.invValue.toLocaleString('en-IN')} {inv.invCurrency}</td>
                                                                <td className="p-1"><input type="number" step="0.01" value={inv.remUtilization} onChange={(e) => handleInvoiceChange(s.id, inv.id, 'remUtilization', e.target.value)} className="w-full border border-gray-300 rounded-md p-1 text-xs" /></td>
                                                                <td className="p-1"><input type="number" step="0.0001" value={inv.conversionRate} onChange={(e) => handleInvoiceChange(s.id, inv.id, 'conversionRate', e.target.value)} className="w-full border border-gray-300 rounded-md p-1 text-xs" readOnly={remittance.currency === inv.invCurrency} /></td>
                                                                <td className="p-1">{inv.invRealization.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                                <td className="p-1">{inv.fbCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    {s.linkedInvoices.length > 1 && (
                                                        <tfoot className="bg-gray-100 font-bold">
                                                            <tr>
                                                                <td colSpan="3" className="p-2 text-right">Total</td>
                                                                <td className="p-2">{invoiceTotals.totalUtil.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                                <td className="p-2"></td>
                                                                <td className="p-2">{invoiceTotals.totalRealized.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                                <td className="p-2">{invoiceTotals.totalFbCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                            </tr>
                                                        </tfoot>
                                                    )}
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    
                    {/* Checker and Submit */}
                    <div className="pt-6 flex justify-end items-center space-x-4 border-t mt-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Checker</label>
                            <select name="checker" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option>No Checker</option>
                            </select>
                        </div>
                        <div className="pt-5">
                           <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
                           <button type="submit" className="ml-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Submit</button>
                        </div>
                    </div>
                </form>
            </div>
            
            {/* Render sub-modals */}
            {modalState.isDealModalOpen && (
                <DealDetailsModal
                    remittance={remittance}
                    settlement={modalState.currentSettlement}
                    onSave={handleSaveDeals}
                    onClose={() => closeModal('Deal')}
                />
            )}
            {modalState.isInvoiceModalOpen && (
                <FetchInvoicesModal
                    remittance={remittance}
                    settlement={modalState.currentSettlement}
                    onProceed={handleProceedWithInvoices}
                    onClose={() => closeModal('Invoice')}
                />
            )}
        </div>
    );
}


// --- MAIN DASHBOARD COMPONENT ---
export default function RemittanceDashboard() {

    // --- STATE MANAGEMENT ---
    const [remittances, setRemittances] = useState(initialRemittanceData);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
    const [selectedRemittance, setSelectedRemittance] = useState(null);
    const [activeSettlementTab, setActiveSettlementTab] = useState(null);
    const [currentFilter, setCurrentFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    // --- State for new Settle Modal ---
    const [isSettleRemittanceModalOpen, setIsSettleRemittanceModalOpen] = useState(false);
    const [remittanceToSettle, setRemittanceToSettle] = useState(null);

    // --- DERIVED STATE & MEMOIZED CALCULATIONS ---
    const filterCounts = useMemo(() => {
        const counts = { 'All': 0, 'Utilized': 0, 'Part Utilized': 0, 'Un-utilized': 0, 'Outstanding': 0 };
        remittances.forEach(rem => {
            if (rem.settlements.length > 0) {
                rem.settlements.forEach(s => {
                    const status = getSettlementStatusInfo(s).text;
                    if (counts[status] !== undefined) counts[status]++;
                });
            } else {
                counts['Outstanding']++;
            }
        });
        counts['All'] = remittances.reduce((acc, rem) => acc + (rem.settlements.length || 1), 0);
        return counts;
    }, [remittances]);

    const filteredRemittances = useMemo(() => {
        return remittances.filter(rem => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm ||
                rem.remittanceRef.toLowerCase().includes(searchLower) ||
                rem.remitter.toLowerCase().includes(searchLower) ||
                rem.senderBankRef.toLowerCase().includes(searchLower);

            return matchesSearch;
        });
    }, [remittances, searchTerm]);


    // --- EVENT HANDLERS ---
    const handleAddRemittance = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const instructedValue = parseFloat(data.remittanceInstructedValue);
        const charges = parseFloat(data.fbChargesDeducted);

        const newRemittance = {
            remittanceRef: data.remittanceRef,
            remittanceDate: data.remittanceDate,
            senderBankRef: data.senderBankRef,
            senderBankRefDate: data.senderBankRefDate,
            remitter: data.remitter,
            remittanceInstructedValue: instructedValue,
            fbChargesDeducted: charges,
            remittanceNetValue: instructedValue - charges,
            currency: data.currency.toUpperCase(),
            partyDetails: { name: data.remitter, customerCode: 'N/A', address: 'N/A' },
            bankDetails: { name: 'N/A', swift: 'N/A', country: 'N/A' },
            settlements: []
        };

        setRemittances([newRemittance, ...remittances]);
        setIsAddModalOpen(false);
        e.target.reset();
    };

    const handleViewDetails = (remittance) => {
        setSelectedRemittance(remittance);
        if (remittance.settlements.length > 0) {
            setActiveSettlementTab(remittance.settlements[0].settlementNumber);
        } else {
            setActiveSettlementTab(null);
        }
        setIsSettlementModalOpen(true);
    };

    // --- Handlers for new Settle Modal ---
    const handleOpenSettleModal = (remittance) => {
        setRemittanceToSettle(remittance);
        setIsSettleRemittanceModalOpen(true);
        setIsSettlementModalOpen(false); // Close the "View" modal
    };

    const handleCloseSettleModal = () => {
        setRemittanceToSettle(null);
        setIsSettleRemittanceModalOpen(false);
    };

    const handleSettleSubmit = (remittanceRef, finalSettlements) => {
        // Update the main remittances list with the new settlement data
        setRemittances(prevRemittances =>
            prevRemittances.map(rem =>
                rem.remittanceRef === remittanceRef
                    ? { ...rem, settlements: finalSettlements }
                    : rem
            )
        );
        handleCloseSettleModal(); // Close the modal on success
    };
    
    // --- RENDER LOGIC ---

    const renderTableRows = () => {
        const rows = [];
        filteredRemittances.forEach(rem => {
            let settlementsToDisplay = rem.settlements;
            let isOutstandingRemittance = rem.settlements.length === 0;

            if (currentFilter !== 'All') {
                if (isOutstandingRemittance) {
                    if (currentFilter !== 'Outstanding') return;
                } else {
                    settlementsToDisplay = rem.settlements.filter(s => getSettlementStatusInfo(s).text === currentFilter);
                    if (settlementsToDisplay.length === 0) return;
                }
            }

            const groupRowCount = settlementsToDisplay.length > 0 ? settlementsToDisplay.length : 1;

            if (!isOutstandingRemittance) {
                settlementsToDisplay.forEach((settlement, index) => {
                    const statusInfo = getSettlementStatusInfo(settlement);
                    rows.push(
                        <tr key={settlement.settlementNumber} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <div className="font-semibold text-gray-800">{settlement.settlementNumber}</div>
                                <div className="text-xs text-gray-500">{settlement.creditAmountFCY.toLocaleString('en-IN')} {rem.currency}</div>
                            </td>
                            {index === 0 && (
                                <>
                                    <td className="px-6 py-4" rowSpan={groupRowCount}>
                                        <div>{rem.remittanceRef}</div>
                                        <div className="text-xs text-gray-500">{formatDate(rem.remittanceDate)}</div>
                                        <div className="text-sm font-bold text-gray-700 mt-1">Net: {rem.remittanceNetValue.toLocaleString('en-IN')} {rem.currency}</div>
                                        <div className="text-xs text-gray-500 mt-2">Instructed: {rem.remittanceInstructedValue.toLocaleString('en-IN')} {rem.currency}</div>
                                        <div className="text-xs text-gray-500">Charges: -{rem.fbChargesDeducted.toLocaleString('en-IN')} {rem.currency}</div>
                                    </td>
                                    <td className="px-6 py-4" rowSpan={groupRowCount}>
                                        <div>{rem.senderBankRef}</div>
                                        <div className="text-xs text-gray-500">{formatDate(rem.senderBankRefDate)}</div>
                                    </td>
                                    <td className="px-6 py-4" rowSpan={groupRowCount}>{rem.remitter}</td>
                                </>
                            )}
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.class}`}>{statusInfo.text}</span>
                            </td>
                            <td className="px-6 py-4">
                                <div>{settlement.purposeCode}</div>
                                <div className="text-xs text-gray-500">{settlement.purposeDescription}</div>
                            </td>
                            {index === 0 && (
                                <td className="px-6 py-4 text-center align-middle" rowSpan={groupRowCount}>
                                    <button onClick={() => handleViewDetails(rem)} className="font-medium text-indigo-600 hover:text-indigo-800">View Details</button>
                                </td>
                            )}
                        </tr>
                    );
                });
            } else { // Outstanding remittance
                 rows.push(
                    <tr key={rem.remittanceRef} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4 italic text-gray-500">No settlement yet</td>
                        <td className="px-6 py-4">
                            <div>{rem.remittanceRef}</div>
                            <div className="text-xs text-gray-500">{formatDate(rem.remittanceDate)}</div>
                            <div className="text-sm font-bold text-gray-700 mt-1">Net: {rem.remittanceNetValue.toLocaleString('en-IN')} {rem.currency}</div>
                            <div className="text-xs text-gray-500 mt-2">Instructed: {rem.remittanceInstructedValue.toLocaleString('en-IN')} {rem.currency}</div>
                            <div className="text-xs text-gray-500">Charges: -{rem.fbChargesDeducted.toLocaleString('en-IN')} {rem.currency}</div>
                        </td>
                        <td className="px-6 py-4">
                            <div>{rem.senderBankRef}</div>
                            <div className="text-xs text-gray-500">{formatDate(rem.senderBankRefDate)}</div>
                        </td>
                        <td className="px-6 py-4">{rem.remitter}</td>
                        <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Outstanding</span>
                        </td>
                        <td className="px-6 py-4 italic text-gray-500">N/A</td>
                        <td className="px-6 py-4 text-center align-middle">
                            <button onClick={() => handleViewDetails(rem)} className="font-medium text-indigo-600 hover:text-indigo-800">View Details</button>
                        </td>
                    </tr>
                );
            }
        });
        return rows;
    };


    return (
        <div className="flex h-screen bg-gray-100 text-gray-800 font-sans">
            {/* Expandable Sidebar */}
            <aside className={`sidebar bg-white text-gray-800 p-4 flex flex-col justify-between shadow-lg transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
                <div>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-indigo-600"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                            <span className={`logo-text ml-3 text-xl font-bold transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>FinSaaS</span>
                        </div>
                    </div>
                    <nav>
                        <ul>
                            <li className="mb-2">
                                <a
                                  href="#" // Add placeholder href
                                  onClick={(e) => {
                                      e.preventDefault(); // Prevent default anchor tag behavior
                                      router.push('/'); // Navigate to Invoice Dashboard
                                  }} className="flex items-center p-3 text-gray-600 hover:bg-gray-200 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect width="8" height="8" x="2" y="2" rx="2" /><rect width="8" height="8" x="14" y="2" rx="2" /><rect width="8" height="8" x="2" y="14" rx="2" /><rect width="8" height="8" x="14" y="14" rx="2" /></svg>
                                    <span className={`sidebar-text ml-4 ${isSidebarCollapsed ? 'hidden' : ''}`}>Invoice Dashboard</span>
                                </a>
                            </li>
                            <li className="mb-2">
                                <a
                                  href="#" // Add placeholder href
                                  onClick={(e) => {
                                      e.preventDefault(); // Prevent default anchor tag behavior
                                      router.push('/remittance'); // Navigate to Invoice Dashboard
                                  }} className="flex items-center p-3 text-white bg-indigo-600 rounded-lg font-semibold">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="m17 9 4 4-4 4" /><path d="m3 13h18" /><path d="m7 15-4-4 4-4" /><path d="m3 5h18" /></svg>
                                    <span className={`sidebar-text ml-4 ${isSidebarCollapsed ? 'hidden' : ''}`}>Remittance Dashboard</span>
                                </a>
                            </li>
                             {/* ... other nav items ... */}
                        </ul>
                    </nav>
                </div>
                <div>
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="flex items-center p-3 text-gray-600 hover:bg-gray-200 rounded-lg w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 transform transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`}>
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                        <span className={`sidebar-text ml-4 ${isSidebarCollapsed ? 'hidden' : ''}`}>Collapse</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Remittance Dashboard</h1>
                    <p className="text-gray-500 mt-1">Track and manage all incoming remittances and their settlements.</p>
                </header>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="w-1/3">
                            <input
                                type="text"
                                placeholder="Search by Reference #, Remitter..."
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add New Remittance
                        </button>
                    </div>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap gap-2 mb-4 border-b pb-4">
                        {Object.keys(filterCounts).map(filter => (
                            <button
                                key={filter}
                                onClick={() => setCurrentFilter(filter)}
                                className={`transition-colors duration-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-2 ${
                                    currentFilter === filter
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border'
                                }`}
                            >
                                <span>{filter}</span>
                                <span className={`text-xs font-bold px-2 rounded-full ${
                                    currentFilter === filter
                                        ? 'bg-white text-indigo-600' // Inverted colors when active
                                        : filterBadgeColors[filter]  // Colorful badge when inactive
                                }`}>
                                    {filterCounts[filter]}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Remittance Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Settlement Details</th>
                                    <th scope="col" className="px-6 py-3">Remittance Details</th>
                                    <th scope="col" className="px-6 py-3">Sender Reference</th>
                                    <th scope="col" className="px-6 py-3">Remitter</th>
                                    <th scope="col" className="px-6 py-3">Settlement Status</th>
                                    <th scope="col" className="px-6 py-3">Purpose</th>
                                    <th scope="col" className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderTableRows()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Add Remittance Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="modal bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col">
                        <div className="p-5 border-b flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Add New Outstanding Remittance</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddRemittance} className="p-6 space-y-4">
                            {/* Form fields... */}
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Remittance Ref #</label>
                                    <input type="text" name="remittanceRef" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Remittance Date</label>
                                    <input type="date" name="remittanceDate" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sender Ref #</label>
                                    <input type="text" name="senderBankRef" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sender Ref Date</label>
                                    <input type="date" name="senderBankRefDate" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Remitter</label>
                                <input type="text" name="remitter" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Instructed Value (FCY)</label>
                                    <input type="number" step="0.01" name="remittanceInstructedValue" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">FB Charges Deducted (FCY)</label>
                                    <input type="number" step="0.01" name="fbChargesDeducted" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" defaultValue="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                                    <input type="text" name="currency" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required placeholder="e.g., USD" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
                                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Add Remittance</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Settlement Details Modal (View Only) */}
            {isSettlementModalOpen && selectedRemittance && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="modal bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
                        <div className="p-5 border-b flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Settlement Details</h2>
                            <button onClick={() => setIsSettlementModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            {/* Top Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <h3 className="font-semibold text-lg mb-2">Party Details</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                        <span className="font-medium text-gray-500">Remitter Name:</span> <span>{selectedRemittance.partyDetails.name}</span>
                                        <span className="font-medium text-gray-500">Customer Code:</span> <span>{selectedRemittance.partyDetails.customerCode}</span>
                                        <span className="font-medium text-gray-500">Address:</span> <span>{selectedRemittance.partyDetails.address}</span>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <h3 className="font-semibold text-lg mb-2">Bank Details</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                        <span className="font-medium text-gray-500">Bank Name:</span> <span>{selectedRemittance.bankDetails.name}</span>
                                        <span className="font-medium text-gray-500">SWIFT Code:</span> <span>{selectedRemittance.bankDetails.swift}</span>
                                        <span className="font-medium text-gray-500">Country:</span> <span>{selectedRemittance.bankDetails.country}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Remittance Summary */}
                            <div className="mb-6">
                                <h3 className="font-semibold text-lg mb-2 text-gray-800">Remittance Summary</h3>
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-indigo-200">
                                            <tr>
                                                <td className="p-2 font-medium text-gray-500">Sender Ref</td>
                                                <td className="p-2">{selectedRemittance.senderBankRef} ({formatDate(selectedRemittance.senderBankRefDate)})</td>
                                                <td className="p-2 font-medium text-gray-500">Remittance Ref</td>
                                                <td className="p-2">{selectedRemittance.remittanceRef} ({formatDate(selectedRemittance.remittanceDate)})</td>
                                            </tr>
                                            <tr>
                                                <td className="p-2 font-medium text-gray-500">Instructed Value</td>
                                                <td className="p-2">{selectedRemittance.remittanceInstructedValue.toLocaleString('en-IN')} {selectedRemittance.currency}</td>
                                                <td className="p-2 font-medium text-gray-500">FB Charges Deducted</td>
                                                <td className="p-2">-{selectedRemittance.fbChargesDeducted.toLocaleString('en-IN')} {selectedRemittance.currency}</td>
                                            </tr>
                                            <tr>
                                                <td className="p-2 font-medium text-gray-500 text-base">Net Remittance Value</td>
                                                <td className="p-2 font-bold text-lg text-indigo-700" colSpan="3">{selectedRemittance.remittanceNetValue.toLocaleString('en-IN')} {selectedRemittance.currency}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Settlement Tabs */}
                            <div>
                                <div className="border-b border-gray-200">
                                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                        {selectedRemittance.settlements.map(s => (
                                            <button
                                                key={s.settlementNumber}
                                                onClick={() => setActiveSettlementTab(s.settlementNumber)}
                                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeSettlementTab === s.settlementNumber ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                            >
                                                {s.settlementNumber}
                                            </button>
                                        ))}
                                    </nav>
                                </div>
                                <div className="py-5">
                                    {selectedRemittance.settlements.length > 0 ? selectedRemittance.settlements.map(s => {
                                        if (s.settlementNumber !== activeSettlementTab) return null;

                                        const totalUtilized = (s.linkedInvoices || []).reduce((sum, inv) => sum + inv.remUtilization, 0);
                                        const outstanding = s.creditAmountFCY - totalUtilized;
                                        const proRataCharges = (selectedRemittance.remittanceNetValue > 0) ? (selectedRemittance.fbChargesDeducted * (s.creditAmountFCY / selectedRemittance.remittanceNetValue)).toFixed(2) : '0.00';
                                        
                                        return (
                                            <div key={s.settlementNumber}>
                                                {/* This content is simplified. You can build this out just like the Settle Modal if needed */}
                                                <h3 className="text-lg font-semibold">{s.purposeDescription}</h3>
                                                <p>Amount: {s.creditAmountFCY.toLocaleString('en-IN')} {selectedRemittance.currency}</p>
                                                <p>Account: {s.creditAccount}</p>
                                                
                                                {(s.linkedInvoices && s.linkedInvoices.length > 0) && (
                                                   <div className="mt-4">
                                                       <h4 className="font-semibold">Linked Invoices</h4>
                                                       {/* You can map over s.linkedInvoices here to show them */}
                                                   </div>
                                                )}
                                            </div>
                                        );
                                    }) : (
                                        <div className="text-center p-8 bg-gray-50 rounded-lg">
                                            <h3 className="text-lg font-medium">Remittance Outstanding</h3>
                                            <p className="text-gray-600 mb-4">This remittance is not yet settled.</p>
                                            <button 
                                                onClick={() => handleOpenSettleModal(selectedRemittance)}
                                                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                                            >
                                                Settle Now
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
            )}

            {/* Settle Remittance Modal */}
            {isSettleRemittanceModalOpen && remittanceToSettle && (
                <SettleRemittanceModal
                    remittance={remittanceToSettle}
                    onClose={handleCloseSettleModal}
                    onSettleSubmit={handleSettleSubmit}
                />
            )}
            
        </div>
    );
}