'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';


// --- MOCK DATA (Should ideally come from API/Props) ---
const initialInvoiceData = [
    { sbNumber: 'SB-2025-001', sbDate: '2025-10-05', customer: 'GlobeTech Inc.', invoices: [ { invNumber: 'INV-1022', invDate: '2025-10-01', invValue: 185000, currency: 'USD', realized: 149500, outstanding: 35500, fbCharges: 500, reduction: 0, dueDate: '2025-12-15', status: 'Part Realized', remittances: [ { settlementNumber: 'FIRC-CT-001', remDate: '2025-12-10', remCurrency: 'USD', remValue: 150000, remittanceUtilizationFCY: 149500, fbCharges: 500, conversionRate: 1.0, invoiceRealizationValue: 149500, remitterName: 'GlobeTech Inc.', remitterCode: 'GT-001', remNumber: 'FIRC-CT-001', instructedValue: 150000 } ], documents: { invoiceCopy: 'https://placehold.co/600x840?text=Invoice+INV-1022', blCopy: 'https://placehold.co/600x840?text=BL+Copy+for+SB-2025-001' } }, ], partyDetails: { name: 'GlobeTech Inc.', customerCode: 'GT-001', address: '123 Innovation Drive, Silicon Valley, CA', contact: 'John Doe', email: 'john.doe@globetech.com' }, sbDetails: { portCode: 'INNSA1', sbValue: '185,000 USD', shippingLine: 'Maersk', vessel: 'MSC Isabella' }, poDetails: { pos: [{ id: 'PO-GT-750', value: '185,000 USD' }] }, soDetails: { sos: [{ id: 'SO-GT-881', value: '185,000 USD' }] }, preShipment: { details: 'Pre-shipment financing availed from XYZ Bank.', amount: '100,000 USD', status: 'Settled' }, commercialInvoice: { proforma: 'PI-GT-601', linkedPIs: [{id: 'PI-GT-601', value: '185,000 USD'}], details: 'Commercial invoice matches proforma.' }, },
    { sbNumber: 'SB-2025-002', sbDate: '2025-10-08', customer: 'Quantum Solutions', invoices: [ { invNumber: 'INV-1023', invDate: '2025-10-02', invValue: 85000, currency: 'EUR', realized: 0, outstanding: 85000, fbCharges: 0, reduction: 0, dueDate: '2025-12-20', status: 'Outstanding', remittances: [], documents: { invoiceCopy: 'https://placehold.co/600x840?text=Invoice+INV-1023', blCopy: 'https://placehold.co/600x840?text=BL+Copy+for+SB-2025-002' } }, ], partyDetails: { name: 'Quantum Solutions', customerCode: 'QS-002', address: '456 Quantum Realm, Berlin, Germany', contact: 'Jane Smith', email: 'jane.s@quantum.de' }, sbDetails: { portCode: 'DEHAM', sbValue: '85,000 EUR', shippingLine: 'Hapag-Lloyd', vessel: 'Evergreen' }, poDetails: { pos: [{ id: 'PO-QS-301', value: '85,000 EUR' }] }, soDetails: { sos: [] }, preShipment: { details: 'No pre-shipment financing.', amount: 'N/A', status: 'N/A' }, commercialInvoice: { proforma: 'PI-QS-210', linkedPIs: [{id: 'PI-QS-210', value: '85,000 EUR'}], details: 'Invoice sent to customer.' }, },
    { sbNumber: 'SB-2025-003', sbDate: '2025-10-12', customer: 'Nexus Systems', invoices: [ { invNumber: 'INV-1024', invDate: '2025-10-10', invValue: 220000, currency: 'GBP', realized: 100000, outstanding: 119750, fbCharges: 250, reduction: 0, dueDate: '2026-01-10', status: 'Part Realized', remittances: [ { settlementNumber: 'FIRC-HSBC-002', remDate: '2025-12-28', remCurrency: 'USD', remValue: 125312, remittanceUtilizationFCY: 125000, fbCharges: 312, conversionRate: 0.8, invoiceRealizationValue: 100000, remitterName: 'Nexus Systems', remitterCode: 'NS-003', remNumber: 'FIRC-HSBC-002', instructedValue: 125624 } ], documents: { invoiceCopy: 'https://placehold.co/600x840?text=Invoice+INV-1024', blCopy: 'https://placehold.co/600x840?text=BL+Copy+for+SB-2025-003' } }, { invNumber: 'INV-1025', invDate: '2025-10-11', invValue: 50000, currency: 'GBP', realized: 49950, outstanding: 0, fbCharges: 50, reduction: 0, dueDate: '2026-01-10', status: 'Closed / Realized', remittances: [ { settlementNumber: 'FIRC-HSBC-003', remDate: '2026-01-02', remCurrency: 'GBP', remValue: 50050, remittanceUtilizationFCY: 49950, fbCharges: 50, conversionRate: 1.0, invoiceRealizationValue: 49950, remitterName: 'Nexus Systems', remitterCode: 'NS-003', remNumber: 'FIRC-HSBC-003', instructedValue: 50000 } ], documents: { invoiceCopy: 'https://placehold.co/600x840?text=Invoice+INV-1025', blCopy: 'https://placehold.co/600x840?text=BL+Copy+for+SB-2025-003' } } ], partyDetails: { name: 'Nexus Systems', customerCode: 'NS-003', address: '789 Tech Park, London, UK', contact: 'Robert Brown', email: 'r.brown@nexus.uk' }, sbDetails: { portCode: 'GBFXT', sbValue: '270,000 GBP', shippingLine: 'CMA CGM', vessel: 'Ocean King' }, poDetails: { pos: [{ id: 'PO-NS-901', value: '200,000 GBP' }, { id: 'PO-NS-902', value: '70,000 GBP' }] }, soDetails: { sos: [{ id: 'SO-NS-1101', value: '270,000 GBP' }] }, preShipment: { details: 'Export packing credit availed.', amount: '180,000 GBP', status: 'Partially settled' }, commercialInvoice: { proforma: 'PI-NS-850', linkedPIs: [{id: 'PI-NS-850', value: '270,000 GBP'}], details: 'Two invoices generated against one PI.' }, },
    { sbNumber: 'SB-2025-007', sbDate: '2025-10-28', customer: 'Cyberdyne Systems', invoices: [ { invNumber: 'INV-1030', invDate: '2025-10-26', invValue: 3000000, currency: 'JPY', realized: 1000000, outstanding: 1980000, fbCharges: 15000, reduction: 5000, dueDate: '2026-02-15', status: 'Part Realized', remittances: [ { settlementNumber: 'FIRC-MIZ-005', remDate: '2026-02-10', remCurrency: 'JPY', remValue: 1020000, remittanceUtilizationFCY: 1000000, fbCharges: 15000, conversionRate: 1.0, invoiceRealizationValue: 1000000, remitterName: 'Cyberdyne Systems', remitterCode: 'CS-007', remNumber: 'FIRC-MIZ-005', instructedValue: 1020000 } ], documents: { invoiceCopy: 'https://placehold.co/600x840?text=Invoice+INV-1030', blCopy: 'https://placehold.co/600x840?text=BL+Copy+for+SB-2025-007' } } ], partyDetails: { name: 'Cyberdyne Systems', customerCode: 'CS-007', address: '18144 El Camino Real, Sunnyvale, CA', contact: 'Miles Dyson', email: 'dyson@cyberdyne.com' }, sbDetails: { portCode: 'JPTYO', sbValue: '3,000,000 JPY', shippingLine: 'NYK Line', vessel: 'Skynet' }, poDetails: { pos: [{ id: 'PO-CS-T800', value: '3,000,000 JPY' }] }, soDetails: { sos: [{ id: 'SO-CS-T800', value: '3,000,000 JPY' }] }, preShipment: { details: 'N/A', amount: 'N/A', status: 'N/A' }, commercialInvoice: { proforma: 'PI-CS-T800', linkedPIs: [{id: 'PI-CS-T800', value: '3,000,000 JPY'}], details: 'Quality dispute caused reduction.' }, reductionDetails: [ { amount: 5000, reason: 'Quality issues', attachmentUrl: 'https://placehold.co/600x840?text=Damage+Report' } ] },
    { sbNumber: 'SB-2025-008', sbDate: '2025-11-01', customer: 'Synergy Corp', invoices: [ { invNumber: 'INV-1031', invDate: '2025-10-28', invValue: 400000, currency: 'EUR', realized: 399400, outstanding: 0, fbCharges: 600, reduction: 0, dueDate: '2026-02-28', status: 'Closed / Realized', remittances: [ { settlementNumber: 'FIRC-DB-006A', remDate: '2026-02-20', remCurrency: 'EUR', remValue: 250400, remittanceUtilizationFCY: 249700, fbCharges: 400, conversionRate: 1.0, invoiceRealizationValue: 249700, remitterName: 'Synergy Corp', remitterCode: 'SC-008', remNumber: 'FIRC-DB-006A', instructedValue: 250400 }, { settlementNumber: 'FIRC-DB-006B', remDate: '2026-02-25', remCurrency: 'EUR', remValue: 150200, remittanceUtilizationFCY: 149700, fbCharges: 200, conversionRate: 1.0, invoiceRealizationValue: 149700, remitterName: 'Synergy Corp', remitterCode: 'SC-008', remNumber: 'FIRC-DB-006B', instructedValue: 150200 } ], documents: { invoiceCopy: 'https://placehold.co/600x840?text=Invoice+INV-1031', blCopy: 'https://placehold.co/600x840?text=BL+Copy+for+SB-2025-008' } }, ], partyDetails: { name: 'Synergy Corp', customerCode: 'SC-008', address: '200 Business Park, Singapore', contact: 'Chen Wei', email: 'chen.w@synergy.sg' }, sbDetails: { portCode: 'SGSIN', sbValue: '400,000 EUR', shippingLine: 'Evergreen', vessel: 'Synergy Spirit' }, poDetails: { pos: [{ id: 'PO-SC-1200', value: '400,000 EUR' }] }, soDetails: { sos: [{ id: 'SO-SC-1250', value: '400,000 EUR' }] }, preShipment: { details: 'N/A', amount: 'N/A', status: 'N/A' }, commercialInvoice: { proforma: 'PI-SC-1100', linkedPIs: [{id: 'PI-SC-1100', value: '400,000 EUR'}], details: 'Single invoice against PI.' }, }
];

