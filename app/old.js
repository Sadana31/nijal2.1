"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

// --- UTILITY FUNCTIONS ---
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-IN"); // Use Indian locale
  } catch (e) {
    return "Invalid Date";
  }
};

const formatNumber = (num) => {
  if (typeof num !== "number") return "N/A";
  return num.toLocaleString("en-IN"); // Use Indian locale
};

const getStatusClass = (status) => {
  const lowerStatus = status?.toLowerCase() || "";
  if (lowerStatus === "closed") return "bg-green-100 text-green-800";
  if (lowerStatus === "part realized") return "bg-yellow-100 text-yellow-800";
  if (lowerStatus === "outstanding") return "bg-red-100 text-red-800";
  if (lowerStatus === "lodged") return "bg-blue-100 text-blue-800";
  if (lowerStatus === "pre-shipment") return "bg-purple-100 text-purple-800";
  if (lowerStatus.includes("draft")) return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-800";
};

// --- MODAL COMPONENTS ---

// --- AddInvoiceModal ---
function AddInvoiceModal({ isOpen, onClose, onSubmit }) {
  const [invoiceRows, setInvoiceRows] = useState([
    {
      id: 1,
      invNumber: "",
      invDate: "",
      invValue: "",
      invCurrency: "",
      invduedate: "",
    },
  ]);
  const nextId = React.useRef(2);

  useEffect(() => {
    // Reset form when modal opens
    if (isOpen) {
      setInvoiceRows([
        {
          id: 1,
          invNumber: "",
          invDate: "",
          invValue: "",
          invCurrency: "",
          invduedate: "",
        },
      ]);
      nextId.current = 2;
    }
  }, [isOpen]);

  const handleAddRow = () => {
    setInvoiceRows([
      ...invoiceRows,
      {
        id: nextId.current++,
        invNumber: "",
        invDate: "",
        invValue: "",
        invCurrency: "",
        invduedate: "",
      },
    ]);
  };

  const handleRemoveRow = (idToRemove) => {
    if (invoiceRows.length > 1) {
      setInvoiceRows(invoiceRows.filter((row) => row.id !== idToRemove));
    } else {
      alert("You must have at least one invoice.");
    }
  };

  const handleInputChange = (id, field, value) => {
    setInvoiceRows(
      invoiceRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      ),
    );
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
    if (checkerValue === "no_checker") {
      invoiceStatus = "Outstanding";
    } else {
      invoiceStatus = `Draft - ${checkerText}`;
    }

    let totalValue = 0;
    let firstCurrency = "";

    const formattedInvoices = invoiceRows.map((row, index) => {
      const invValue = parseFloat(row.invValue || 0);
      if (index === 0) firstCurrency = row.invCurrency || "N/A";
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
        duedate: row.invduedate,
        status: invoiceStatus,
        remittances: [],
        documents: {
          invoiceCopy: `https://placehold.co/600x840?text=Invoice+${row.invNumber}`,
          blCopy: `https://placehold.co/600x840?text=BL+Copy+for+${data.sbNumber}`,
        },
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
        address: data.customerAddress || "N/A",
        contact: data.customerContact || "N/A",
        email: data.customerEmail || "N/A",
      },
      sbDetails: {
        portCode: data.portCode || "N/A",
        sbValue: `${formatNumber(totalValue)} ${firstCurrency}`,
        shippingLine: data.shippingLine || "N/A",
        vessel: data.vessel || "N/A",
      },
      poDetails: {
        pos: poString
          ? poString.split(",").map((id) => ({ id: id.trim(), value: "N/A" }))
          : [],
      },
      soDetails: {
        sos: soString
          ? soString.split(",").map((id) => ({ id: id.trim(), value: "N/A" }))
          : [],
      },
      preShipment: { details: "N/A", amount: "N/A", status: "N/A" },
      commercialInvoice: { proforma: "N/A", linkedPIs: [], details: "N/A" },
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
            <h2 className="text-2xl font-bold">
              Add New Shipping Bill & Invoices
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          {/* Body */}
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            {/* Party Details */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">Party Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  name="customerName"
                  placeholder="Customer Name"
                  className="p-2 border rounded"
                  required
                />
                <input
                  type="text"
                  name="customerCode"
                  placeholder="Customer Code"
                  className="p-2 border rounded"
                  required
                />
                <input
                  type="email"
                  name="customerEmail"
                  placeholder="Customer Email"
                  className="p-2 border rounded"
                />
                <input
                  type="text"
                  name="customerContact"
                  placeholder="Contact Person"
                  className="p-2 border rounded"
                />
                <input
                  type="text"
                  name="customerAddress"
                  placeholder="Address"
                  className="p-2 border rounded col-span-2"
                />
              </div>
            </div>
            {/* Shipping Bill Details */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">
                Shipping Bill Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  name="sbNumber"
                  placeholder="Shipping Bill Number"
                  className="p-2 border rounded"
                  required
                />
                <input
                  type="date"
                  name="sbDate"
                  className="p-2 border rounded"
                  required
                />
                <input
                  type="text"
                  name="portCode"
                  placeholder="Port Code"
                  className="p-2 border rounded"
                />
                <input
                  type="text"
                  name="shippingLine"
                  placeholder="Shipping Line"
                  className="p-2 border rounded"
                />
                <input
                  type="text"
                  name="vessel"
                  placeholder="Vessel Name"
                  className="p-2 border rounded"
                />
              </div>
            </div>
            {/* Invoices Section */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg">Invoices</h3>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="text-sm bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600"
                >
                  Add Invoice
                </button>
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
                  <div
                    key={row.id}
                    className="grid grid-cols-1 md:grid-cols-[2fr,2fr,1.5fr,1fr,2fr,min-content] gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={row.invNumber}
                      onChange={(e) =>
                        handleInputChange(row.id, "invNumber", e.target.value)
                      }
                      placeholder="e.g., INV-1234"
                      className="p-2 border rounded"
                      required
                    />
                    <input
                      type="date"
                      value={row.invDate}
                      onChange={(e) =>
                        handleInputChange(row.id, "invDate", e.target.value)
                      }
                      className="p-2 border rounded"
                      required
                    />
                    <input
                      type="number"
                      step="any"
                      value={row.invValue}
                      onChange={(e) =>
                        handleInputChange(row.id, "invValue", e.target.value)
                      }
                      placeholder="e.g., 150000"
                      className="p-2 border rounded"
                      required
                    />
                    <input
                      type="text"
                      value={row.invCurrency}
                      onChange={(e) =>
                        handleInputChange(row.id, "invCurrency", e.target.value)
                      }
                      placeholder="USD"
                      className="p-2 border rounded"
                      required
                    />
                    <input
                      type="date"
                      value={row.invduedate}
                      onChange={(e) =>
                        handleInputChange(row.id, "invduedate", e.target.value)
                      }
                      className="p-2 border rounded w-full"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="remove-invoice-row text-red-500 hover:text-red-700 p-1 rounded-full flex items-center justify-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {/* Linked Documents */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">
                Linked Documents (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="poDetails"
                  placeholder="PO Numbers (comma-separated)"
                  className="p-2 border rounded"
                />
                <input
                  type="text"
                  name="soDetails"
                  placeholder="SO Numbers (comma-separated)"
                  className="p-2 border rounded"
                />
              </div>
            </div>
            {/* Submission */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">Submission</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="assign-checker"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Assign to Checker
                  </label>
                  <select
                    id="assign-checker"
                    name="checker"
                    className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a user...
                    </option>
                    <option value="checker_a">Checker A (Alice)</option>
                    <option value="checker_b">Checker B (Bob)</option>
                    <option value="checker_c">Checker C (Charlie)</option>
                    <option value="no_checker">
                      No Checker (Direct Submit)
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          {/* Footer */}
          <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Submit for Approval
            </button>
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
  const [activeTab, setActiveTab] = useState("custominv"); // Default tab
  const [activeSubTab, setActiveSubTab] = useState(
    data?.invoices?.[0]?.invNumber || null,
  );
  const [openPopoverInv, setOpenPopoverInv] = useState(null);

  useEffect(() => {
    // Reset to default tab when data changes (modal opens)
    if (data) {
      setActiveTab("custominv");
      setActiveSubTab(data.invoices?.[0]?.invNumber || null);
      setOpenPopoverInv(null);
    }
  }, [data]);

  const handlePopoverToggle = (invNumber, event) => {
    event.stopPropagation(); // Prevent closing immediately
    setOpenPopoverInv((prev) => (prev === invNumber ? null : invNumber));
  };

  // Close popover if clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenPopoverInv(null);
    if (openPopoverInv) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openPopoverInv]);

  const getTabContent = (tabId, modalData) => {
    // ... (Logic from vanilla JS getTabContent, adapted for React)
    switch (tabId) {
      case "po":
        return (
          <div>
            <h4>PO Details</h4> {/* ... JSX ... */}
          </div>
        );
      case "so":
        return (
          <div>
            <h4>SO Details</h4> {/* ... JSX ... */}
          </div>
        );
      case "preship":
        return (
          <div>
            <h4>Pre-shipment</h4> {/* ... JSX ... */}
          </div>
        );
      case "comminv":
        return (
          <div>
            <h4>Commercial Invoice</h4> {/* ... JSX ... */}
          </div>
        );
      case "custominv":
        if (!modalData?.invoices) return <p>No invoice data available.</p>;

        if (modalData.invoices.length > 1) {
          return (
            <div className="sub-tabs-container">
              <nav
                className="-mb-px flex space-x-6 border-b border-gray-200"
                aria-label="Tabs"
              >
                {modalData.invoices.map((inv) => (
                  <button
                    key={inv.invNumber}
                    onClick={() => setActiveSubTab(inv.invNumber)}
                    className={`sub-tab-button whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                      activeSubTab === inv.invNumber
                        ? "active border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {inv.invNumber}
                  </button>
                ))}
              </nav>
              <div className="sub-tab-content pt-5">
                {modalData.invoices.map((inv) => (
                  <div
                    key={inv.invNumber}
                    className={`sub-tab-pane ${activeSubTab === inv.invNumber ? "" : "hidden"}`}
                  >
                    {/* Render Invoice Summary, Remittances, Reduction, Mapping form for THIS inv */}
                    <InvoiceDetailContent
                      invoice={inv}
                      sbData={modalData}
                      openPopoverInv={openPopoverInv}
                      handlePopoverToggle={handlePopoverToggle}
                    />
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
              <InvoiceDetailContent
                invoice={inv}
                sbData={modalData}
                openPopoverInv={openPopoverInv}
                handlePopoverToggle={handlePopoverToggle}
              />
            </div>
          );
        }
      default:
        return "Content not available.";
    }
  };

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="modal bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            Shipping Bill Details: {data.sbNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-lg mb-2">Party Details</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="font-medium text-gray-500">
                  Customer Name:
                </span>{" "}
                <span>{data.partyDetails?.name}</span>
                <span className="font-medium text-gray-500">
                  Customer Code:
                </span>{" "}
                <span>{data.partyDetails?.customerCode}</span>
                <span className="font-medium text-gray-500">Address:</span>{" "}
                <span>{data.partyDetails?.address}</span>
                <span className="font-medium text-gray-500">
                  Contact Person:
                </span>{" "}
                <span>{data.partyDetails?.contact}</span>
                <span className="font-medium text-gray-500">Email:</span>{" "}
                <span>{data.partyDetails?.email}</span>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-lg mb-2">
                Shipping Bill Summary
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="font-medium text-gray-500">Port Code:</span>{" "}
                <span>{data.sbDetails?.portCode}</span>
                <span className="font-medium text-gray-500">
                  Total Value:
                </span>{" "}
                <span>{data.sbDetails?.sbValue}</span>
                <span className="font-medium text-gray-500">
                  Shipping Line:
                </span>{" "}
                <span>{data.sbDetails?.shippingLine}</span>
                <span className="font-medium text-gray-500">Vessel:</span>{" "}
                <span>{data.sbDetails?.vessel}</span>
              </div>
            </div>
          </div>
          {/* Tabs Section */}
          <div>
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {[
                  { id: "po", name: "PO" },
                  { id: "so", name: "SO" },
                  { id: "preship", name: "Pre-shipment" },
                  { id: "comminv", name: "Commercial Invoice" },
                  { id: "custominv", name: "Custom Invoice" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
function InvoiceDetailContent({
  invoice,
  sbData,
  openPopoverInv,
  handlePopoverToggle,
}) {
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
                <div className="text-xs">
                  Date: {formatDate(invoice.invDate)}
                </div>
                <div className="text-xs">
                  Due: {formatDate(invoice.duedate)}
                </div>
              </td>
              <td className="p-2">
                {formatNumber(invoice.invValue)} {invoice.currency}
              </td>
              <td className="p-2">
                {formatNumber(invoice.realized)} {invoice.currency}
              </td>
              <td className="p-2">
                {formatNumber(invoice.fbCharges)} {invoice.currency}
              </td>
              <td className="p-2">
                {formatNumber(invoice.reduction)} {invoice.currency}
              </td>
              <td className="p-2 text-red-600">
                {formatNumber(invoice.outstanding)} {invoice.currency}
              </td>
              <td className="p-2">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(invoice.status)}`}
                >
                  {invoice.status}
                </span>
              </td>
              <td className="p-2">
                <div className="relative">
                  <button
                    onClick={(e) => handlePopoverToggle(invoice.invNumber, e)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <line x1="10" y1="9" x2="8" y2="9" />
                    </svg>
                  </button>
                  {openPopoverInv === invoice.invNumber && (
                    <div
                      className="docs-popover show"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-2 text-xs">
                        <a
                          href={invoice.documents?.invoiceCopy || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="block p-2 hover:bg-gray-100 rounded"
                        >
                          Invoice Copy
                        </a>
                        <a
                          href={invoice.documents?.blCopy || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="block p-2 hover:bg-gray-100 rounded"
                        >
                          BL Copy
                        </a>
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
                <th className="p-2 text-left font-semibold">
                  Settlement Details
                </th>
                <th className="p-2 text-left font-semibold">
                  Remittance Details
                </th>
                <th className="p-2 text-left font-semibold">Remitter</th>
                <th className="p-2 text-left font-semibold">
                  IRM Utilized (in FCY)
                </th>
                <th className="p-2 text-left font-semibold">Conv. Rate</th>
                <th className="p-2 text-left font-semibold">
                  Invoice Realized
                </th>
                <th className="p-2 text-left font-semibold">FB Charges</th>
              </tr>
            </thead>
            <tbody>
              {invoice.remittances.map((rem, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">
                    <div>{rem.settlementNumber || rem.fircNumber}</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(rem.settlementDate || rem.remDate)}
                    </div>
                  </td>
                  <td className="p-2">
                    <div>{rem.remNumber}</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(rem.remDate)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Net: {formatNumber(rem.remValue)} | Ins:{" "}
                      {formatNumber(rem.instructedValue)} | Charges:{" "}
                      {formatNumber(rem.fbCharges)}
                    </div>
                  </td>
                  <td className="p-2">
                    <div>{rem.remitterName}</div>
                    <div className="text-xs text-gray-500">
                      {rem.remitterCode || "N/A"}
                    </div>
                  </td>
                  <td className="p-2">
                    {formatNumber(rem.remittanceUtilizationFCY)}{" "}
                    {rem.remCurrency}
                  </td>
                  <td className="p-2">
                    {(rem.conversionRate || 0).toFixed(4)}
                  </td>
                  <td className="p-2">
                    {formatNumber(rem.invoiceRealizationValue)}{" "}
                    {invoice.currency}
                  </td>
                  <td className="p-2">
                    {formatNumber(rem.fbChargesFCY || rem.fbCharges)}{" "}
                    {rem.remCurrency}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Add Footer if needed */}
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500 p-2">No remittances mapped yet.</p>
      )}

      {/* Reduction Table (if applicable) */}
      {sbData.reductionDetails && sbData.reductionDetails.length > 0 && (
        <>
          <h4 className="font-semibold mt-6 mb-2">
            Invoice Reduction / Write-Off Details
          </h4>
          {/* ... Reduction table JSX ... */}
        </>
      )}

      {/* Map New Remittances Section */}
      {(invoice.status === "Outstanding" ||
        invoice.status === "Part Realized") && (
        <form
          className="remittance-mapping-form mt-4 pt-4 border-t"
          onSubmit={(e) => e.preventDefault()}
        >
          {" "}
          {/* Prevent default form submission */}
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Map New Remittances</h4>
            <span className="text-sm">
              <span className="font-medium text-gray-600">
                Invoice Available for Mapping:{" "}
              </span>
              <span className="font-bold text-indigo-700">
                {formatNumber(invoice.outstanding)} {invoice.currency}
              </span>
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
          <div className="new-remittance-mapping-submit-section hidden mt-4 flex justify-end items-center space-x-4 border-t pt-4">
            {" "}
            {/* Initially hidden */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Checker
              </label>
              <select
                name="checker"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option>No Checker</option>
              </select>
            </div>
            <div className="pt-5">
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Submit Mapping
              </button>
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

  // --- MODIFIED STATE ---
  const [allData, setAllData] = useState([]); // Start with an empty array
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define your API URL
  const API_BASE_URL = "http://localhost:5000/shippingBill";

  const [currentView, setCurrentView] = useState("invoice");
  const [currentFilter, setCurrentFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSbData, setSelectedSbData] = useState(null);

  const filterKeys = [
    "All",
    "Closed",
    "Part Realized",
    "Outstanding",
  ];
  // --- ✅ ADD THIS NEW BLOCK ---
  useEffect(() => {
    const fetchShippingBills = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(API_BASE_URL);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const dataFromApi = await response.json();

        // NO MAPPING NEEDED! The data is already nested.
        setAllData(dataFromApi);
      } catch (e) {
        console.error("Failed to fetch shipping bills:", e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShippingBills();
  }, []); // The empty array [] means this runs ONCE when the component mounts.
  // --- Derived Data ---
  const filterCounts = useMemo(() => {
    // Initialize with all required filters set to 0
    const counts = {
      All: 0,
      "Closed": 0,
      "Part Realized": 0,
      Outstanding: 0,
    };

    const isSbView = currentView === "sb";

    allData.forEach((sb) => {
      if (isSbView) {
        counts.All++; // One shipping bill

        const totalOutstanding = sb.invoices.reduce(
          (sum, inv) => sum + (inv.outstanding || 0),
          0,
        );
        const totalRealized = sb.invoices.reduce(
          (sum, inv) => sum + (inv.realized || 0),
          0,
        );

        let sbStatus = "Outstanding";
        if (totalOutstanding <= 0.01) {
          sbStatus = "Closed";
        } else if (totalRealized > 0) {
          sbStatus = "Part Realized";
        }

        if (counts.hasOwnProperty(sbStatus)) {
          counts[sbStatus]++;
        }
      } else {
        sb.invoices.forEach((inv) => {
          counts.All++; // One invoice

          const status = inv.status || "Outstanding";

          if (counts.hasOwnProperty(status)) {
            counts[status]++;
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
      filtered = filtered.filter(
        (sb) =>
          sb.sbNumber.toLowerCase().includes(lowerSearch) ||
          sb.customer.toLowerCase().includes(lowerSearch) ||
          sb.invoices.some((inv) =>
            inv.invNumber.toLowerCase().includes(lowerSearch),
          ),
      );
    }

    // Apply Status Filter (logic depends on view)
    if (currentFilter !== "All") {
      if (currentView === "sb") {
        filtered = filtered.filter((sb) => {
          const totalOutstanding = sb.invoices.reduce(
            (sum, inv) => sum + inv.outstanding,
            0,
          );
          const totalRealized = sb.invoices.reduce(
            (sum, inv) => sum + inv.realized,
            0,
          );
          let sbStatus = "Closed";
          if (totalOutstanding > 0.01 && totalRealized > 0) {
            sbStatus = "Part Realized";
          } else if (totalOutstanding > 0.01 && totalRealized <= 0) {
            sbStatus = "Outstanding";
          }
          return sbStatus === currentFilter;
        });
      } else {
        // invoice view
        // Filter SB groups first, then flatten invoices matching the status
        filtered = filtered
          .map((sb) => ({
            ...sb,
            invoices: sb.invoices.filter((inv) => inv.status === currentFilter),
          }))
          .filter((sb) => sb.invoices.length > 0); // Keep only SB groups that have matching invoices
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
    setCurrentFilter("All"); // Reset filter on view change
  };

  const handleFilterChange = (filter) => setCurrentFilter(filter);

  const handleOpenDetailsModal = (sbNumber) => {
    const data = allData.find((d) => d.sbNumber === sbNumber);
    setSelectedSbData(data);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedSbData(null);
  };

  const handleOpenAddModal = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);

  // --- ✅ REPLACE WITH THIS NEW FUNCTION ---
  const handleAddInvoiceSubmit = async (newSBGroup) => {
    // 'newSBGroup' is the nested object from your AddInvoiceModal.
    // Our backend now understands this format directly!

    // Optimistically update the UI first for a faster feel
    setAllData([newSBGroup, ...allData]);
    handleCloseAddModal();

    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSBGroup), // Send the nested object directly
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(
          errData.error || `HTTP error! Status: ${response.status}`,
        );
      }

      const newBillFromApi = await response.json();

      // Now, update the UI again with the *actual* data from the server
      // (which includes the new sb_id, etc.)
      setAllData((prevData) =>
        prevData.map((item) =>
          item.sbNumber === newBillFromApi.sbNumber ? newBillFromApi : item,
        ),
      );
    } catch (e) {
      console.error("Failed to create shipping bill:", e);
      alert(`Error saving: ${e.message}`);
      // Roll back the optimistic update on error
      setAllData((prevData) =>
        prevData.filter((item) => item.sbNumber !== newSBGroup.sbNumber),
      );
    }
  };

  // --- Render Table Body ---
  const renderTableBody = () => {
    if (currentView === "invoice") {
      return filteredAndSortedData.flatMap((sbGroup, sbIndex) => {
        const groupRowCount = sbGroup.invoices.length;
        return sbGroup.invoices.map((invoice, invoiceIndex) => (
          <tr
            key={`${sbGroup.sbNumber}-${invoice.invNumber}`}
            className="bg-white border-b hover:bg-gray-50"
          >
            {/* Invoice Details */}
            <td className="px-6 py-4">
              <div className="font-semibold text-gray-800">
                {invoice.invNumber}
              </div>
              <div className="text-xs text-gray-500">
                Date: {formatDate(invoice.invDate)}
              </div>
              <div className="text-xs text-gray-500">
                Due: {formatDate(invoice.duedate)}
              </div>
            </td>

            {/* Shipping Bill Details (shown only for the first invoice in group) */}
            {invoiceIndex === 0 && (
              <td className="px-6 py-4" rowSpan={groupRowCount}>
                <div className="font-semibold text-gray-800">
                  {sbGroup.sbNumber}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(sbGroup.sbDate)}
                </div>
              </td>
            )}

            {/* Customer (shown only for the first invoice in group) */}
            {invoiceIndex === 0 && (
              <td className="px-6 py-4" rowSpan={groupRowCount}>
                {sbGroup.customer}
              </td>
            )}

            {/* Invoice Value */}
            <td className="px-6 py-4 font-semibold">
              {formatNumber(invoice.invValue)} {invoice.currency}
            </td>

            {/* Realization & Outstanding */}
            <td className="px-6 py-4">
              <div>
                {formatNumber(invoice.realized)} {invoice.currency}
              </div>
              <div className="text-red-600">
                ({formatNumber(invoice.outstanding)} {invoice.currency})
              </div>
            </td>

            {/* Charges & Reduction */}
            <td className="px-6 py-4">
              <div>
                {formatNumber(invoice.fbCharges || 0)} {invoice.currency}
              </div>
              <div>
                {formatNumber(invoice.reduction || 0)} {invoice.currency}
              </div>
            </td>

            {/* Status */}
            <td className="px-6 py-4">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(invoice.status)}`}
              >
                {invoice.status}
              </span>
            </td>

            {/* View Details Button (shown only for the first invoice in group) */}
            {invoiceIndex === 0 && (
              <td
                className="px-6 py-4 text-center align-middle"
                rowSpan={groupRowCount}
              >
                <button
                  onClick={() => handleOpenDetailsModal(sbGroup.sbNumber)}
                  className="font-medium text-indigo-600 hover:text-indigo-800"
                >
                  View Details
                </button>
              </td>
            )}
          </tr>
        ));
      });
    } else {
      // Shipping Bill View
      return filteredAndSortedData.map((sbGroup) => {
        const totalValue = sbGroup.invoices.reduce(
          (sum, inv) => sum + inv.invValue,
          0,
        );
        const totalRealized = sbGroup.invoices.reduce(
          (sum, inv) => sum + inv.realized,
          0,
        );
        const totalOutstanding = sbGroup.invoices.reduce(
          (sum, inv) => sum + inv.outstanding,
          0,
        );
        const totalFbCharges = sbGroup.invoices.reduce(
          (sum, inv) => sum + (inv.fbCharges || 0),
          0,
        );
        const totalReduction = sbGroup.invoices.reduce(
          (sum, inv) => sum + (inv.reduction || 0),
          0,
        );

        let sbStatus = "Closed";
        if (totalOutstanding > 0.01 && totalRealized > 0) {
          sbStatus = "Part Realized";
        } else if (totalOutstanding > 0.01 && totalRealized <= 0) {
          sbStatus = "Outstanding";
        }

        return (
          <tr
            key={sbGroup.sbNumber}
            className="bg-white border-b hover:bg-gray-50"
          >
            <td className="px-6 py-4">
              <div className="font-semibold text-gray-800">
                {sbGroup.sbNumber}
              </div>
              <div className="text-xs text-gray-500">
                {formatDate(sbGroup.sbDate)}
              </div>
            </td>
            <td className="px-6 py-4">{sbGroup.invoices.length}</td>
            <td className="px-6 py-4">{sbGroup.customer}</td>
            <td className="px-6 py-4 font-semibold">
              {formatNumber(totalValue)} {sbGroup.invoices[0]?.currency}
            </td>
            <td className="px-6 py-4">
              <div>
                {formatNumber(totalRealized)} {sbGroup.invoices[0]?.currency}
              </div>
              <div className="text-red-600">
                ({formatNumber(totalOutstanding)}{" "}
                {sbGroup.invoices[0]?.currency})
              </div>
            </td>
            <td className="px-6 py-4">
              <div>
                {formatNumber(totalFbCharges)} {sbGroup.invoices[0]?.currency}
              </div>
              <div>
                {formatNumber(totalReduction)} {sbGroup.invoices[0]?.currency}
              </div>
            </td>
            <td className="px-6 py-4">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(sbStatus)}`}
              >
                {sbStatus}
              </span>
            </td>
            <td className="px-6 py-4 text-center align-middle">
              <button
                onClick={() => handleOpenDetailsModal(sbGroup.sbNumber)}
                className="font-medium text-indigo-600 hover:text-indigo-800"
              >
                View Details
              </button>
            </td>
          </tr>
        );
      });
    }
  };
  // --- RENDER ---
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-lg">
        Loading data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-lg text-red-600">
        <strong>Error:</strong> {error}
      </div>
    );
  }
  // --- END OF NEW BLOCK ---

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside
        className={`sidebar bg-white text-gray-800 p-4 flex flex-col justify-between shadow-lg ${isSidebarCollapsed ? "collapsed" : ""}`}
      >
        <div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 text-indigo-600"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
              <span className="logo-text ml-3 text-xl font-bold">FinSaaS</span>
            </div>
          </div>
          <nav>
            <ul>
              <li className="mb-2">
                <a
                  href="#"
                  className="flex items-center p-3 text-white bg-indigo-600 rounded-lg font-semibold"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6"
                  >
                    <rect width="8" height="8" x="2" y="2" rx="2" />
                    <rect width="8" height="8" x="14" y="2" rx="2" />
                    <rect width="8" height="8" x="2" y="14" rx="2" />
                    <rect width="8" height="8" x="14" y="14" rx="2" />
                  </svg>
                  <span className="sidebar-text ml-4">Invoice Dashboard</span>
                </a>
              </li>
              <li className="mb-2">
                <a
                  href="#" // Add placeholder href
                  onClick={(e) => {
                    e.preventDefault(); // Prevent default anchor tag behavior
                    router.push("/remittance"); // Navigate to Invoice Dashboard
                  }}
                  className="flex items-center p-3 text-gray-600 hover:bg-gray-200 rounded-lg"
                >
                  {" "}
                  {/* Placeholder Link */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6"
                  >
                    <path d="m17 9 4 4-4 4" />
                    <path d="m3 13h18" />
                    <path d="m7 15-4-4 4-4" />
                    <path d="m3 5h18" />
                  </svg>
                  <span className="sidebar-text ml-4">
                    Remittance Dashboard
                  </span>
                </a>
              </li>
              {/* Other Nav items */}
            </ul>
          </nav>
        </div>
        <div>
          <button
            onClick={handleToggleSidebar}
            className="flex items-center p-3 text-gray-600 hover:bg-gray-200 rounded-lg w-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-6 h-6 transform transition-transform ${isSidebarCollapsed ? "rotate-180" : ""}`}
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="sidebar-text ml-4">Collapse</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Invoice Dashboard
            </h1>
            <div className="flex items-center bg-gray-200 rounded-full p-1">
              <button
                onClick={() => handleViewChange("invoice")}
                className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${currentView === "invoice" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"}`}
              >
                Invoice
              </button>
              <button
                onClick={() => handleViewChange("sb")}
                className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${currentView === "sb" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"}`}
              >
                Shipping Bill
              </button>
            </div>
          </div>
          <p className="text-gray-500 mt-1">
            Manage and track all your invoices and shipping bills.
          </p>
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
              <button
                onClick={handleOpenAddModal}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Add New Invoice
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mb-4 border-b pb-4">
            {filterKeys.map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterChange(filter)}
                className={`transition-colors duration-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-2 border ${
                  currentFilter === filter
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
                }`}
              >
                <span>{filter}</span>
                <span
                  className={`text-xs font-bold px-2 rounded-full ${
                    currentFilter === filter
                      ? "bg-white text-indigo-600"
                      : getStatusClass(filter)
                  }`}
                >
                  {filterCounts[filter] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                {currentView === "invoice" ? (
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Invoice Details
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Shipping Bill Details
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Invoice Value (FCY)
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Realization & Outstanding
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Charges & Reduction
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3"></th>
                  </tr>
                ) : (
                  // SB View
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Shipping Bill Details
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Invoice Count
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Total Invoice Value (FCY)
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Total Realization & Outstanding
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Total Charges & Reduction
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3"></th>
                  </tr>
                )}
              </thead>
              <tbody>{renderTableBody()}</tbody>
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