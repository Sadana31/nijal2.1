  "use client";

  import React, { useState, useMemo, useEffect } from "react";

  // --- MAPPINGS ---
  const CITI_BANK_UPLOAD_MAPPING = {
    "Senders Ref.": "senderRefNo",
    "Message ID": "remRef",
    "F50-ORG Name": "remitterName",
    "F58/59-BNF Name": "beneficiaryNameSwift",
    "Instr. Amount": "net",
    "Instr. Val Date": "remDate",
    "Instr. Currency": "currency",
    "Field 70": "remitterRemarks",
    "Field 72": "detailsOfCharges",
    "F71A (Details of Charges)": "charges",
    "F58/59-BNF ANL/Party ID": "beneficiaryBankId",
  };

  const ICICI_BANK_UPLOAD_MAPPING = {
    GRSReferenceNo: "remRef",
    SendersReference: "senderRefNo",
    OrderingCustomerDetails: "remitterName",
    BeneficiaryCustomerDetails: "beneficiaryNameSwift",
    Amount: "net",
    USDEquivalent: "usdEquivalent",
    CreditAdviceValueDate: "remDate",
    ValueDate: "senderRefDate",
    Currency: "currency",
    RemittanceInformation: "remitterRemarks",
    ChargesBorneBy: "detailsOfCharges",
    BeneficiaryCustomer: "beneficiaryBankId",
  };

  // --- COLOR CONFIGURATION ---
  const STATUS_COLORS = {
    "Outstanding": {
      badge: "bg-red-100 text-red-800",
      buttonActive: "bg-red-600 text-white",
      buttonInactive: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
    },
    "Unutilized": {
      badge: "bg-blue-100 text-blue-800",
      buttonActive: "bg-blue-600 text-white",
      buttonInactive: "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
    },
    "Part utilized": {
      badge: "bg-yellow-100 text-yellow-800",
      buttonActive: "bg-yellow-500 text-white",
      buttonInactive: "bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100"
    },
    "Utilized": {
      badge: "bg-green-100 text-green-800",
      buttonActive: "bg-green-600 text-white",
      buttonInactive: "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
    },
    "All": {
      buttonActive: "bg-gray-800 text-white",
      buttonInactive: "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
    }
  };

  // --- HELPER FUNCTIONS ---
  const formatCurrency = (value, currency) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "-";
    return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ""}`.trim();
  };

  const getRemittanceStatus = (remGroup) => {
    if (!remGroup.irmLines || remGroup.irmLines.length === 0 || !remGroup.irmLines.some((irm) => irm.irmRef)) {
      return "Outstanding";
    }
    const totalUtilized = remGroup.irmLines.reduce((sum, irm) => sum + (irm.irmUtilized || 0), 0);
    const totalRemittanceValue = remGroup.net || 0;

    if (totalUtilized === 0) return "Unutilized";
    if (totalUtilized < totalRemittanceValue) return "Part utilized";
    return "Utilized";
  };

  // ==========================================
  // MAIN COMPONENT
  // ==========================================
  // FIXED: Removed destructured props to avoid shadowing. This component manages its own state.
  export default function RemittancesPage() {
    const [Bills, setBills] = useState([]); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    // --- MODAL STATES ---
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isICICIUploadModalOpen, setIsICICIUploadModalOpen] = useState(false);
    const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
    const [isRemittanceDetailModalOpen, setIsRemittanceDetailModalOpen] = useState(false);
    const [isFetchInvoiceModalOpen, setIsFetchInvoiceModalOpen] = useState(false);

    // --- FILTER STATES ---
    const [activeRemFilter, setActiveRemFilter] = useState("All");
    const [remBankFilter, setRemBankFilter] = useState("All");

    // --- DATA & INPUT STATES ---
    const [currentRemittance, setCurrentRemittance] = useState(null);
    const [uploadDataInput, setUploadDataInput] = useState("");
    const [iciciUploadJsonInput, setIciciUploadJsonInput] = useState("");
    const [updateMessage, setUpdateMessage] = useState("");
    
    // For Settlement Modal
    // --- STATE FOR SETTLEMENT ---
// This holds the invoices the user picked in the Fetch Modal
const [selectedInvoices, setSelectedInvoices] = useState([]); 

// --- HANDLERS ---

const handleOpenSettleModal = (rem) => {
  setCurrentRemittance(rem);
  setSelectedInvoices([]); // Reset previous selections
  setIsSettleModalOpen(true);
  setIsRemittanceDetailModalOpen(false);
};

// When user clicks "Fetch Invoices" inside Settle Modal
const handleOpenFetchInvoiceModal = () => {
  setIsFetchInvoiceModalOpen(true); 
  // We don't fetch here anymore. The Modal will fetch its own data.
};

// When user clicks "Add Selected" inside Fetch Modal
const handleAddInvoices = (invoices) => {
  setSelectedInvoices(invoices); // Save them to state
  setIsFetchInvoiceModalOpen(false); // Close the top modal
  // The Settle Modal is still open underneath and will now show these invoices
};

    // --- INITIAL FETCH (Simulated) ---
    useEffect(() => {
      // In a real app, fetch data here. For now, Bills starts empty.
    }, []);

    // --- DERIVED DATA ---
    // --- DERIVED DATA: Flatten Bills to Remittances ---
    const remittanceData = useMemo(() => {
      const remMap = new Map();
      if (Array.isArray(Bills)) {
        Bills.forEach((bill) => {
          bill.invoiceList?.forEach((inv) => {
            inv.remittanceList?.forEach((rem) => {
              const irmLines = (rem.irmLines || []).map((irm) => ({
                ...irm,
                purposeCode: irm.purposeCode || (rem.irmRef === "IRM-P01" ? "P0102" : "P0103"),
                purposeDesc: irm.purposeDesc || (rem.irmRef === "IRM-P01" ? "Export of Goods" : "Advance against Export"),
                currency: irm.currency || rem.currency || inv.fobCurrencyCode,
              }));

              let remGroup = remMap.get(rem.remRef);
              if (!remGroup) {
                remGroup = {
                  ...rem,
                  buyerCode: bill.buyerCode || (bill.buyerName ? bill.buyerName.split(" ")[0] : "N/A"),
                  // ✅ FIX: Prioritize the bankName from the remittance row (from DB), fallback to Bill
                  bankName: rem.bankName || bill.bankName || "Unknown", 
                  adCode: rem.adCode || bill.adCode,
                  ifscCode: rem.ifscCode || bill.ifscCode,
                  irmLines: [],
                  currency: rem.currency || inv.fobCurrencyCode,
                };
                remMap.set(rem.remRef, remGroup);
              }
              
              // ... rest of the loop remains the same ...
              irmLines.forEach((irmLine) => {
                if (!remGroup.irmLines.some((existing) => existing.irmRef === irmLine.irmRef)) {
                  remGroup.irmLines.push({
                    ...irmLine,
                    parentRemRef: remGroup.remRef,
                    parentRemDate: remGroup.remDate,
                    parentNet: remGroup.net,
                    parentCharges: remGroup.charges,
                    parentInstructed: remGroup.instructed,
                    parentRemitterName: remGroup.remitterName,
                    parentBuyerCode: remGroup.buyerCode,
                  });
                }
              });
            });
          });
        });
      }
      return Array.from(remMap.values());
    }, [Bills]);

    const bankCounts = useMemo(() => {
      const counts = { "All": 0, "ICICI Bank": 0, "Citi Bank": 0, "HSBC Bank": 0 }; 
      remittanceData.forEach((rem) => {
        const bankName = rem.bankName || "Unknown";
        counts[bankName] = (counts[bankName] || 0) + 1;
      });
      counts["All"] = remittanceData.length;
      return counts;
    }, [remittanceData]);

    const filteredData = useMemo(() => {
  let res = remittanceData.filter((rem) => remBankFilter === "All" || rem.bankName === remBankFilter);
  if (activeRemFilter !== "All") {
    res = res.filter((rem) => getRemittanceStatus(rem) === activeRemFilter);
  }
  return res;
}, [remittanceData, remBankFilter, activeRemFilter, getRemittanceStatus]);


    const displayedStatusCounts = useMemo(() => {
      const counts = { "All": 0, "Outstanding": 0, "Unutilized": 0, "Part utilized": 0, "Utilized": 0 };
      const bankFiltered = remittanceData.filter(rem => remBankFilter === "All" || rem.bankName === remBankFilter);
      counts["All"] = bankFiltered.length;
      bankFiltered.forEach(rem => {
          const status = getRemittanceStatus(rem);
          if (counts[status] !== undefined) counts[status]++;
      });
      return counts;
    }, [remittanceData, remBankFilter, getRemittanceStatus]);


    // --- HANDLERS ---
    
    const handleICICIUploadSubmit = () => {
    if (!iciciUploadJsonInput.trim()) return;

    try {
      // 1. Parse JSON
      const json = JSON.parse(iciciUploadJsonInput);
      const rawList = Array.isArray(json) ? json : (json.AssignmentDetails || []);

      // 2. Map to Standard Object
      const parsedData = rawList.map(item => {
        const mapped = {};
        Object.keys(ICICI_BANK_UPLOAD_MAPPING).forEach(key => {
          if (item[key] !== undefined) mapped[ICICI_BANK_UPLOAD_MAPPING[key]] = item[key];
        });

        return {
          ...mapped,
          bankName: "ICICI Bank",
          net: parseFloat(mapped.net) || 0,
          remRef: mapped.remRef || `ICICI-${Math.random().toString(36).substr(2,9)}`
        };
      });

      // 3. Send to Backend
      processAndUploadRemittances(parsedData);
      setIsICICIUploadModalOpen(false);

    } catch (e) {
      alert("Invalid JSON format");
    }
  };
    
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false); // To show loading state

const ITEMS_PER_PAGE = 10;

const paginatedData = useMemo(() => {
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;

  return filteredData.slice(start, end);
}, [filteredData, currentPage]);

const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);


    useEffect(() => {
  setCurrentPage(1);
}, [activeRemFilter, remBankFilter]);

    // Add this state locally if not passed from parent
    const [remittances, setRemittances] = useState([]);

    // --- FETCH DATA FUNCTION ---
    // REPLACE your existing fetchRemittances with this:
const fetchRemittances = async () => {
  setIsLoading(true);
  try {
    const response = await fetch("https://nijal2-1.onrender.com/api/remittances");
    const data = await response.json();

    // SAFETY CHECK: Ensure data is actually an array before using it
    if (Array.isArray(data)) {
      const mappedBills = [{
        shippingBillNo: "VIEW",
        invoiceList: [{
          invoiceNo: "ALL",
          remittanceList: data
        }]
      }];
      setBills(mappedBills);
    } else {
      console.error("API Error or Invalid Format:", data);
      setBills([]); // Prevent crash by setting empty array
    }

  } catch (err) {
    console.error(err);
    setBills([]);
  } finally {
    setIsLoading(false);
  }
};


    // Initial Load
    useEffect(() => {
      fetchRemittances(1);
    }, []);

    // Handle Page Change
    const handlePageChange = (newPage) => {
  if (newPage >= 1 && newPage <= totalPages) {
    setCurrentPage(newPage);
  }
};

// Place this inside your Component
  // --- HELPER: Upload to Backend & Refresh ---
  const processAndUploadRemittances = async (normalizedData) => {
    if (normalizedData.length === 0) {
      alert("No valid data found to upload.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Send standardized data to your new endpoint
      const response = await fetch('https://nijal2-1.onrender.com/api/remittances/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remittances: normalizedData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      // 2. Success Feedback
      setUpdateMessage(`Success! Uploaded ${result.count} records.`);
      setUploadDataInput("");
      setIciciUploadJsonInput("");
      
      // 3. Refresh the Table
      await fetchRemittances(); 

    } catch (error) {
      console.error("Upload Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

   const handleUploadSubmit = () => {
    if (!uploadDataInput.trim()) return;

    try {
      // 1. Parse Excel Text (Split by new lines, then tabs)
      const rows = uploadDataInput.trim().split("\n").map(row => row.split("\t"));
      const headers = rows[0].map(h => h.trim());

      // 2. Map to Standard Format
      const parsedData = rows.slice(1).map((row) => {
        const rawObj = {};
        // Map Excel columns to headers by index
        headers.forEach((h, i) => { rawObj[h] = row[i]?.trim(); });

        const mapped = {};
        // Use your CITI mapping to find values
        Object.keys(CITI_BANK_UPLOAD_MAPPING).forEach((csvKey) => {
          const internalKey = CITI_BANK_UPLOAD_MAPPING[csvKey];
          if (rawObj[csvKey]) mapped[internalKey] = rawObj[csvKey];
        });

        // Skip if no Remittance Ref found
        if (!mapped.remRef) return null;

        return {
          ...mapped,
          bankName: "Citi Bank",
          // Remove commas from numbers (e.g., "1,500.00" -> 1500.00)
          net: parseFloat((mapped.net || "0").replace(/,/g, '')) || 0,
        };
      }).filter(item => item !== null);

      // 3. Send to API
      processAndUploadRemittances(parsedData);
      setIsUploadModalOpen(false);

    } catch (error) {
      console.error(error);
      alert("Error parsing Citi data. Please check the Excel format.");
    }
  };
  

    return (
      <div className="flex bg-gray-50">
        {/* --- SIDEBAR --- */}
        
        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <header className="mb-6 flex flex-wrap justify-between items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900">Remittances</h1>
              
              <div className="flex gap-3">
                {remBankFilter === "Citi Bank" && (
                  <button onClick={() => setIsUploadModalOpen(true)} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-green-700 flex items-center gap-2">
                    <span>📥</span> Upload Citi
                  </button>
                )}
                {remBankFilter === "ICICI Bank" && (
                  <button onClick={() => setIsICICIUploadModalOpen(true)} className="bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-orange-700 flex items-center gap-2">
                    <span>📥</span> Upload ICICI
                  </button>
                )}
              </div>
            </header>

            {updateMessage && (
              <div className="mb-6 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-sm relative">
                <span className="block sm:inline">{updateMessage}</span>
                <button onClick={() => setUpdateMessage("")} className="absolute top-0 bottom-0 right-0 px-4 py-3">×</button>
              </div>
            )}

            {/* --- FILTERS SECTION --- */}
            <div className="mb-6 flex flex-wrap gap-4 items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
              {/* Bank Dropdown */}
              <div className="flex items-center gap-2 border-r pr-4">
                <label className="text-sm font-semibold text-black">Bank:</label>
                <select 
                  value={remBankFilter} 
                  onChange={(e) => setRemBankFilter(e.target.value)} 
                  className="py-1.5 pl-3 pr-8 border-gray-300 rounded-lg text-sm text-black focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                >
                  {Object.keys(bankCounts).sort((a,b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)).map((bankName) => (
                    <option key={bankName} value={bankName}>{bankName} ({bankCounts[bankName]})</option>
                  ))}
                </select>
              </div>

              {/* Status Buttons - USING UNIFIED COLORS */}
              <div className="flex flex-wrap gap-2">
                {["All", "Outstanding", "Unutilized", "Part utilized", "Utilized"].map((status) => {
                  const isActive = activeRemFilter === status;
                  const config = STATUS_COLORS[status];
                  return (
                    <button
                      key={status}
                      onClick={() => setActiveRemFilter(status)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${isActive ? config.buttonActive : config.buttonInactive}`}
                    >
                      {status} ({displayedStatusCounts[status]})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- TABLE SECTION --- */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-700">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-bold tracking-wider border-b">
                    <tr>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Remittance Ref</th>
                      <th className="px-6 py-3">Sender Ref</th>
                      <th className="px-6 py-3">Remitter</th>
                      <th className="px-6 py-3">IRM Details</th>
                      <th className="px-6 py-3">Purpose</th>
                      <th className="px-6 py-3 text-right">Amount (FCY)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedData.length > 0 ? (
                        paginatedData.flatMap((remGroup, groupIndex) => {

                        const rowSpan = remGroup.irmLines.length || 1;
                        const status = getRemittanceStatus(remGroup);
                        const statusColorClass = STATUS_COLORS[status]?.badge || "bg-gray-100 text-gray-800";

                        // Case 1: No IRM lines (Outstanding/Manual)
                        if (rowSpan === 1 && remGroup.irmLines.length === 0) {
                          return [
                            <tr 
                              key={`${remGroup.remRef}-${groupIndex}`} 
                              onDoubleClick={() => { setCurrentRemittance(remGroup); setIsRemittanceDetailModalOpen(true); }}
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <td className="px-6 py-4 align-top">
                                <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded-full ${statusColorClass}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="px-6 py-4 align-top">
                                <div className="font-bold text-gray-900">{remGroup.remRef}</div>
                                <div className="text-xs text-gray-500">{remGroup.remDate}</div>
                              </td>
                              <td className="px-6 py-4 align-top text-gray-600">{remGroup.senderRefNo}</td>
                              <td className="px-6 py-4 align-top">
                                <div className="font-medium text-gray-900">{remGroup.remitterName}</div>
                                <div className="text-xs text-gray-500">{remGroup.buyerCode}</div>
                              </td>
                              <td className="px-6 py-4 text-center text-gray-400">-</td>
                              <td className="px-6 py-4 text-center text-gray-400">-</td>
                              <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(remGroup.net, remGroup.currency)}</td>
                            </tr>
                          ];
                        }

                        // Case 2: Has IRM lines
                        return remGroup.irmLines.map((irm, irmIndex) => (
                          <tr 
                            key={`${remGroup.remRef}-${irmIndex}`} 
                            onDoubleClick={() => { setCurrentRemittance(remGroup); setIsRemittanceDetailModalOpen(true); }}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            {irmIndex === 0 && (
                              <>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-top border-r border-gray-100">
                                  <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded-full ${statusColorClass}`}>
                                    {status}
                                  </span>
                                </td>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-top border-r border-gray-100">
                                  <div className="font-bold text-gray-900">{remGroup.remRef}</div>
                                  <div className="text-xs text-gray-500">{remGroup.remDate}</div>
                                </td>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-top text-gray-600 border-r border-gray-100">{remGroup.senderRefNo}</td>
                                <td rowSpan={rowSpan} className="px-6 py-4 align-top border-r border-gray-100">
                                  <div className="font-medium text-gray-900">{remGroup.remitterName}</div>
                                  <div className="text-xs text-gray-500">{remGroup.buyerCode}</div>
                                </td>
                              </>
                            )}
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{irm.irmRef || "-"}</div>
                              <div className="text-xs text-gray-500">{irm.irmDate}</div>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-600 max-w-[150px] truncate">{irm.purposeDesc}</td>
                            <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(irm.irmUtilized, irm.currency)}</td>
                          </tr>
                        ));
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400 italic">
                          No remittances found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

               {/* PAGINATION UI */}
<div className="flex items-center justify-end gap-2 py-4 px-3 bg-white border-t">

  {/* Prev Button */}
  <button
    onClick={() => handlePageChange(currentPage - 1)}
    disabled={currentPage === 1}
    className={`px-3 py-2 rounded-lg text-sm font-medium border border-black-100
      ${currentPage === 1 ? "bg-gray-200 text-gray-400" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}
    `}
  >
    Prev
  </button>

  {/* Page Numbers */}
  {[...Array(totalPages)].map((_, index) => {
    const page = index + 1;
    const isActive = currentPage === page;

    return (
      <button
        key={page}
        onClick={() => handlePageChange(page)}
        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition
          ${isActive 
            ? "bg-gray-400 text-white shadow-md" 
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }
        `}
      >
        {page}
      </button>
    );
  })}

  {/* Next Button */}
  <button
    onClick={() => handlePageChange(currentPage + 1)}
    disabled={currentPage === totalPages}
    className={`px-3 py-2 rounded-lg text-sm font-medium border border-black-100
      ${currentPage === totalPages ? "bg-gray-200 text-gray-400" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}
    `}
  >
    Next
  </button>

</div>


              </div>
            </div>
          </main>
        </div>

        

        {/* 2. Upload Modal (ICICI) */}
        {/* 2. Upload Modal (ICICI) */}
      {isICICIUploadModalOpen && (
        // CHANGED: bg-black bg-opacity-50 -> bg-black/50
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Upload ICICI Remittances</h3>
              <button onClick={() => setIsICICIUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-2">Paste your JSON data below:</p>
              <textarea
                value={iciciUploadJsonInput}
                onChange={(e) => setIciciUploadJsonInput(e.target.value)}
                className="w-full h-64 border border-gray-300 text-black rounded-lg p-3 font-mono text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder='{ &quot;AssignmentDetails&quot;: ... }'
              ></textarea>
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setIsICICIUploadModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleICICIUploadSubmit} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-sm">Submit JSON</button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* --- MISSING CITI MODAL --- */}
      {/* 2b. Upload Modal (Citi) */}
      {isUploadModalOpen && (
        // CHANGED: bg-black bg-opacity-50 -> bg-black/50
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Upload Citi Remittances</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6">
              <p className="text-sm text-black mb-2">Paste your Excel data below:</p>
              <textarea
                value={uploadDataInput}
                onChange={(e) => setUploadDataInput(e.target.value)}
                className="w-full h-64 border border-gray-300 rounded-lg p-3 font-mono text-xs focus:ring-2 focus:ring-green-500 outline-none text-black text-sm"
                placeholder='Paste columns from Excel...'
              ></textarea>
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleUploadSubmit} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm">Submit Data</button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* 3. Detail Modal */}
        {isRemittanceDetailModalOpen && currentRemittance && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Remittance: {currentRemittance.remRef}</h3>
                <button onClick={() => setIsRemittanceDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payer Details</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{currentRemittance.remitterName}</span></p>
                      <p><span className="text-gray-500">Bank:</span> {currentRemittance.bankName}</p>
                      <p><span className="text-gray-500">Buyer Code:</span> {currentRemittance.buyerCode}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex flex-col justify-center items-center text-center">
                    <span className="text-sm text-blue-600 font-medium mb-1">Net Amount</span>
                    <span className="text-2xl font-bold text-blue-900">{formatCurrency(currentRemittance.net, currentRemittance.currency)}</span>
                    
                    {(!currentRemittance.irmLines || currentRemittance.irmLines.length === 0) ? (
                      <button 
                        onClick={() => handleOpenSettleModal(currentRemittance)} 
                        className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow hover:bg-blue-700 transition-colors"
                      >
                        Settle Now
                      </button>
                    ) : (
                      <span className="mt-3 px-3 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full uppercase">
                        {getRemittanceStatus(currentRemittance)}
                      </span>
                    )}
                  </div>
                </div>
                
                {currentRemittance.irmLines && currentRemittance.irmLines.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 mb-3">Settlement History</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                          <tr>
                            <th className="px-4 py-2 text-left">IRM Ref</th>
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-right">Utilized</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {currentRemittance.irmLines.map((irm, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 font-medium">{irm.irmRef}</td>
                              <td className="px-4 py-2 text-gray-500">{irm.irmDate}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(irm.irmUtilized, irm.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. Settle Modal - FIXED: accepting missing props to prevent crash */}
        {/* 4. Settle Modal */}
      {isSettleModalOpen && currentRemittance && (
        <SettleRemittanceModal 
          remittance={currentRemittance} 
          selectedInvoices={selectedInvoices}  // <--- PASS DATA HERE
          onClose={() => setIsSettleModalOpen(false)} 
          onSubmit={handleSettleSubmit}
          onOpenFetchInvoiceModal={handleOpenFetchInvoiceModal} 
        />
      )}

      {/* 5. Fetch Invoices Modal - Now a proper component */}
      {isFetchInvoiceModalOpen && (
        <FetchInvoiceModal 
           buyerCode={currentRemittance?.remitterName} 
           onClose={() => setIsFetchInvoiceModalOpen(false)}
           onAddInvoices={handleAddInvoices} // <--- PASS HANDLER HERE
        />
      )}

      </div>
    );
  }

  // --- SUB-COMPONENTS (Defined below Main Component) ---
// --- SUBMIT SETTLEMENT ---
  const handleSettleSubmit = async (remittance, invoices) => {
    // 1. Log or Process the data
    console.log("Settling Remittance:", remittance.remRef);
    console.log("With Invoices:", invoices);

    // 2. Here you would normally make an API call to save the settlement
    // await fetch('/api/settle', { method: 'POST', body: ... })

    // 3. Success Feedback
    setUpdateMessage(`Successfully settled ${invoices.length} invoices for ${remittance.remRef}`);
    
    // 4. Close Modals and Cleanup
    setIsSettleModalOpen(false);
    setSelectedInvoices([]); // Clear selection
    
    // 5. Optional: Refresh data
    // fetchRemittances(); 
  };

  // FIXED: SettleRemittanceModal now accepts onOpenFetchInvoiceModal
  const SettleRemittanceModal = ({ remittance, selectedInvoices = [], onClose, onSubmit, onOpenFetchInvoiceModal }) => {
  
  // Calculate total allocated from the selected invoices
  const totalAllocated = selectedInvoices.reduce((sum, inv) => sum + (inv.amountToSettle || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Settle Remittance</h3>
            <p className="text-sm text-gray-500">{remittance.remRef}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {/* Summary Bar */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-blue-50 border border-blue-100 p-4 rounded-lg">
              <span className="text-xs text-blue-600 font-bold uppercase">Total Net Amount</span>
              <div className="text-xl font-bold text-blue-900">{formatCurrency(remittance.net, remittance.currency)}</div>
            </div>
            <div className="flex-1 bg-green-50 border border-green-100 p-4 rounded-lg">
              <span className="text-xs text-green-600 font-bold uppercase">Allocated</span>
              <div className="text-xl font-bold text-green-900">{formatCurrency(totalAllocated, remittance.currency)}</div>
            </div>
          </div>

          {/* Settlement Table Area */}
          <div className="border rounded-lg mb-6">
            <div className="bg-gray-100 px-4 py-2 border-b flex justify-between items-center">
              <span className="font-semibold text-sm text-gray-700">Settlement Allocation</span>
              <button onClick={onOpenFetchInvoiceModal} className="text-blue-600 text-xs font-bold hover:underline">
                + Fetch Invoices
              </button>
            </div>

            {/* CONDITIONAL RENDERING: Check if we have invoices */}
            {selectedInvoices.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No invoices mapped. Click Fetch Invoices to begin.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2">Invoice #</th>
                      <th className="px-4 py-2">Shipping Bill</th>
                      <th className="px-4 py-2 text-right">To Settle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedInvoices.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{inv.invoiceNumber}</td>
                        <td className="px-4 py-2 text-gray-500">{inv.shippingBillNo}</td>
                        <td className="px-4 py-2 text-right text-blue-600 font-bold">
                          {formatCurrency(inv.amountToSettle, remittance.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100">Cancel</button>
          <button 
            onClick={() => onSubmit(remittance, selectedInvoices)} 
            disabled={selectedInvoices.length === 0}
            className={`px-5 py-2 bg-purple-600 text-white rounded-lg font-medium shadow-md ${selectedInvoices.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`}
          >
            Confirm Settlement
          </button>
        </div>
      </div>
    </div>
  );
  };

  // ==========================================
// 5. FETCH INVOICE MODAL (REAL API VERSION)
// ==========================================
const FetchInvoiceModal = ({ onClose, onAddInvoices, buyerCode }) => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [error, setError] = useState(null);

  // --- FETCH FROM DB ---
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!buyerCode) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // 👇 CHECK THIS URL: I'm assuming it's /api/invoices based on your other links
        // We pass buyerCode to only get invoices for THIS specific buyer
        const response = await fetch(`http://localhost:5000/api/invoices?buyerCode=${encodeURIComponent(buyerCode)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch invoices');
        }

        // className={`whitespace-nowrap py-2 px-4 rounded-lg font-medium text-sm transition-all ${
        //             activeInvoiceTab === index
        //               ? "bg-blue-600 text-white shadow-md"
        //               : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        //           }`}
        //         >

        const data = await response.json();

        // Safety: Ensure we have an array
        if (Array.isArray(data)) {
          setInvoices(data);
        } else if (data.invoices && Array.isArray(data.invoices)) {
          // specific case if your API returns { success: true, invoices: [...] }
          setInvoices(data.invoices); 
        } else {
          setInvoices([]);
        }

      } catch (err) {
        console.error("Error fetching invoices:", err);
        setError("Failed to load invoices. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [buyerCode]);

  // --- HANDLERS ---
  const toggleInvoice = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleConfirm = () => {
    // Get the full objects for the IDs selected
    const selectedList = invoices.filter(inv => selectedIds.has(inv._id || inv.id));
    
    // Map them to the format SettleModal expects
    // We default 'amountToSettle' to the full outstanding amount initially
    const formattedInvoices = selectedList.map(inv => ({
      id: inv._id || inv.id,
      invoiceNumber: inv.invoiceNo || inv.invoiceNumber, // Handle different DB field names
      shippingBillNo: inv.shippingBillNo || "N/A",
      total: inv.amount || inv.outstanding || 0,
      amountToSettle: inv.amount || inv.outstanding || 0, // Default to full amount
      currency: inv.currency || "USD"
    }));

    onAddInvoices(formattedInvoices);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Select Invoices</h3>
            <p className="text-xs text-gray-500">Fetching for Buyer: {buyerCode || "Unknown"}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-40 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="text-gray-500 text-sm">Loading invoices from database...</span>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-10 bg-red-50 rounded-lg">
              {error}
            </div>
          ) : invoices.length === 0 ? (
             <div className="text-center text-gray-400 py-10 border-2 border-dashed rounded-lg">
               No outstanding invoices found for this buyer.
             </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-xs uppercase text-gray-600 sticky top-0">
                <tr>
                  <th className="px-4 py-3 w-10">Select</th>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">SB Ref</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((inv) => {
                  const id = inv._id || inv.id; // Handle MongoDB _id or SQL id
                  const isSelected = selectedIds.has(id);
                  return (
                    <tr 
                      key={id} 
                      className={`hover:bg-purple-50 cursor-pointer transition-colors ${isSelected ? 'bg-purple-50' : ''}`}
                      onClick={() => toggleInvoice(id)}
                    >
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleInvoice(id)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{inv.invoiceNo || inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.shippingBillNo || "-"}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.invoiceDate || inv.date || "-"}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-700">
                        {formatCurrency((inv.amount || inv.outstanding), (inv.currency || "USD"))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {selectedIds.size} invoice{selectedIds.size !== 1 && 's'} selected
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100">
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className={`px-6 py-2 rounded-lg text-white font-medium shadow-sm transition-all
                ${selectedIds.size === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 hover:shadow-md'}
              `}
            >
              Add Selected
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};