const availableRemittancesData = [
    { id: 1, settlementNumber: 'SET-25-ADV1', settlementDate: '2025-10-15', remNumber: 'FIRC-JPM-010', remDate: '2025-10-15', instructedValue: 50000, fbCharges: 100, remValue: 49900, remCurrency: 'USD', senderRef: 'SNDR-REF-ADV1', senderRefDate: '2025-10-14', remitterName: 'Stellar Imports', remitterCode: 'SI-010', status: 'Un-utilized', purpose: 'Advance against export', outstanding: 49900 },
    { id: 2, settlementNumber: 'SET-25-SPLT1A', settlementDate: '2025-11-05', remNumber: 'FIRC-ANZ-005', remDate: '2025-11-05', instructedValue: 200000, fbCharges: 400, remValue: 199600, remCurrency: 'AUD', senderRef: 'SNDR-REF-SPLT1', senderRefDate: '2025-11-04', remitterName: 'Zenith Exports', remitterCode: 'ZE-011', status: 'Un-utilized', purpose: 'Advance against export', outstanding: 50000 },
    { id: 3, settlementNumber: 'SET-26-PART1', settlementDate: '2026-03-10', remNumber: 'FIRC-SCB-015', remDate: '2026-03-10', instructedValue: 100250, fbCharges: 250, remValue: 100000, remCurrency: 'USD', senderRef: 'SNDR-REF-PART1', senderRefDate: '2026-03-09', remitterName: 'Quantum Solutions', remitterCode: 'QS-015', status: 'Part Utilized', purpose: 'Export of Goods', outstanding: 20000 },
];


// --- UTILITY FUNCTIONS ---
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-IN'); // Use Indian locale
    } catch (e) {
        return 'Invalid Date';
    }
};

const formatNumber = (num) => {
    if (typeof num !== 'number') return 'N/A';
    return num.toLocaleString('en-IN'); // Use Indian locale
};

const getStatusClass = (status) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus === 'closed / realized') return 'bg-green-100 text-green-800';
    if (lowerStatus === 'part realized') return 'bg-yellow-100 text-yellow-800';
    if (lowerStatus === 'outstanding') return 'bg-red-100 text-red-800';
    if (lowerStatus === 'lodged') return 'bg-blue-100 text-blue-800';
    if (lowerStatus === 'pre-shipment') return 'bg-purple-100 text-purple-800';
    if (lowerStatus.includes('draft')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
};

// Apply status calculation initially (could be done on fetch in real app)
initialInvoiceData.forEach(sbGroup => {
    sbGroup.invoices.forEach(invoice => {
        if (!invoice.status) { // Only calculate if status is missing
            const calculatedOutstanding = (invoice.invValue || 0) - (invoice.realized || 0) - (invoice.fbCharges || 0) - (invoice.reduction || 0);
            invoice.outstanding = Math.max(0, calculatedOutstanding);
            if (invoice.outstanding <= 0.01) {
                invoice.status = 'Closed / Realized';
            } else if (invoice.realized > 0) {
                invoice.status = 'Part Realized';
            } else {
                invoice.status = 'Outstanding';
            }
        }
    });
});

// --- MODAL COMPONENTS ---

// --- AddInvoiceModal ---
function AddInvoiceModal({ isOpen, onClose, onSubmit }) {
    const [invoiceRows, setInvoiceRows] = useState([{ id: 1, invNumber: '', invDate: '', invValue: '', invCurrency: '', invDueDate: '' }]);
    const nextId = React.useRef(2);

    useEffect(() => {
        // Reset form when modal opens
        if (isOpen) {
            setInvoiceRows([{ id: 1, invNumber: '', invDate: '', invValue: '', invCurrency: '', invDueDate: '' }]);
            nextId.current = 2;
        }
    }, [isOpen]);

    const handleAddRow = () => {
        setInvoiceRows([...invoiceRows, { id: nextId.current++, invNumber: '', invDate: '', invValue: '', invCurrency: '', invDueDate: '' }]);
    };

    const handleRemoveRow = (idToRemove) => {
        if (invoiceRows.length > 1) {
            setInvoiceRows(invoiceRows.filter(row => row.id !== idToRemove));
        } else {
            alert("You must have at least one invoice.");
        }
    };

    const handleInputChange = (id, field, value) => {
        setInvoiceRows(invoiceRows.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        // Extract data and structure it as needed for onSubmit prop
        const data = Object.fromEntries(formData.entries());

        const checkerSelect = e.target.elements.checker;
        const checkerValue = checkerSelect.value;
        const checkerText = checkerSelect.options[checkerSelect.selectedIndex].text;
        let invoiceStatus;
        if (checkerValue === 'no_checker') {
            invoiceStatus = 'Outstanding';
        } else {
            invoiceStatus = `Draft - ${checkerText}`;
        }

        let totalValue = 0;
        let firstCurrency = '';

        const formattedInvoices = invoiceRows.map((row, index) => {
            const invValue = parseFloat(row.invValue || 0);
            if(index === 0) firstCurrency = row.invCurrency || 'N/A';
            totalValue += invValue;
            return {
                invNumber: row.invNumber,
                invDate: row.invDate,
                invValue: invValue,
                currency: row.invCurrency,
                realized: 0,
                outstanding: invValue,
                fbCharges: 0,
                reduction: 0,
                dueDate: row.invDueDate,
                status: invoiceStatus,
                remittances: [],
                documents: {
                    invoiceCopy: `https://placehold.co/600x840?text=Invoice+${row.invNumber}`,
                    blCopy: `https://placehold.co/600x840?text=BL+Copy+for+${data.sbNumber}`
                }
            };
        });

        if (formattedInvoices.length === 0 || !formattedInvoices[0].invNumber) {
            alert("Please add at least one valid invoice.");
            return;
        }
        
        const poString = data.poDetails;
        const soString = data.soDetails;

        const newSBGroup = {
            sbNumber: data.sbNumber,
            sbDate: data.sbDate,
            customer: data.customerName,
            invoices: formattedInvoices,
            partyDetails: {
                name: data.customerName,
                customerCode: data.customerCode,
                address: data.customerAddress || 'N/A',
                contact: data.customerContact || 'N/A',
                email: data.customerEmail || 'N/A'
            },
            sbDetails: {
                portCode: data.portCode || 'N/A',
                sbValue: `${formatNumber(totalValue)} ${firstCurrency}`,
                shippingLine: data.shippingLine || 'N/A',
                vessel: data.vessel || 'N/A'
            },
            poDetails: { pos: poString ? poString.split(',').map(id => ({ id: id.trim(), value: 'N/A' })) : [] },
            soDetails: { sos: soString ? soString.split(',').map(id => ({ id: id.trim(), value: 'N/A' })) : [] },
            preShipment: { details: 'N/A', amount: 'N/A', status: 'N/A' },
            commercialInvoice: { proforma: 'N/A', linkedPIs: [], details: 'N/A' },
        };

        onSubmit(newSBGroup); // Pass structured data up
        onClose(); // Close modal on successful submit
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="modal bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-5 border-b flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Add New Shipping Bill & Invoices</h2>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    {/* Body */}
                    <div className="p-6 flex-1 overflow-y-auto space-y-4">
                        {/* Party Details */}
                        <div className="border rounded-lg p-4">
                            <h3 className="font-semibold text-lg mb-2">Party Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input type="text" name="customerName" placeholder="Customer Name" className="p-2 border rounded" required />
                                <input type="text" name="customerCode" placeholder="Customer Code" className="p-2 border rounded" required />
                                <input type="email" name="customerEmail" placeholder="Customer Email" className="p-2 border rounded" />
                                <input type="text" name="customerContact" placeholder="Contact Person" className="p-2 border rounded" />
                                <input type="text" name="customerAddress" placeholder="Address" className="p-2 border rounded col-span-2" />
                            </div>
                        </div>
                        {/* Shipping Bill Details */}
                        <div className="border rounded-lg p-4">
                             <h3 className="font-semibold text-lg mb-2">Shipping Bill Details</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <input type="text" name="sbNumber" placeholder="Shipping Bill Number" className="p-2 border rounded" required/>
                                 <input type="date" name="sbDate" className="p-2 border rounded" required/>
                                 <input type="text" name="portCode" placeholder="Port Code" className="p-2 border rounded"/>
                                 <input type="text" name="shippingLine" placeholder="Shipping Line" className="p-2 border rounded"/>
                                 <input type="text" name="vessel" placeholder="Vessel Name" className="p-2 border rounded"/>
                             </div>
                         </div>
                        {/* Invoices Section */}
                        <div className="border rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-lg">Invoices</h3>
                                <button type="button" onClick={handleAddRow} className="text-sm bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600">Add Invoice</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-[2fr,2fr,1.5fr,1fr,2fr,min-content] gap-x-2 gap-y-1 text-sm font-medium text-gray-600 px-1 mb-2">
                                <label>Invoice #</label>
                                <label>Invoice Date</label>
                                <label>Value</label>
                                <label>Currency</label>
                                <label>Due Date</label>
                                <span className="w-8"></span>
                            </div>
                            <div className="space-y-2">
                                {invoiceRows.map((row) => (
                                    <div key={row.id} className="grid grid-cols-1 md:grid-cols-[2fr,2fr,1.5fr,1fr,2fr,min-content] gap-2 items-center">
                                        <input type="text" value={row.invNumber} onChange={(e) => handleInputChange(row.id, 'invNumber', e.target.value)} placeholder="e.g., INV-1234" className="p-2 border rounded" required />
                                        <input type="date" value={row.invDate} onChange={(e) => handleInputChange(row.id, 'invDate', e.target.value)} className="p-2 border rounded" required />
                                        <input type="number" step="any" value={row.invValue} onChange={(e) => handleInputChange(row.id, 'invValue', e.target.value)} placeholder="e.g., 150000" className="p-2 border rounded" required />
                                        <input type="text" value={row.invCurrency} onChange={(e) => handleInputChange(row.id, 'invCurrency', e.target.value)} placeholder="USD" className="p-2 border rounded" required />
                                        <input type="date" value={row.invDueDate} onChange={(e) => handleInputChange(row.id, 'invDueDate', e.target.value)} className="p-2 border rounded w-full" required />
                                        <button type="button" onClick={() => handleRemoveRow(row.id)} className="remove-invoice-row text-red-500 hover:text-red-700 p-1 rounded-full flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Linked Documents */}
                        <div className="border rounded-lg p-4">
                             <h3 className="font-semibold text-lg mb-2">Linked Documents (Optional)</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <input type="text" name="poDetails" placeholder="PO Numbers (comma-separated)" className="p-2 border rounded"/>
                                 <input type="text" name="soDetails" placeholder="SO Numbers (comma-separated)" className="p-2 border rounded"/>
                             </div>
                         </div>
                        {/* Submission */}
                        <div className="border rounded-lg p-4">
                            <h3 className="font-semibold text-lg mb-2">Submission</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="assign-checker" className="block text-sm font-medium text-gray-700">Assign to Checker</label>
                                    <select id="assign-checker" name="checker" className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required defaultValue="">
                                        <option value="" disabled>Select a user...</option>
                                        <option value="checker_a">Checker A (Alice)</option>
                                        <option value="checker_b">Checker B (Bob)</option>
                                        <option value="checker_c">Checker C (Charlie)</option>
                                        <option value="no_checker">No Checker (Direct Submit)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Submit for Approval</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- DetailsModal ---
// ... (DetailsModal component needs to be created, managing its own tabs state)
// This is complex, will create a simplified version first.

function DetailsModal({ isOpen, onClose, data }) {
    const [activeTab, setActiveTab] = useState('custominv'); // Default tab
    const [activeSubTab, setActiveSubTab] = useState(data?.invoices?.[0]?.invNumber || null);
    const [openPopoverInv, setOpenPopoverInv] = useState(null);

    useEffect(() => {
        // Reset to default tab when data changes (modal opens)
        if (data) {
            setActiveTab('custominv');
            setActiveSubTab(data.invoices?.[0]?.invNumber || null);
            setOpenPopoverInv(null);
        }
    }, [data]);

     const handlePopoverToggle = (invNumber, event) => {
        event.stopPropagation(); // Prevent closing immediately
        setOpenPopoverInv(prev => (prev === invNumber ? null : invNumber));
     };

     // Close popover if clicking outside
     useEffect(() => {
        const handleClickOutside = () => setOpenPopoverInv(null);
        if (openPopoverInv) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [openPopoverInv]);


    const getTabContent = (tabId, modalData) => {
         // ... (Logic from vanilla JS getTabContent, adapted for React)
         switch(tabId) {
             case 'po': return ( <div><h4>PO Details</h4> {/* ... JSX ... */}</div> );
             case 'so': return ( <div><h4>SO Details</h4> {/* ... JSX ... */}</div> );
             case 'preship': return ( <div><h4>Pre-shipment</h4> {/* ... JSX ... */}</div> );
             case 'comminv': return ( <div><h4>Commercial Invoice</h4> {/* ... JSX ... */}</div> );
             case 'custominv':
                 if (!modalData?.invoices) return <p>No invoice data available.</p>;

                 if (modalData.invoices.length > 1) {
                     return (
                         <div className="sub-tabs-container">
                             <nav className="-mb-px flex space-x-6 border-b border-gray-200" aria-label="Tabs">
                                 {modalData.invoices.map((inv) => (
                                     <button
                                         key={inv.invNumber}
                                         onClick={() => setActiveSubTab(inv.invNumber)}
                                         className={`sub-tab-button whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                                             activeSubTab === inv.invNumber ? 'active border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                         }`}
                                     >
                                         {inv.invNumber}
                                     </button>
                                 ))}
                             </nav>
                             <div className="sub-tab-content pt-5">
                                 {modalData.invoices.map((inv) => (
                                     <div key={inv.invNumber} className={`sub-tab-pane ${activeSubTab === inv.invNumber ? '' : 'hidden'}`}>
                                         {/* Render Invoice Summary, Remittances, Reduction, Mapping form for THIS inv */}
                                         <InvoiceDetailContent invoice={inv} sbData={modalData} openPopoverInv={openPopoverInv} handlePopoverToggle={handlePopoverToggle} />
                                     </div>
                                 ))}
                             </div>
                         </div>
                     );
                 } else {
                     const inv = modalData.invoices[0];
                     return (
                         <div className="pt-5">
                             {/* Render Invoice Summary, Remittances, Reduction, Mapping form for the single inv */}
                            <InvoiceDetailContent invoice={inv} sbData={modalData} openPopoverInv={openPopoverInv} handlePopoverToggle={handlePopoverToggle} />
                         </div>
                     );
                 }
             default: return 'Content not available.';
         }
     };

    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="modal bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center">
                     <h2 className="text-2xl font-bold">Shipping Bill Details: {data.sbNumber}</h2>
                     <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                     </button>
                 </div>
                 {/* Body */}
                 <div className="p-6 flex-1 overflow-y-auto">
                    {/* Top Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="font-semibold text-lg mb-2">Party Details</h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <span className="font-medium text-gray-500">Customer Name:</span> <span>{data.partyDetails?.name}</span>
                                <span className="font-medium text-gray-500">Customer Code:</span> <span>{data.partyDetails?.customerCode}</span>
                                <span className="font-medium text-gray-500">Address:</span> <span>{data.partyDetails?.address}</span>
                                <span className="font-medium text-gray-500">Contact Person:</span> <span>{data.partyDetails?.contact}</span>
                                <span className="font-medium text-gray-500">Email:</span> <span>{data.partyDetails?.email}</span>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border">
                             <h3 className="font-semibold text-lg mb-2">Shipping Bill Summary</h3>
                             <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                 <span className="font-medium text-gray-500">Port Code:</span> <span>{data.sbDetails?.portCode}</span>
                                 <span className="font-medium text-gray-500">Total Value:</span> <span>{data.sbDetails?.sbValue}</span>
                                 <span className="font-medium text-gray-500">Shipping Line:</span> <span>{data.sbDetails?.shippingLine}</span>
                                 <span className="font-medium text-gray-500">Vessel:</span> <span>{data.sbDetails?.vessel}</span>
                             </div>
                        </div>
                    </div>
                     {/* Tabs Section */}
                    <div>
                         <div className="border-b border-gray-200">
                             <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                 {[
                                     { id: 'po', name: 'PO' },
                                     { id: 'so', name: 'SO' },
                                     { id: 'preship', name: 'Pre-shipment' },
                                     { id: 'comminv', name: 'Commercial Invoice' },
                                     { id: 'custominv', name: 'Custom Invoice' }
                                 ].map((tab) => (
                                      <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        {tab.name}
                                    </button>
                                 ))}
                             </nav>
                         </div>
                         <div className="py-5">
                             {/* Render active tab content */}
                             {getTabContent(activeTab, data)}
                         </div>
                    </div>
                 </div>
            </div>
        </div>
    );
}

// Sub-component to render details within the 'Custom Invoice' tab
function InvoiceDetailContent({ invoice, sbData, openPopoverInv, handlePopoverToggle }) {

    const handleOpenFetchRemittances = (invNumber) => {
        // Here you would typically set state to show the FetchRemittancesModal
        console.log("Open fetch remittances for:", invNumber);
        // Example: openFetchRemittanceModal(invNumber); // Needs state lift up or context
    };

    return (
        <div>
            {/* Invoice Summary Table */}
            <h4 className="font-semibold mb-2">Invoice Summary</h4>
            <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                    {/* ...thead... */}
                    <tbody>
                         <tr className="border-b">
                             <td className="p-2">
                                 <div className="font-bold">{invoice.invNumber}</div>
                                 <div className="text-xs">Date: {formatDate(invoice.invDate)}</div>
                                 <div className="text-xs">Due: {formatDate(invoice.dueDate)}</div>
                             </td>
                             <td className="p-2">{formatNumber(invoice.invValue)} {invoice.currency}</td>
                             <td className="p-2">{formatNumber(invoice.realized)} {invoice.currency}</td>
                             <td className="p-2">{formatNumber(invoice.fbCharges)} {invoice.currency}</td>
                             <td className="p-2">{formatNumber(invoice.reduction)} {invoice.currency}</td>
                             <td className="p-2 text-red-600">{formatNumber(invoice.outstanding)} {invoice.currency}</td>
                             <td className="p-2"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(invoice.status)}`}>{invoice.status}</span></td>
                             <td className="p-2">
                                 <div className="relative">
                                      <button
                                        onClick={(e) => handlePopoverToggle(invoice.invNumber, e)}
                                        className="text-indigo-600 hover:text-indigo-800"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                                      </button>
                                     {openPopoverInv === invoice.invNumber && (
                                         <div className="docs-popover show" onClick={(e) => e.stopPropagation()}>
                                             <div className="p-2 text-xs">
                                                 <a href={invoice.documents?.invoiceCopy || '#'} target="_blank" rel="noreferrer" className="block p-2 hover:bg-gray-100 rounded">Invoice Copy</a>
                                                 <a href={invoice.documents?.blCopy || '#'} target="_blank" rel="noreferrer" className="block p-2 hover:bg-gray-100 rounded">BL Copy</a>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             </td>
                         </tr>
                    </tbody>
                </table>
            </div>

            {/* Remittance Table */}
            <h4 className="font-semibold mt-4 mb-2">Linked Remittance Details</h4>
            {invoice.remittances && invoice.remittances.length > 0 ? (
                 <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                       <thead className="bg-gray-100">
                             <tr>
                                 <th className="p-2 text-left font-semibold">Settlement Details</th>
                                 <th className="p-2 text-left font-semibold">Remittance Details</th>
                                 <th className="p-2 text-left font-semibold">Remitter</th>
                                 <th className="p-2 text-left font-semibold">IRM Utilized (in FCY)</th>
                                 <th className="p-2 text-left font-semibold">Conv. Rate</th>
                                 <th className="p-2 text-left font-semibold">Invoice Realized</th>
                                 <th className="p-2 text-left font-semibold">FB Charges</th>
                             </tr>
                         </thead>
                        <tbody>
                            {invoice.remittances.map((rem, idx) => (
                                <tr key={idx} className="border-b">
                                     <td className="p-2">
                                         <div>{rem.settlementNumber || rem.fircNumber}</div>
                                         <div className="text-xs text-gray-500">{formatDate(rem.settlementDate || rem.remDate)}</div>
                                     </td>
                                     <td className="p-2">
                                         <div>{rem.remNumber}</div>
                                         <div className="text-xs text-gray-500">{formatDate(rem.remDate)}</div>
                                         <div className="text-xs text-gray-500">Net: {formatNumber(rem.remValue)} | Ins: {formatNumber(rem.instructedValue)} | Charges: {formatNumber(rem.fbCharges)}</div>
                                     </td>
                                     <td className="p-2">
                                         <div>{rem.remitterName}</div>
                                         <div className="text-xs text-gray-500">{rem.remitterCode || 'N/A'}</div>
                                     </td>
                                     <td className="p-2">{formatNumber(rem.remittanceUtilizationFCY)} {rem.remCurrency}</td>
                                     <td className="p-2">{(rem.conversionRate || 0).toFixed(4)}</td>
                                     <td className="p-2">{formatNumber(rem.invoiceRealizationValue)} {invoice.currency}</td>
                                     <td className="p-2">{formatNumber(rem.fbChargesFCY || rem.fbCharges)} {rem.remCurrency}</td>
                                </tr>
                            ))}
                        </tbody>
                        {/* Add Footer if needed */}
                    </table>
                </div>
            ) : <p className="text-sm text-gray-500 p-2">No remittances mapped yet.</p> }

            {/* Reduction Table (if applicable) */}
            {sbData.reductionDetails && sbData.reductionDetails.length > 0 && (
                <>
                    <h4 className="font-semibold mt-6 mb-2">Invoice Reduction / Write-Off Details</h4>
                    {/* ... Reduction table JSX ... */}
                </>
            )}

            {/* Map New Remittances Section */}
            {(invoice.status === 'Outstanding' || invoice.status === 'Part Realized') && (
                <form className="remittance-mapping-form mt-4 pt-4 border-t" onSubmit={(e) => e.preventDefault()}> {/* Prevent default form submission */}
                     <div className="flex justify-between items-center mb-2">
                         <h4 className="font-semibold">Map New Remittances</h4>
                         <span className="text-sm">
                             <span className="font-medium text-gray-600">Invoice Available for Mapping: </span>
                             <span className="font-bold text-indigo-700">{formatNumber(invoice.outstanding)} {invoice.currency}</span>
                         </span>
                         <button
                             type="button"
                             onClick={() => handleOpenFetchRemittances(invoice.invNumber)}
                             className="map-remittances-btn text-sm bg-indigo-100 text-indigo-700 font-semibold px-3 py-1 rounded-md hover:bg-indigo-200"
                         >
                             Map Available Remittances
                         </button>
                     </div>
                     <div className="new-remittances-table-container">
                         {/* This part needs state to hold the newly selected remittances for editing */}
                         {/* Placeholder: Add table rendering logic here based on state */}
                     </div>
                     <div className="new-remittance-mapping-submit-section hidden mt-4 flex justify-end items-center space-x-4 border-t pt-4"> {/* Initially hidden */}
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Checker</label>
                             <select name="checker" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                 <option>No Checker</option>
                             </select>
                         </div>
                         <div className="pt-5">
                             <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Submit Mapping</button>
                         </div>
                     </div>
                 </form>
            )}
        </div>
    );
}


// --- FetchRemittancesModal ---
// ... (FetchRemittancesModal component definition - similar structure to others)

// --- ReductionModal ---
// ... (ReductionModal component definition - manages its own form state)


// --- MAIN INVOICE DASHBOARD COMPONENT ---
export default function InvoiceDashboard() {
    const router = useRouter();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [allData, setAllData] = useState(initialInvoiceData); // Holds the raw data
    const [currentView, setCurrentView] = useState('invoice'); // 'invoice' or 'sb'
    const [currentFilter, setCurrentFilter] = useState('All'); // Status filter
    const [searchTerm, setSearchTerm] = useState('');

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedSbData, setSelectedSbData] = useState(null); // Data for details modal
    // Add states for other modals (Fetch Remittance, Reduction) if implemented

    // --- Derived Data ---
    const filterCounts = useMemo(() => {
        const counts = { 'All': 0, 'Closed / Realized': 0, 'Part Realized': 0, 'Outstanding': 0 };
        const isSbView = currentView === 'sb';
        allData.forEach(sb => {
            if (isSbView) {
                const totalOutstanding = sb.invoices.reduce((sum, inv) => sum + inv.outstanding, 0);
                const totalRealized = sb.invoices.reduce((sum, inv) => sum + inv.realized, 0);
                let sbStatus = 'Closed / Realized';
                if (totalOutstanding > 0.01 && totalRealized > 0) {
                    sbStatus = 'Part Realized';
                } else if (totalOutstanding > 0.01 && totalRealized <= 0) { // More specific outstanding
                    sbStatus = 'Outstanding';
                }
                if (counts[sbStatus] !== undefined) counts[sbStatus]++;
                counts.All++;
            } else {
                sb.invoices.forEach(inv => {
                    counts.All++;
                    if (counts[inv.status] !== undefined) {
                        counts[inv.status]++;
                    }
                });
            }
        });
        return counts;
    }, [allData, currentView]);

    const filteredAndSortedData = useMemo(() => {
        let filtered = allData;

        // Apply Search (Basic example)
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(sb =>
                sb.sbNumber.toLowerCase().includes(lowerSearch) ||
                sb.customer.toLowerCase().includes(lowerSearch) ||
                sb.invoices.some(inv => inv.invNumber.toLowerCase().includes(lowerSearch))
            );
        }

        // Apply Status Filter (logic depends on view)
        if (currentFilter !== 'All') {
            if (currentView === 'sb') {
                 filtered = filtered.filter(sb => {
                     const totalOutstanding = sb.invoices.reduce((sum, inv) => sum + inv.outstanding, 0);
                     const totalRealized = sb.invoices.reduce((sum, inv) => sum + inv.realized, 0);
                     let sbStatus = 'Closed / Realized';
                     if (totalOutstanding > 0.01 && totalRealized > 0) {
                         sbStatus = 'Part Realized';
                     } else if (totalOutstanding > 0.01 && totalRealized <= 0) {
                         sbStatus = 'Outstanding';
                     }
                    return sbStatus === currentFilter;
                 });
            } else { // invoice view
                // Filter SB groups first, then flatten invoices matching the status
                filtered = filtered
                    .map(sb => ({
                        ...sb,
                        invoices: sb.invoices.filter(inv => inv.status === currentFilter)
                    }))
                    .filter(sb => sb.invoices.length > 0); // Keep only SB groups that have matching invoices
            }
        }

        // Apply Sorting (Example - Sort by SB Date descending)
        // Add more complex sorting state if needed
        return filtered.sort((a, b) => new Date(b.sbDate) - new Date(a.sbDate));

    }, [allData, searchTerm, currentFilter, currentView]);


    // --- Event Handlers ---
    const handleToggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

    const handleViewChange = (view) => {
        setCurrentView(view);
        setCurrentFilter('All'); // Reset filter on view change
    };

    const handleFilterChange = (filter) => setCurrentFilter(filter);

    const handleOpenDetailsModal = (sbNumber) => {
        const data = allData.find(d => d.sbNumber === sbNumber);
        setSelectedSbData(data);
        setIsDetailsModalOpen(true);
    };

    const handleCloseDetailsModal = () => {
        setIsDetailsModalOpen(false);
        setSelectedSbData(null);
    };

    const handleOpenAddModal = () => setIsAddModalOpen(true);
    const handleCloseAddModal = () => setIsAddModalOpen(false);

    const handleAddInvoiceSubmit = (newSBGroup) => {
        // Add the new SB group to the main data state
        setAllData([newSBGroup, ...allData]);
        // Optionally: Re-calculate status, show success message, etc.
    };


    // --- Render Table Body ---
    const renderTableBody = () => {
        if (currentView === 'invoice') {
            return filteredAndSortedData.flatMap((sbGroup, sbIndex) => {
                const groupRowCount = sbGroup.invoices.length;
                return sbGroup.invoices.map((invoice, invoiceIndex) => (
                    <tr key={`${sbGroup.sbNumber}-${invoice.invNumber}`} className="bg-white border-b hover:bg-gray-50">
                        {/* Invoice Details */}
                        <td className="px-6 py-4">
                            <div className="font-semibold text-gray-800">{invoice.invNumber}</div>
                            <div className="text-xs text-gray-500">Date: {formatDate(invoice.invDate)}</div>
                            <div className="text-xs text-gray-500">Due: {formatDate(invoice.dueDate)}</div>
                        </td>
                        {/* Shipping Bill Details (shown only for the first invoice in group) */}
                        {invoiceIndex === 0 && (
                            <td className="px-6 py-4" rowSpan={groupRowCount}>
                                <div className="font-semibold text-gray-800">{sbGroup.sbNumber}</div>
                                <div className="text-xs text-gray-500">{formatDate(sbGroup.sbDate)}</div>
                            </td>
                        )}
                        {/* Customer (shown only for the first invoice in group) */}
                         {invoiceIndex === 0 && (
                            <td className="px-6 py-4" rowSpan={groupRowCount}>{sbGroup.customer}</td>
                         )}
                        {/* Invoice Value */}
                        <td className="px-6 py-4 font-semibold">{formatNumber(invoice.invValue)} {invoice.currency}</td>
                        {/* Realization & Outstanding */}
                        <td className="px-6 py-4">
                            <div>{formatNumber(invoice.realized)} {invoice.currency}</div>
                            <div className="text-red-600">({formatNumber(invoice.outstanding)} {invoice.currency})</div>
                        </td>
                        {/* Charges & Reduction */}
                        <td className="px-6 py-4">
                            <div>{formatNumber(invoice.fbCharges || 0)} {invoice.currency}</div>
                            <div>{formatNumber(invoice.reduction || 0)} {invoice.currency}</div>
                        </td>
                        {/* Status */}
                        <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(invoice.status)}`}>{invoice.status}</span></td>
                        {/* View Details Button (shown only for the first invoice in group) */}
                         {invoiceIndex === 0 && (
                             <td className="px-6 py-4 text-center align-middle" rowSpan={groupRowCount}>
                                <button onClick={() => handleOpenDetailsModal(sbGroup.sbNumber)} className="font-medium text-indigo-600 hover:text-indigo-800">View Details</button>
                             </td>
                         )}
                    </tr>
                ));
            });
        } else { // Shipping Bill View
            return filteredAndSortedData.map(sbGroup => {
                const totalValue = sbGroup.invoices.reduce((sum, inv) => sum + inv.invValue, 0);
                const totalRealized = sbGroup.invoices.reduce((sum, inv) => sum + inv.realized, 0);
                const totalOutstanding = sbGroup.invoices.reduce((sum, inv) => sum + inv.outstanding, 0);
                const totalFbCharges = sbGroup.invoices.reduce((sum, inv) => sum + (inv.fbCharges || 0), 0);
                const totalReduction = sbGroup.invoices.reduce((sum, inv) => sum + (inv.reduction || 0), 0);
                let sbStatus = 'Closed / Realized';
                 if (totalOutstanding > 0.01 && totalRealized > 0) {
                     sbStatus = 'Part Realized';
                 } else if (totalOutstanding > 0.01 && totalRealized <= 0) {
                     sbStatus = 'Outstanding';
                 }

                return (
                     <tr key={sbGroup.sbNumber} className="bg-white border-b hover:bg-gray-50">
                         <td className="px-6 py-4">
                             <div className="font-semibold text-gray-800">{sbGroup.sbNumber}</div>
                             <div className="text-xs text-gray-500">{formatDate(sbGroup.sbDate)}</div>
                         </td>
                         <td className="px-6 py-4">{sbGroup.invoices.length}</td>
                         <td className="px-6 py-4">{sbGroup.customer}</td>
                         <td className="px-6 py-4 font-semibold">{formatNumber(totalValue)} {sbGroup.invoices[0]?.currency}</td>
                         <td className="px-6 py-4">
                             <div>{formatNumber(totalRealized)} {sbGroup.invoices[0]?.currency}</div>
                             <div className="text-red-600">({formatNumber(totalOutstanding)} {sbGroup.invoices[0]?.currency})</div>
                         </td>
                         <td className="px-6 py-4">
                             <div>{formatNumber(totalFbCharges)} {sbGroup.invoices[0]?.currency}</div>
                             <div>{formatNumber(totalReduction)} {sbGroup.invoices[0]?.currency}</div>
                         </td>
                         <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(sbStatus)}`}>{sbStatus}</span></td>
                         <td className="px-6 py-4 text-center align-middle">
                             <button onClick={() => handleOpenDetailsModal(sbGroup.sbNumber)} className="font-medium text-indigo-600 hover:text-indigo-800">View Details</button>
                         </td>
                     </tr>
                );
            });
        }
    };

    // --- RENDER ---
    return (
        <div className="flex h-screen bg-gray-100 text-gray-800">
            {/* Sidebar */}
            <aside className={`sidebar bg-white text-gray-800 p-4 flex flex-col justify-between shadow-lg ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <div>
                     <div className="flex items-center justify-between mb-8">
                         <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-indigo-600"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                             <span className="logo-text ml-3 text-xl font-bold">FinSaaS</span>
                         </div>
                     </div>
                     <nav>
                         <ul>
                             <li className="mb-2">
                                 <a href="#" className="flex items-center p-3 text-white bg-indigo-600 rounded-lg font-semibold">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect width="8" height="8" x="2" y="2" rx="2"/><rect width="8" height="8" x="14" y="2" rx="2"/><rect width="8" height="8" x="2" y="14" rx="2"/><rect width="8" height="8" x="14" y="14" rx="2"/></svg>
                                     <span className="sidebar-text ml-4">Invoice Dashboard</span>
                                 </a>
                             </li>
                             <li className="mb-2">
                                <a
                                  href="#" // Add placeholder href
                                  onClick={(e) => {
                                      e.preventDefault(); // Prevent default anchor tag behavior
                                      router.push('/remittance'); // Navigate to Invoice Dashboard
                                  }} className="flex items-center p-3 text-gray-600 hover:bg-gray-200 rounded-lg"> {/* Placeholder Link */}
                                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="m17 9 4 4-4 4"/><path d="m3 13h18"/><path d="m7 15-4-4 4-4"/><path d="m3 5h18"/></svg>
                                     <span className="sidebar-text ml-4">Remittance Dashboard</span>
                                 </a>
                             </li>
                             {/* Other Nav items */}
                         </ul>
                     </nav>
                 </div>
                 <div>
                     <button onClick={handleToggleSidebar} className="flex items-center p-3 text-gray-600 hover:bg-gray-200 rounded-lg w-full">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 transform transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`}><path d="m15 18-6-6 6-6"/></svg>
                         <span className="sidebar-text ml-4">Collapse</span>
                     </button>
                 </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                 <header className="mb-8">
                     <div className="flex items-center space-x-4">
                         <h1 className="text-3xl font-bold text-gray-900">Invoice Dashboard</h1>
                         <div className="flex items-center bg-gray-200 rounded-full p-1">
                             <button
                                 onClick={() => handleViewChange('invoice')}
                                 className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${currentView === 'invoice' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                              >Invoice</button>
                             <button
                                 onClick={() => handleViewChange('sb')}
                                 className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${currentView === 'sb' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                             >Shipping Bill</button>
                         </div>
                     </div>
                     <p className="text-gray-500 mt-1">Manage and track all your invoices and shipping bills.</p>
                 </header>

                 <div className="bg-white rounded-lg shadow p-6">
                     <div className="flex justify-between items-center mb-4">
                         <div className="w-1/3">
                             <input
                                type="text"
                                placeholder="Search by Invoice, SB, Customer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                             />
                         </div>
                         <div>
                             <button onClick={handleOpenAddModal} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Add New Invoice</button>
                         </div>
                     </div>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap gap-2 mb-4 border-b pb-4">
                        {Object.keys(filterCounts).map(filter => (
                            <button
                                key={filter}
                                onClick={() => handleFilterChange(filter)}
                                className={`transition-colors duration-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-2 border ${
                                    currentFilter === filter
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                                }`}
                            >
                                <span>{filter}</span>
                                <span className={`text-xs font-bold px-2 rounded-full ${
                                    currentFilter === filter
                                        ? 'bg-white text-indigo-600'
                                        : getStatusClass(filter) // Reuse status colors for badges
                                }`}>
                                    {filterCounts[filter]}
                                </span>
                            </button>
                        ))}
                    </div>


                     {/* Table */}
                     <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                {currentView === 'invoice' ? (
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Invoice Details</th>
                                        <th scope="col" className="px-6 py-3">Shipping Bill Details</th>
                                        <th scope="col" className="px-6 py-3">Customer</th>
                                        <th scope="col" className="px-6 py-3">Invoice Value (FCY)</th>
                                        <th scope="col" className="px-6 py-3">Realization & Outstanding</th>
                                        <th scope="col" className="px-6 py-3">Charges & Reduction</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                        <th scope="col" className="px-6 py-3"></th>
                                    </tr>
                                ) : ( // SB View
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Shipping Bill Details</th>
                                        <th scope="col" className="px-6 py-3">Invoice Count</th>
                                        <th scope="col" className="px-6 py-3">Customer</th>
                                        <th scope="col" className="px-6 py-3">Total Invoice Value (FCY)</th>
                                        <th scope="col" className="px-6 py-3">Total Realization & Outstanding</th>
                                        <th scope="col" className="px-6 py-3">Total Charges & Reduction</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                        <th scope="col" className="px-6 py-3"></th>
                                     </tr>
                                )}
                            </thead>
                             <tbody>
                                {renderTableBody()}
                             </tbody>
                         </table>
                     </div>
                 </div>
            </main>

            {/* Modals */}
            <AddInvoiceModal
                isOpen={isAddModalOpen}
                onClose={handleCloseAddModal}
                onSubmit={handleAddInvoiceSubmit}
            />

             <DetailsModal
                isOpen={isDetailsModalOpen}
                onClose={handleCloseDetailsModal}
                data={selectedSbData}
            />

            {/* Add FetchRemittancesModal and ReductionModal here when implemented */}

        </div>
    );
}