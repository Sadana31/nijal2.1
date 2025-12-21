"use client"; // This directive is needed for Client Components that use hooks like useEffect.

import React, { useEffect, useState, useRef, useMemo } from "react";

// --- DUMMY DATA ---

// --- MAPPING CONFIGURATION for Citi Bank Upload ---
const CITI_BANK_UPLOAD_MAPPING = {
  "Senders Ref.": "senderRefNo",
  "Message ID": "remRef",
  "F50-ORG Name": "remitterName",
  "F58/59-BNF Name": "beneficiaryNameSwift",
  "Instr. Amount": "net", // Assuming Instr. Amount maps to net value
  "Instr. Val Date": "remDate", // Needs date parsing/formatting
  "Instr. Currency": "currency", // Used for the irmLines
  "Field 70": "remitterRemarks",
  "Field 72": "detailsOfCharges", // Note: Field 72 might contain more than just charge details
  "F71A (Details of Charges)": "charges", // Mapping F71A specifically to charges value, needs parsing
  "F52-OGB Address 1": null, // Not directly mapped currently
  "F52-OGB Address 2": null, // Not directly mapped currently
  "F58/59-BNF ANL/Party ID": "beneficiaryBankId",
};

// --- NEW: MAPPING CONFIGURATION for ICICI Bank Upload ---
const ICICI_BANK_UPLOAD_MAPPING = {
  GRSReferenceNo: "remRef",
  SendersReference: "senderRefNo",
  OrderingCustomerDetails: "remitterName",
  BeneficiaryCustomerDetails: "beneficiaryNameSwift", // Needs parsing potentially
  Amount: "net", // Assume this is net for now, might need adjustment based on Currency
  USDEquivalent: "usdEquivalent", // Store separately for potential use
  CreditAdviceValueDate: "remDate", // Parse ISO date
  ValueDate: "senderRefDate", // Parse ISO date, using this as sender date
  Currency: "currency",
  RemittanceInformation: "remitterRemarks",
  ChargesBorneBy: "detailsOfCharges", // Map 'B', 'R' etc.
  BeneficiaryCustomer: "beneficiaryBankId", // Use the account number if available
  // 'instructed' and 'charges' are not directly mapped, will be derived/defaulted
};

// --- HELPER FUNCTIONS (Moved outside component for initialization) ---

// Helper to format currency or show '-'
const formatCurrency = (value, currency) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "-"; // Show '-' for NaN
  // Format without currency symbol, but with currency code
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ""}`.trim();
};

const SB_STATUS_COLORS = {
  Outstanding: {
    badge: "bg-red-100 text-red-800",
    buttonActive: "bg-red-600 text-white",
    buttonInactive:
      "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
  },
  Lodged: {
    badge: "bg-blue-100 text-blue-800",
    buttonActive: "bg-blue-600 text-white",
    buttonInactive:
      "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100",
  },
  "Part Realized": {
    badge: "bg-yellow-100 text-yellow-800",
    buttonActive: "bg-yellow-500 text-white",
    buttonInactive:
      "bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100",
  },
  Realized: {
    badge: "bg-green-100 text-green-800",
    buttonActive: "bg-green-600 text-white",
    buttonInactive:
      "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100",
  },
  All: {
    buttonActive: "bg-gray-800 text-white",
    buttonInactive:
      "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200",
  },
};

// Calculate summary data for a single invoice based on its linked remittances
const calculateInvoiceSummaryWithRemittances = (invoice) => {
  const value = parseFloat(invoice?.exportbillvalue) || 0;
  const currency = invoice?.fobcurrencycode || "";
  const remittances = invoice?.remittanceList || []; // This is now a list of remittance *groups*

  let totalRealized = 0;
  let totalFbCharges = 0;

  // Iterate through each remittance group, then through each IRM line within it
  remittances.forEach((rem) => {
    (rem.irmLines || []).forEach((irmLine) => {
      totalRealized += parseFloat(irmLine.invRealized) || 0;
      totalFbCharges += parseFloat(irmLine.fbChargesRem) || 0;
    });
  });

  const reduction = 0;
  const outstanding = value - totalRealized - totalFbCharges - reduction;
  const status =
    outstanding <= 0
      ? "Realized"
      : totalRealized > 0
        ? "Part Realized"
        : "Pending";
  const statusClass =
    outstanding <= 0
      ? "bg-green-100 text-green-800"
      : totalRealized > 0
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";
  const hasDocs =
    (invoice?.invoiceDocuments && invoice.invoiceDocuments.length > 0) ||
    (invoice?.blDocuments && invoice.blDocuments.length > 0);
  const hasRemittanceData =
    remittances.length > 0 && (totalRealized > 0 || totalFbCharges > 0);

  return {
    value,
    realized: totalRealized,
    fbCharges: totalFbCharges,
    reduction,
    outstanding: outstanding > 0 ? outstanding : 0,
    status,
    statusClass,
    hasDocs,
    hasRemittanceData,
    currency: currency,
  };
};

// Simplified status check for lodging completeness
const areBillDetailsComplete = (bill) => {
  // For manually added remittances via upload, we might not have all bill details
  if (bill.isManualUpload) return true; // Assume complete for now

  const requiredBillFields = [
    "buyerName",
    "buyerAddress",
    "buyerCountryCode",
    "consigneeName",
    "consigneeAddress",
    "consigneeCountryCode",
    "originOfGoods",
    "portOfDestination",
    "buyerCode",
    "portOfLoading",
    "stateOfOrigin",
    "portOfDischarge",
    "countryOfDischarge",
    "portOfFinalDestination",
    "countryOfFinalDestination",
  ];
  for (const field of requiredBillFields) {
    if (!bill?.[field]) return false;
  } // Added optional chaining
  const requiredInvoiceFields = [
    "tenorasperInvoice",
    "commodityDescription",
    "shippingCompanyName",
    "blAWBLRRRNo",
    "vesselName",
    "blDate",
  ];
  if (bill?.invoiceList && bill.invoiceList.length > 0) {
    for (const invoice of bill.invoiceList) {
      for (const field of requiredInvoiceFields) {
        if (!invoice?.[field]) return false;
      }
      if (!invoice?.invoiceDocuments || invoice.invoiceDocuments.length === 0)
        return false;
      if (!invoice?.blDocuments || invoice.blDocuments.length === 0)
        return false;
    }
  } else {
    return false;
  } // Need at least one invoice for a non-manual bill
  return true;
};

// Function to get combined primary and secondary status
const getCombinedStatus = (bill) => {
  // Handle manually uploaded "placeholder" bills differently
  if (bill.isManualUpload) {
    // These are just containers for outstanding remittances
    // NEW: Check if it has been settled (i.e., has irmLines now)
    const hasIrmLines =
      bill.invoiceList?.[0]?.remittanceList?.[0]?.irmLines?.length > 0;
    if (hasIrmLines) {
      return {
        primary: {
          text: "Part Realized",
          className: "bg-yellow-100 text-yellow-800",
        }, // Or 'Utilized' depending on logic
        secondary: {
          text: "Manual Upload - Settled",
          className: "text-gray-500",
        },
      };
    }
    return {
      primary: { text: "Outstanding", className: "bg-blue-100 text-blue-800" },
      secondary: { text: "Manual Upload", className: "text-gray-500" },
    };
  }

  let primary = { text: "Outstanding", className: "bg-blue-100 text-blue-800" };
  let secondary = { text: "", className: "" };
  let lodgementno = bill?.lodgementno;

  if (!bill) return { primary, secondary }; // Safety check

  if (lodgementno) {
    let totalFob = 0;
    let totalOutstanding = 0;
    const invoices = bill.invoiceList || [];
    invoices.forEach((inv) => {
      const summary = calculateInvoiceSummaryWithRemittances(inv);
      totalFob += summary.value;
      totalOutstanding += summary.outstanding;
    });

    // Determine Primary Status based on bill totals
    if (totalOutstanding <= 0 && totalFob > 0) {
      // Check totalFob > 0 to differentiate from bills with 0 value
      primary = { text: "Realized", className: "bg-green-100 text-green-800" };
    } else if (totalOutstanding < totalFob) {
      primary = {
        text: "Part Realized",
        className: "bg-yellow-100 text-yellow-800",
      };
    } else {
      // outstanding == totalFob or totalFob is 0
      primary = { text: "Lodged", className: "bg-indigo-100 text-indigo-800" };
    }

    // Determine Secondary Status (uses the *bill* data)
    const detailsComplete = areBillDetailsComplete(bill);
    if (
      bill.remittanceStatus === "Full Advance" ||
      bill.remittanceStatus === "Part Advance"
    ) {
      if (!detailsComplete) {
        secondary = {
          text: "Details & IRM Map Pending",
          className: "text-yellow-600",
        };
      } else if (
        bill.remittanceMapping === "Map later" ||
        !bill.remittanceMapping
      ) {
        secondary = {
          text: "IRM Mapping Pending",
          className: "text-orange-600",
        };
      } else {
        // If details complete AND mapping done (or not needed), consider it ready
        // Secondary status can be empty or reflect something else if needed
        secondary = { text: "", className: "" }; // Clear secondary if ready
      }
    } else {
      // No Advance
      if (!detailsComplete) {
        secondary = { text: "Details Pending", className: "text-yellow-600" };
      } else {
        // Secondary status can be empty if lodged and details are complete
        secondary = { text: "", className: "" }; // Clear secondary if ready
      }
    }
  } else {
    // Not Lodged - Outstanding
    const detailsComplete = areBillDetailsComplete(bill);
    if (!detailsComplete) {
      secondary = { text: "Details Pending", className: "text-yellow-600" };
    } else {
      secondary = { text: "Lodgement Ready", className: "text-green-600" };
    }
  }

  return { primary, secondary };
};

// --- MAIN COMPONENT ---
export default function ShippingBillsPage() {
  const [viewMode, setViewMode] = useState("invoice"); // 'invoice' or 'shippingBill'
  const [allBills, setAllBills] = useState([]); // Start with empty array
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [error, setError] = useState(null); // Add error state
  // const [selectedBills, setSelectedBills] = useState([]); // Removed
  const [filterStatus, setFilterStatus] = useState("All"); // State for quick filter
  const [bankFilter, setBankFilter] = useState("All"); // NEW: State for bank filter
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State for sidebar
  const [activePage, setActivePage] = useState("shippingBill"); // 'shippingBill' or 'remittances'

  // --- MODAL STATES ---
  const [isListModalOpen, setListModalOpen] = useState(false);
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [isLodgeModalOpen, setLodgeModalOpen] = useState(false);
  const [isRemittanceModalOpen, setRemittanceModalOpen] = useState(false);
  const [isDoubleClickModalOpen, setIsDoubleClickModalOpen] = useState(false);
  const [isRemittanceDetailModalOpen, setIsRemittanceDetailModalOpen] =
    useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false); // Citi Upload Modal
  const [isICICIUploadModalOpen, setIsICICIUploadModalOpen] = useState(false); // NEW: ICICI Upload Modal
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false); // NEW: Settlement Modal
  const [isFetchInvoiceModalOpen, setIsFetchInvoiceModalOpen] = useState(false); // NEW: Fetch Available Invoices Modal
  // --- NEW: State for fetching settled remittances ---
  const [isFetchSettledRemModalOpen, setIsFetchSettledRemModalOpen] =
    useState(false);
  const [availableSettledRemittances, setAvailableSettledRemittances] =
    useState([]);
  const [selectedSettledRemittances, setSelectedSettledRemittances] = useState(
    {},
  ); // { 'irmRef': boolean }
  const [pendingRemittances, setPendingRemittances] = useState([]); // Holds new IRMs to be added to the table
  // ---
  const [activeDetailTab, setActiveDetailTab] = useState(
    "Custom Invoice Details",
  );
  const [activeCustomInvoiceSubTab, setActiveCustomInvoiceSubTab] = useState(0);
  const [activeSettlementSubTab, setActiveSettlementSubTab] = useState(0);

  const [remittanceStep, setRemittanceStep] = useState(1);
  const [remittanceChoice, setRemittanceChoice] = useState("");

  // State for the bill being processed
  const [currentBill, setCurrentBill] = useState(null);
  const [currentRemittance, setCurrentRemittance] = useState(null); // Used for Detail and Settlement modals
  // NEW: State to track the currently active invoice index in the double-click modal
  const [activeInvoiceIndexInModal, setActiveInvoiceIndexInModal] = useState(0);

  // State for modal inputs
  const [listJsonInput, setListJsonInput] = useState("");
  const [detailsJsonResponseInput, setDetailsJsonResponseInput] = useState("");
  const [detailsJsonRequest, setDetailsJsonRequest] = useState("");
  const [uploadDataInput, setUploadDataInput] = useState(""); // Citi Upload Data Input
  const [iciciUploadJsonInput, setIciciUploadJsonInput] = useState(""); // NEW: ICICI Upload JSON Input

  // State for user feedback messages
  const [updateMessage, setUpdateMessage] = useState("");

  // --- LODGE MODAL FORM STATE ---
  const [lodgeFormState, setLodgeFormState] = useState({});
  const [activeInvoiceTab, setActiveInvoiceTab] = useState(0);

  // --- NEW: State for Fetch Available Invoices ---
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [selectedFetchInvoices, setSelectedFetchInvoices] = useState({}); // Stores selected invoices for settlement

  // --- DERIVED DATA (useMemo) ---

  // Derive a unique list of all remittances (remittance groups) from allBills
  const remittanceData = useMemo(() => {
    const remMap = new Map();

    // This derivation is now bank-agnostic at the start.
    // The RemittancesTable component will handle the bank filtering for display.

    // This logic needs to be robust. We map by remRef
    allBills.forEach((bill) => {
      // Process remittances (even for manual uploads)
      bill.invoiceList?.forEach((inv) => {
        // Use invoiceList even for manual uploads
        inv.remittanceList?.forEach((rem) => {
          // rem is a remittance *group*

          const irmLines = (rem.irmLines || []).map((irm) => ({
            ...irm,
            purposeCode:
              irm.purposeCode || (rem.irmRef === "IRM-P01" ? "P0102" : "P0103"),
            purposeDesc:
              irm.purposeDesc ||
              (rem.irmRef === "IRM-P01"
                ? "Export of Goods"
                : "Advance against Export"),
            currency: irm.currency || rem.currency || inv.fobcurrencycode, // Inherit currency
          }));

          let remGroup = remMap.get(rem.remRef);
          if (!remGroup) {
            remGroup = {
              remRef: rem.remRef,
              remDate: rem.remDate,
              net: rem.net,
              instructed: rem.instructed,
              charges: rem.charges,
              senderRefNo: rem.senderRefNo,
              senderRefDate: rem.senderRefDate,
              remitterName: rem.remitterName,
              // Add new fields from remittance group
              beneficiaryNameSwift: rem.beneficiaryNameSwift,
              remitterRemarks: rem.remitterRemarks,
              detailsOfCharges: rem.detailsOfCharges,
              beneficiaryBankId: rem.beneficiaryBankId,
              buyerCode:
                bill.buyerCode ||
                (bill.buyerName ? bill.buyerName.split(" ")[0] : "N/A"),
              bankName: bill.bankName,
              adCode: bill.adCode,
              ifscCode: bill.ifscCode,
              irmLines: [],
              // Add currency at remittance group level for uploads
              currency: rem.currency || inv.fobcurrencycode, // Get from rem or invoice
            };
            remMap.set(rem.remRef, remGroup);
          }

          // Add IRM lines, ensuring no duplicates
          irmLines.forEach((irmLine) => {
            if (
              !remGroup.irmLines.some(
                (existing) => existing.irmRef === irmLine.irmRef,
              )
            ) {
              // Store the parent remittance details *with* the IRM line for later use
              remGroup.irmLines.push({
                ...irmLine,
                // Add parent rem details for easy access
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

    return Array.from(remMap.values());
  }, [allBills]); // Only depends on allBills

  const hasDuplicateInvoices = (bill) => {
    if (!bill.invoiceList || bill.invoiceList.length <= 1) return false;
    const invoicenos = bill.invoiceList.map((inv) => inv.invoiceno);
    const uniqueinvoicenos = new Set(invoicenos);
    return uniqueinvoicenos.size !== invoicenos.length;
  };

  const isDuplicate = (newBill, existingBills) => {
    return existingBills.some((existingBill) => {
      // Don't check duplicates against manually uploaded placeholders
      if (existingBill.isManualUpload || newBill.isManualUpload) return false;

      const mainDetailsMatch =
        existingBill.shippingBillNo === newBill.shippingBillNo &&
        (existingBill.shippingBillDate || existingBill.shippingDate) ===
          (newBill.shippingBillDate || newBill.shippingDate) &&
        existingBill.dueDate === newBill.dueDate &&
        existingBill.portCode === newBill.portCode &&
        existingBill.ieCode === newBill.ieCode;
      if (!mainDetailsMatch) return false;
      const existingInvoices = existingBill.invoiceList || [];
      const newInvoices = newBill.invoiceList || [];
      if (existingInvoices.length !== newInvoices.length) return false;
      if (existingInvoices.length === 0) return true;
      const invoiceSignature = (inv) =>
        `${inv.invoiceno}|${inv.invoicedate}|${inv.exportbillvalue}`;
      const existingInvoiceSignatures = new Set(
        existingInvoices.map(invoiceSignature),
      );
      return newInvoices.every((inv) =>
        existingInvoiceSignatures.has(invoiceSignature(inv)),
      );
    });
  };

  const handleFetchListSubmit = () => {
    if (!listJsonInput) {
      alert("Please provide the JSON response.");
      return;
    }
    try {
      const newData = JSON.parse(listJsonInput);
      const billList =
        newData?.fetchList?.shipBillFetchSuccesful?.shippingbillList ||
        newData?.shippingbillList;
      if (billList && Array.isArray(billList)) {
        const newBillsToAdd = [];
        let flawedCount = 0;
        let duplicateCount = 0;

        billList.forEach((bill) => {
          const billWithBank = {
            ...bill,
            bankName: "ICICI Bank",
            adCode: "ICIC0001",
            ifscCode: "ICIC0000001",
          };
          if (hasDuplicateInvoices(billWithBank)) flawedCount++;
          else if (
            isDuplicate(billWithBank, allBills) ||
            isDuplicate(billWithBank, newBillsToAdd)
          )
            duplicateCount++;
          else newBillsToAdd.push(billWithBank);
        });

        if (newBillsToAdd.length > 0)
          setAllBills((prevBills) => [...newBillsToAdd, ...prevBills]);

        let successMsgParts = [];
        if (newBillsToAdd.length > 0)
          successMsgParts.push(`${newBillsToAdd.length} new bill(s) added`);
        if (flawedCount > 0)
          successMsgParts.push(
            `${flawedCount} bill(s) ignored (duplicate invoices)`,
          );
        if (duplicateCount > 0)
          successMsgParts.push(`${duplicateCount} duplicate bill(s) ignored`);
        setUpdateMessage(
          successMsgParts.length > 0
            ? `Fetch complete: ${successMsgParts.join(", ")}.`
            : "No valid new bills found.",
        );
        setListJsonInput("");
        setListModalOpen(false);
      } else alert('Invalid JSON format. Expected "shippingbillList" array.');
    } catch (error) {
      alert("Error parsing JSON.");
      console.error("JSON Error:", error);
    }
  };

  const handleOpenDetailsModal = () => {
    const billsWithoutInvoice = allBills
      .filter(
        (bill) =>
          bill.bankName === "ICICI Bank" &&
          !bill.isManualUpload &&
          (!bill.invoiceList || bill.invoiceList.length === 0),
      )
      .map((bill) => bill.shippingBillNo);
    setDetailsJsonRequest(
      JSON.stringify({ shippingBillNumbers: billsWithoutInvoice }, null, 2),
    );
    setDetailsJsonResponseInput("");
    setDetailsModalOpen(true);
  };

  const handleFetchDetailsSubmit = () => {
    if (!detailsJsonResponseInput) {
      alert("Please provide the JSON response.");
      return;
    }
    try {
      const newData = JSON.parse(detailsJsonResponseInput);
      const newBillDetailsList = newData?.fetchSuccess?.shippingbillList;
      if (newBillDetailsList && Array.isArray(newBillDetailsList)) {
        let updatedCount = 0;
        let addedCount = 0;
        let ignoredCount = 0;
        const currentBills = [...allBills];
        const billsMap = new Map(
          currentBills.map((bill) => [bill.shippingBillNo, bill]),
        );
        newBillDetailsList.forEach((newBillData) => {
          const newBill = {
            ...newBillData,
            bankName: "ICICI Bank",
            adCode: "ICIC0001",
            ifscCode: "ICIC0000001",
          };
          if (hasDuplicateInvoices(newBill)) ignoredCount++;
          else if (billsMap.has(newBill.shippingBillNo)) {
            if (!isDuplicate(newBill, [billsMap.get(newBill.shippingBillNo)])) {
              Object.assign(billsMap.get(newBill.shippingBillNo), newBill);
              updatedCount++;
            } else ignoredCount++;
          } else if (
            !isDuplicate(newBill, currentBills.slice(allBills.length))
          ) {
            currentBills.unshift(newBill);
            addedCount++;
          } else ignoredCount++;
        });
        if (addedCount > 0 || updatedCount > 0) setAllBills(currentBills);
        let messageParts = [];
        if (addedCount > 0)
          messageParts.push(`${addedCount} new bill(s) added`);
        if (updatedCount > 0)
          messageParts.push(`${updatedCount} bill(s) updated`);
        if (ignoredCount > 0)
          messageParts.push(`${ignoredCount} duplicate/flawed bill(s) ignored`);
        setUpdateMessage(
          messageParts.length > 0
            ? `Success! ${messageParts.join(", ")}.`
            : "No changes were made.",
        );
        setDetailsModalOpen(false);
        setDetailsJsonResponseInput("");
      } else alert('Invalid JSON format. Expected "shippingbillList" array.');
    } catch (error) {
      alert("Error parsing JSON.");
      console.error("JSON Error:", error);
    }
  };

  // --- Citi Bank: Handle Remittance Upload ---
  const handleUploadSubmit = () => {
    if (!uploadDataInput) {
      alert("Please paste data into the text area.");
      return;
    }

    const lines = uploadDataInput.trim().split("\n");
    if (lines.length < 2) {
      alert("Data must include a header row and at least one data row.");
      return;
    }

    const headers = lines[0].split("\t").map((h) => h.trim());
    const newRemittanceBills = [];
    let addedCount = 0;
    let errorCount = 0;

    // Create header index map
    const headerIndexMap = {};
    headers.forEach((header, index) => {
      headerIndexMap[header] = index;
    });

    // Simple date parsing (assumes DD/MM/YYYY or similar)
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      // Basic attempt, might need more robust parsing
      const parts = dateStr.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (parts) {
        // Return in DD-MM-YYYY format
        return `${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}-${parts[3]}`;
      }
      // Try YYYY-MM-DD
      const partsISO = dateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
      if (partsISO) {
        return `${partsISO[3].padStart(2, "0")}-${partsISO[2].padStart(2, "0")}-${partsISO[1]}`;
      }
      return dateStr; // Return original if parsing fails
    };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split("\t").map((v) => v.trim());
      if (values.length !== headers.length) {
        console.warn(`Skipping line ${i + 1}: Incorrect number of columns.`);
        errorCount++;
        continue;
      }

      const remData = {};
      let currency = "USD"; // Default currency

      for (const excelHeader in CITI_BANK_UPLOAD_MAPPING) {
        const ourField = CITI_BANK_UPLOAD_MAPPING[excelHeader];
        if (ourField && headerIndexMap[excelHeader] !== undefined) {
          let value = values[headerIndexMap[excelHeader]];

          // Specific parsing/formatting
          if (ourField === "remDate" || ourField === "senderRefDate") {
            value = parseDate(value);
          } else if (
            ourField === "net" ||
            ourField === "charges" ||
            ourField === "instructed"
          ) {
            // Added instructed
            value = parseFloat(value.replace(/,/g, "")) || 0; // Remove commas and parse
          } else if (ourField === "currency") {
            currency = value || "USD"; // Capture currency
            continue; // Don't add currency directly to top level
          }

          remData[ourField] = value;
        }
      }
      // Also add instructed amount if not mapped but 'net' is
      if (remData.net && !remData.instructed) {
        remData.instructed = remData.net + (remData.charges || 0);
      }

      // Create a minimal "bill" structure to hold this remittance
      // Mark it as a manual upload
      const newBill = {
        shippingBillNo: `MANUAL-${remData.remRef || Date.now()}`, // Placeholder SB No
        isManualUpload: true,
        bankName: "Citi Bank",
        adCode: "CITI0001",
        ifscCode: "CITI0000002",
        buyerName: remData.remitterName, // Add remitter name as buyer name
        invoiceList: [
          {
            // Need invoiceList structure
            fobcurrencycode: currency, // Store currency here
            remittanceList: [
              {
                ...remData,
                currency: currency, // Also store currency at remittance level
                irmLines: [], // Outstanding remittances have no IRM lines yet
              },
            ],
          },
        ],
      };

      // Basic validation: Check if remRef exists
      if (!newBill.invoiceList[0].remittanceList[0].remRef) {
        console.warn(
          `Skipping line ${i + 1}: Missing required field 'Message ID' (remRef).`,
        );
        errorCount++;
        continue;
      }

      newRemittanceBills.push(newBill);
      addedCount++;
    }

    if (newRemittanceBills.length > 0) {
      setAllBills((prevBills) => [...newRemittanceBills, ...prevBills]);
    }

    let message = `Citi Upload complete: ${addedCount} remittance(s) added.`;
    if (errorCount > 0) {
      message += ` ${errorCount} row(s) ignored due to errors (check console).`;
    }
    setUpdateMessage(message);
    setUploadDataInput("");
    setIsUploadModalOpen(false);
  };

  // --- NEW: ICICI Bank: Handle Remittance Upload ---
  const handleICICIUploadSubmit = () => {
    if (!iciciUploadJsonInput) {
      alert("Please paste the JSON data into the text area.");
      return;
    }

    try {
      const jsonData = JSON.parse(iciciUploadJsonInput);
      const assignments = jsonData?.AssignmentDetails?.DTAssignment;

      if (!assignments || !Array.isArray(assignments)) {
        alert(
          'Invalid JSON format. Expected "AssignmentDetails.DTAssignment" array.',
        );
        return;
      }

      const newRemittanceBills = [];
      let addedCount = 0;
      let errorCount = 0;

      // Date parsing for ISO format (YYYY-MM-DDTHH:mm:ss)
      const parseISODate = (dateStr) => {
        if (!dateStr) return null;
        try {
          const date = new Date(dateStr);
          // Return in DD-MM-YYYY format
          return `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getFullYear()}`;
        } catch (e) {
          console.warn(`Could not parse date: ${dateStr}`);
          return dateStr; // Return original if parsing fails
        }
      };

      assignments.forEach((item, index) => {
        const remData = {};
        let currency = "INR"; // Default, will be overridden
        let netAmount = 0;
        let usdEquivalent = 0;

        for (const jsonKey in ICICI_BANK_UPLOAD_MAPPING) {
          const ourField = ICICI_BANK_UPLOAD_MAPPING[jsonKey];
          if (
            ourField &&
            item[jsonKey] !== undefined &&
            item[jsonKey] !== null
          ) {
            let value = item[jsonKey];

            // Specific parsing/formatting
            if (ourField === "remDate" || ourField === "senderRefDate") {
              value = parseISODate(value);
            } else if (ourField === "net") {
              netAmount = parseFloat(value.replace(/,/g, "")) || 0;
              value = netAmount;
            } else if (ourField === "usdEquivalent") {
              usdEquivalent = parseFloat(value.replace(/,/g, "")) || 0;
              value = usdEquivalent; // Store it but continue
              remData[ourField] = value; // Store usdEquivalent separately
              continue;
            } else if (ourField === "currency") {
              currency = value || "INR";
            } else if (ourField === "beneficiaryNameSwift") {
              // Attempt basic parsing: "NAME ACC_NO" -> "NAME"
              value = value.split(" ")[0] || value; // Take first part
            } else if (ourField === "beneficiaryBankId") {
              // Assume BeneficiaryCustomer is the account number or ID needed
              value = value;
            }

            remData[ourField] = value;
          }
        }

        // Derive instructed and charges (Simplified logic)
        // Assume 'Amount' is net if currency is INR, otherwise 'Amount' is FCY net
        if (currency !== "INR") {
          remData.net = netAmount; // Use Amount as net FCY
          remData.instructed = netAmount; // Assume instructed is same as net if no charges info
          remData.charges = 0; // Assume 0 charges
        } else {
          // If currency is INR, maybe use USDEquivalent as the FCY amount?
          remData.net = usdEquivalent; // Use USD equivalent as net FCY
          remData.instructed = usdEquivalent; // Assume same
          remData.charges = 0;
          remData.currency = "USD"; // Override currency to USD
        }

        // Create placeholder bill
        const newBill = {
          shippingBillNo: `MANUAL-${remData.remRef || Date.now() + index}`, // Add index for uniqueness
          isManualUpload: true,
          bankName: "ICICI Bank",
          adCode: "ICIC0001",
          ifscCode: "ICIC0000001",
          buyerName: remData.remitterName,
          invoiceList: [
            {
              fobcurrencycode: remData.currency, // Use determined currency
              remittanceList: [
                {
                  ...remData,
                  currency: remData.currency, // Ensure currency is on remittance too
                  irmLines: [],
                },
              ],
            },
          ],
        };

        // Basic validation
        if (!newBill.invoiceList[0].remittanceList[0].remRef) {
          console.warn(
            `Skipping item ${index + 1}: Missing required field 'GRSReferenceNo' (remRef).`,
          );
          errorCount++;
          return; // Skip this item
        }

        newRemittanceBills.push(newBill);
        addedCount++;
      });

      if (newRemittanceBills.length > 0) {
        setAllBills((prevBills) => [...newRemittanceBills, ...prevBills]);
      }

      let message = `ICICI Upload complete: ${addedCount} remittance(s) added.`;
      if (errorCount > 0) {
        message += ` ${errorCount} item(s) ignored due to errors (check console).`;
      }
      setUpdateMessage(message);
      setIciciUploadJsonInput(""); // Clear input
      setIsICICIUploadModalOpen(false); // Close modal
    } catch (error) {
      alert("Error parsing JSON.");
      console.error("JSON Parse Error:", error);
    }
  };

  // --- NEW: Handle opening the Settle modal ---
  const handleOpenSettleModal = (remittance) => {
    setCurrentRemittance(remittance); // Set the remittance to be settled
    setIsRemittanceDetailModalOpen(false); // Close the detail modal if open
    setIsSettleModalOpen(true); // Open the settlement modal
    // NEW: Reset fetch invoices state
    setAvailableInvoices([]);
    setSelectedFetchInvoices({});
  };

  // --- NEW: Handle Settlement Submit ---
  const handleSettleSubmit = (globalSettlementData, settlementsArray) => {
    console.log("Global Settlement Data Submitted:", globalSettlementData);
    console.log("Settlements Array Submitted:", settlementsArray);

    // Find the original placeholder bill associated with the remittance being settled
    const billIndex = allBills.findIndex(
      (b) =>
        b.isManualUpload &&
        b.invoiceList[0]?.remittanceList?.some(
          (r) => r.remRef === currentRemittance.remRef,
        ),
    );

    if (billIndex !== -1) {
      const updatedBills = [...allBills];
      // Get a mutable copy of the bill
      const billToUpdate = { ...updatedBills[billIndex] };
      // Ensure invoiceList and remittanceList exist and are mutable copies
      billToUpdate.invoiceList = [...billToUpdate.invoiceList];
      billToUpdate.invoiceList[0] = { ...billToUpdate.invoiceList[0] };
      billToUpdate.invoiceList[0].remittanceList = [
        ...billToUpdate.invoiceList[0].remittanceList,
      ];

      // Find the specific remittance within the bill
      const remIndex = billToUpdate.invoiceList[0].remittanceList.findIndex(
        (r) => r.remRef === currentRemittance.remRef,
      );

      if (remIndex !== -1) {
        // Get a mutable copy of the remittance
        const remittanceToUpdate = {
          ...billToUpdate.invoiceList[0].remittanceList[remIndex],
        };

        // --- Generate IRM Lines from Settlements Array ---
        const allNewIrmLines = settlementsArray.flatMap(
          (settlement, settlementIndex) => {
            return settlement.linkedInvoices.map((invData, invIndex) => ({
              irmRef: `IRM-${Date.now()}-${settlementIndex}-${invIndex}`, // More unique IRM ref
              irmDate: new Date()
                .toLocaleDateString("en-GB")
                .replace(/\//g, "-"), // Today's date
              purposeCode: settlement.purposeCode,
              purposeDesc: settlement.purposeDescription,
              irmUtilized: invData.remittanceUtilized,
              currency: invData.currency,
              convRate: invData.convRate,
              invRealized: invData.invoiceRealized,
              fbChargesRem: invData.fbCharges,
            }));
          },
        );

        // Update the remittance with the new IRM line(s)
        remittanceToUpdate.irmLines = [
          ...(remittanceToUpdate.irmLines || []),
          ...allNewIrmLines,
        ];
        // Update the main charges on the remittance object itself based on global data
        remittanceToUpdate.charges = globalSettlementData.totalFbCharges;

        // Put the updated remittance back into the structure
        billToUpdate.invoiceList[0].remittanceList[remIndex] =
          remittanceToUpdate;

        // Put the updated bill back into the main array
        updatedBills[billIndex] = billToUpdate;

        setAllBills(updatedBills); // Update the state
        setUpdateMessage(
          `Remittance ${currentRemittance.remRef} settled successfully.`,
        );
      } else {
        console.error("Remittance not found within the placeholder bill.");
        setUpdateMessage(
          `Error: Could not find remittance ${currentRemittance.remRef} to settle.`,
        );
      }
    } else {
      console.error("Placeholder bill for the remittance not found.");
      setUpdateMessage(
        `Error: Could not find bill for remittance ${currentRemittance.remRef}.`,
      );
    }

    setIsSettleModalOpen(false);
    setCurrentRemittance(null); // Clear current remittance
  };

  // --- NEW: Handle opening Fetch Available Invoices Modal ---
  const handleOpenFetchInvoiceModal = () => {
    const outstandingInvoices = allBills
      .flatMap((bill) =>
        bill.isManualUpload
          ? [] // Exclude manual upload placeholders
          : (bill.invoiceList || []).map((inv) => {
              const summary = calculateInvoiceSummaryWithRemittances(inv);
              return {
                ...inv,
                outstanding: summary.outstanding,
                shippingBillNo: bill.shippingBillNo,
                shippingBillDate: bill.shippingBillDate || bill.shippingDate,
                buyerName: bill.buyerName,
                buyerCode: bill.buyerCode,
              };
            }),
      )
      .filter((inv) => inv.outstanding > 0); // Only include those with outstanding amount

    setAvailableInvoices(outstandingInvoices);
    setSelectedFetchInvoices({}); // Reset selection
    setIsFetchInvoiceModalOpen(true);
  };

  // --- NEW: Handle Selection in Fetch Modal ---
  const handleFetchInvoiceSelectionChange = (invoiceKey) => {
    setSelectedFetchInvoices((prev) => ({
      ...prev,
      [invoiceKey]: !prev[invoiceKey],
    }));
  };

  // --- LODGE/REGULARIZE FLOW (Existing) ---
  const handleOpenLodgeModal = (bill) => {
    setCurrentBill(bill);
    setLodgeFormState({
      ...bill,
      buyerName: bill.buyerName || "",
      buyerAddress: bill.buyerAddress || "",
      buyerCountryCode: bill.buyerCountryCode || "",
      buyerCode: bill.buyerCode || "",
      isConsigneeSame: bill.isConsigneeSame || false,
      consigneeName: bill.consigneeName || "",
      consigneeAddress: bill.consigneeAddress || "",
      consigneeCountryCode: bill.consigneeCountryCode || "",
      originOfGoods: bill.originOfGoods || "India",
      stateOfOrigin: bill.stateOfOrigin || "",
      portOfLoading: bill.portOfLoading || "",
      portOfDestination: bill.portOfDestination || "",
      portOfDischarge: bill.portOfDischarge || "",
      countryOfDischarge: bill.countryOfDischarge || "",
      portOfFinalDestination: bill.portOfFinalDestination || "",
      countryOfFinalDestination: bill.countryOfFinalDestination || "",
      invoiceList: (bill.invoiceList || []).map((inv) => ({
        ...inv,
        invoiceDocuments: inv.invoiceDocuments || [],
        blDocuments: inv.blDocuments || [],
      })),
    });
    setActiveInvoiceTab(0);
    setLodgeModalOpen(true);
  };

  const handleLodgeFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newFormState = {
      ...lodgeFormState,
      [name]: type === "checkbox" ? checked : value,
    };

    if (name === "isConsigneeSame" && checked) {
      newFormState.consigneeName = newFormState.buyerName;
      newFormState.consigneeAddress = newFormState.buyerAddress;
      newFormState.consigneeCountryCode = newFormState.buyerCountryCode;
    }
    if (name === "consigneeCountryCode") {
      newFormState.portOfDestination = value;
      newFormState.countryOfDischarge = value;
      newFormState.countryOfFinalDestination = value;
    }
    setLodgeFormState(newFormState);
  };

  const handleInvoiceFormChange = (index, e) => {
    const { name, value } = e.target;
    const updatedInvoices = [...lodgeFormState.invoiceList];
    updatedInvoices[index][name] = value;
    setLodgeFormState((prevState) => ({
      ...prevState,
      invoiceList: updatedInvoices,
    }));
  };

  const handlePrefillInvoice = (targetIndex) => {
    const sourceInvoice = lodgeFormState.invoiceList[0];
    const updatedInvoices = [...lodgeFormState.invoiceList];
    const fieldsToCopy = [
      "tenorasperInvoice",
      "commodityDescription",
      "shippingCompanyName",
      "blAWBLRRRNo",
      "vesselName",
      "blDate",
      "commercialinvoiceno",
    ];
    fieldsToCopy.forEach((field) => {
      updatedInvoices[targetIndex][field] = sourceInvoice[field] || "";
    });
    setLodgeFormState((prevState) => ({
      ...prevState,
      invoiceList: updatedInvoices,
    }));
  };

  const handleFileChange = (e, invoiceIndex, docType) => {
    const files = Array.from(e.target.files);
    const fileObjects = files.map((file) => ({ name: file.name }));
    setLodgeFormState((prevState) => {
      const updatedInvoices = [...prevState.invoiceList];
      const currentFiles = updatedInvoices[invoiceIndex][docType] || [];
      const newFilesToAdd = fileObjects.filter(
        (fo) => !currentFiles.some((cf) => cf.name === fo.name),
      );
      updatedInvoices[invoiceIndex][docType] = [
        ...currentFiles,
        ...newFilesToAdd,
      ];
      return { ...prevState, invoiceList: updatedInvoices };
    });
    e.target.value = null;
  };

  const handleViewFile = (fileName) => {
    alert(`Simulating view of: ${fileName}`);
  };

  const handleLodgeSubmit = () => {
    setLodgeModalOpen(false);
    setRemittanceStep(1);
    setRemittanceChoice("");
    setRemittanceModalOpen(true);
  };

  const handleRemittanceChoice = (choice) => {
    if (choice === "No Advance") {
      handleRemittanceSubmit(choice, null);
    } else {
      setRemittanceChoice(choice);
      setRemittanceStep(2);
    }
  };

  const handleRemittanceSubmit = (remittanceOption, mappingOption) => {
    const billIndex = allBills.findIndex(
      (b) => b.shippingBillNo === currentBill.shippingBillNo,
    );
    if (billIndex === -1) return; // Should not happen

    const updatedBill = {
      ...lodgeFormState,
      remittanceStatus: remittanceOption,
      remittanceMapping: mappingOption,
      lodgementno: `LODG${Math.floor(Math.random() * 90000) + 10000}`,
      lodgementdate: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
    };

    // Update the bill within the allBills state
    const newAllBills = [...allBills];
    newAllBills[billIndex] = updatedBill;
    setAllBills(newAllBills);

    setUpdateMessage(
      `Success! Bill ${currentBill.shippingBillNo} details updated and lodged.`,
    );
    setRemittanceModalOpen(false);
    setCurrentBill(null); // Clear current bill after processing
  };

  const handleDoubleClick = (bill) => {
    // Allow double click for any bill now
    setCurrentBill(bill);
    setActiveDetailTab("Custom Invoice Details");
    setActiveCustomInvoiceSubTab(0);
    setActiveInvoiceIndexInModal(0); // Set active invoice index
    setPendingRemittances([]); // Clear pending remittances on open
    setIsDoubleClickModalOpen(true);
  };

  // New handler for Remittance table double click
  const handleRemittanceDoubleClick = (remGroup) => {
    setCurrentRemittance(remGroup);
    setActiveSettlementSubTab(0); // Default to first settlement tab
    setIsRemittanceDetailModalOpen(true);
  };

  // --- NEW: Handlers for Fetch Settled Remittances Flow ---

  // 1. Open the modal
  const handleOpenFetchSettledRemModal = () => {
    if (!currentBill) return;

    const activeInvoice = currentBill.invoiceList?.[activeInvoiceIndexInModal];
    if (!activeInvoice) return;

    // Get all IRM refs already linked to this *specific* invoice
    const linkedIrmRefs = new Set(
      activeInvoice.remittanceList?.flatMap(
        (rem) => rem.irmLines?.map((irm) => irm.irmRef) || [],
      ) || [],
    );

    // Find all available settled IRMs (from remittanceData)
    // Filter by customer and ensure they aren't already linked
    const availableIrms = remittanceData
      .filter((remGroup) => remGroup.buyerCode === currentBill.buyerCode) // Match customer
      .flatMap((remGroup) => remGroup.irmLines || []) // Get all IRM lines
      .filter((irm) => irm.irmRef && !linkedIrmRefs.has(irm.irmRef)) // Must have an IRM ref and not be linked
      .map((irm) => {
        // We need to calculate the *unutilized* amount of this IRM
        // This is complex. For now, we assume the irmUtilized is the full available amount.
        // A proper implementation would scan allBills to see how much is already linked elsewhere.
        // Let's use `irmUtilized` as the total available for now.
        return {
          ...irm,
          outstandingAmt: irm.irmUtilized, // Placeholder for available amount
        };
      });

    setAvailableSettledRemittances(availableIrms);
    setSelectedSettledRemittances({}); // Clear selection
    setIsFetchSettledRemModalOpen(true);
  };

  // 2. Handle selection change in the new modal
  const handleSettledRemSelectionChange = (irmRef) => {
    setSelectedSettledRemittances((prev) => ({
      ...prev,
      [irmRef]: !prev[irmRef],
    }));
  };

  // 3. Handle "Proceed" - move selected IRMs to pending state
  const handleProceedWithSettledRemittances = () => {
    const activeInvoice = currentBill.invoiceList?.[activeInvoiceIndexInModal];
    if (!activeInvoice) return;

    const summary = calculateInvoiceSummaryWithRemittances(activeInvoice);
    const invoiceOutstanding = summary.outstanding;
    const invoiceCurrency = activeInvoice.fobcurrencycode;

    const newPendingItems = availableSettledRemittances
      .filter((irm) => selectedSettledRemittances[irm.irmRef])
      .map((irm) => {
        const irmAvailable = irm.outstandingAmt; // The amount this IRM has
        // Prefill with outstanding, capped at IRM available
        const irmUtilized = Math.min(invoiceOutstanding, irmAvailable);
        const convRate = irm.currency === invoiceCurrency ? 1.0 : null;
        const invoiceRealized = convRate !== null ? irmUtilized * convRate : 0;

        // Calculate FB Charges: (Parent Charges * This IRM Utilized) / Parent Net
        // Ensure parentNet is not zero
        const parentNet = irm.parentNet > 0 ? irm.parentNet : 1;
        const fbCharges = (irm.parentCharges * irmUtilized) / parentNet;

        return {
          // This is a *pending* IRM line, not a full remittance group
          // We store all details needed for rendering and saving
          // We use irmRef as the unique key
          key: irm.irmRef,
          irmRef: irm.irmRef,
          irmDate: irm.irmDate,
          parentRemRef: irm.parentRemRef,
          parentRemDate: irm.parentRemDate,
          parentRemitterName: irm.parentRemitterName,
          parentBuyerCode: irm.parentBuyerCode,
          parentCharges: irm.parentCharges,
          parentNet: irm.parentNet,
          irmUtilized: irmUtilized, // Editable
          currency: irm.currency,
          convRate: convRate, // Editable
          invoiceRealized: invoiceRealized, // Calculated
          fbChargesRem: fbCharges, // Calculated
        };
      });

    setPendingRemittances((prev) => [...prev, ...newPendingItems]);
    setIsFetchSettledRemModalOpen(false);
    setSelectedSettledRemittances({});
  };

  // 4. Handle edits in the pending rows
  const handlePendingRemChange = (irmRef, field, value) => {
    setPendingRemittances((prev) =>
      prev.map((item) => {
        if (item.key === irmRef) {
          const updatedItem = { ...item };
          let numValue = parseFloat(value);
          if (value === "" || isNaN(numValue)) {
            numValue = field === "convRate" ? null : 0;
          }

          if (field === "irmUtilized") {
            updatedItem.irmUtilized = numValue;
          } else if (field === "convRate") {
            updatedItem.convRate = numValue;
          }

          // Recalculate
          if (updatedItem.convRate !== null) {
            updatedItem.invoiceRealized =
              updatedItem.irmUtilized * updatedItem.convRate;
          } else {
            updatedItem.invoiceRealized = 0;
          }

          const parentNet =
            updatedItem.parentNet > 0 ? updatedItem.parentNet : 1;
          updatedItem.fbChargesRem =
            (updatedItem.parentCharges * updatedItem.irmUtilized) / parentNet;

          return updatedItem;
        }
        return item;
      }),
    );
  };

  // 5. Save pending remittances to the main state (This is a complex merge)
  const handleSavePendingRemittances = () => {
    const activeInvoice = currentBill.invoiceList?.[activeInvoiceIndexInModal];
    if (!activeInvoice || pendingRemittances.length === 0) return;

    // Group pending items by their parent remittance (remRef)
    const pendingGroups = new Map();
    pendingRemittances.forEach((item) => {
      if (!pendingGroups.has(item.parentRemRef)) {
        pendingGroups.set(item.parentRemRef, []);
      }
      pendingGroups.get(item.parentRemRef).push({
        // This is the IRM line structure
        irmRef: item.irmRef,
        irmDate: item.irmDate,
        purposeCode: item.purposeCode, // Need to add this
        purposeDesc: item.purposeDesc, // Need to add this
        irmUtilized: item.irmUtilized,
        currency: item.currency,
        convRate: item.convRate,
        invRealized: item.invoiceRealized,
        fbChargesRem: item.fbChargesRem,
      });
    });

    // Find the bill in allBills
    const billIndex = allBills.findIndex(
      (b) => b.shippingBillNo === currentBill.shippingBillNo,
    );
    if (billIndex === -1) return;

    // Create a deep copy to mutate
    const newAllBills = [...allBills];
    const billToUpdate = { ...newAllBills[billIndex] };
    billToUpdate.invoiceList = [...billToUpdate.invoiceList];
    const invoiceToUpdate = {
      ...billToUpdate.invoiceList[activeInvoiceIndexInModal],
    };
    // Ensure remittanceList is a copy
    invoiceToUpdate.remittanceList = [
      ...(invoiceToUpdate.remittanceList || []),
    ];

    // Merge pending IRMs into the invoice's remittanceList
    pendingGroups.forEach((newIrmLines, remRef) => {
      const remGroupIndex = invoiceToUpdate.remittanceList.findIndex(
        (r) => r.remRef === remRef,
      );

      if (remGroupIndex !== -1) {
        // Remittance group already exists, merge IRM lines
        const remGroupToUpdate = {
          ...invoiceToUpdate.remittanceList[remGroupIndex],
        };
        remGroupToUpdate.irmLines = [
          ...(remGroupToUpdate.irmLines || []),
          ...newIrmLines,
        ];
        invoiceToUpdate.remittanceList[remGroupIndex] = remGroupToUpdate;
      } else {
        // New remittance group for this invoice, find parent details
        const parentRem = remittanceData.find((r) => r.remRef === remRef);
        if (parentRem) {
          invoiceToUpdate.remittanceList.push({
            // Copy parent rem details
            remRef: parentRem.remRef,
            remDate: parentRem.remDate,
            net: parentRem.net,
            instructed: parentRem.instructed,
            charges: parentRem.charges,
            senderRefNo: parentRem.senderRefNo,
            senderRefDate: parentRem.senderRefDate,
            remitterName: parentRem.remitterName,
            beneficiaryNameSwift: parentRem.beneficiaryNameSwift,
            remitterRemarks: parentRem.remitterRemarks,
            detailsOfCharges: parentRem.detailsOfCharges,
            beneficiaryBankId: parentRem.beneficiaryBankId,
            // Add the new IRM lines
            irmLines: newIrmLines,
          });
        }
      }
    });

    // Put the updated structures back
    billToUpdate.invoiceList[activeInvoiceIndexInModal] = invoiceToUpdate;
    newAllBills[billIndex] = billToUpdate;

    setAllBills(newAllBills); // Update global state
    setCurrentBill(billToUpdate); // Update modal state
    setPendingRemittances([]); // Clear pending
    setUpdateMessage("New remittances mapped successfully.");
  };

  // --- RENDER LOGIC ---

  // Calculate bank counts, ensuring default banks are included
  const bankCounts = useMemo(() => {
    const counts = allBills.reduce((acc, bill) => {
      const bankName = bill.bankName || "Unknown";
      acc[bankName] = (acc[bankName] || 0) + 1;
      return acc;
    }, {});
    // Ensure default banks exist, even if count is 0
    ["ICICI Bank", "Citi Bank", "HSBC"].forEach((bank) => {
      if (!counts[bank]) counts[bank] = 0;
    });
    counts["All"] = allBills.length;
    return counts;
  }, [allBills]);

  // Filter bills *only* by bank first
  const bankFilteredBills = useMemo(() => {
    return allBills.filter((bill) => {
      return bankFilter === "All" || bill.bankName === bankFilter;
    });
  }, [allBills, bankFilter]);

  // Calculate status counts based *only* on the bank-filtered list
  const displayedStatusCounts = useMemo(() => {
    const counts = bankFilteredBills.reduce((acc, bill) => {
      const statusText = getCombinedStatus(bill).primary.text;
      acc[statusText] = (acc[statusText] || 0) + 1;
      return acc;
    }, {});
    // Calculate the 'All' count as the sum of other statuses *within the filtered group*
    counts["All"] = Object.entries(counts).reduce(
      (sum, [key, value]) => (key === "All" ? sum : sum + value),
      0,
    );
    return counts;
  }, [bankFilteredBills]);

  // Filter bills for display based on filterStatus
  const billsToDisplay = useMemo(() => {
    if (filterStatus === "All") {
      return bankFilteredBills;
    }
    return bankFilteredBills.filter((bill) => {
      const statusMatch = getCombinedStatus(bill).primary.text === filterStatus;
      return statusMatch;
    });
  }, [bankFilteredBills, filterStatus]);

  const DetailItemLR = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-1 py-1">
      <p className="font-medium text-gray-500 text-xs uppercase tracking-wider col-span-1">
        {label}
      </p>
      <p className="text-gray-800 text-sm col-span-2">{value || "-"}</p>
    </div>
  );

  const ViewModeToggle = () => (
    <div className="flex items-center p-1 bg-gray-200 rounded-lg">
      <button
        onClick={() => setViewMode("invoice")}
        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === "invoice" ? "bg-white text-blue-600 shadow" : "text-gray-600"}`}
      >
        Invoice
      </button>
      <button
        onClick={() => setViewMode("shippingBill")}
        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === "shippingBill" ? "bg-white text-blue-600 shadow" : "text-gray-600"}`}
      >
        Shipping Bill
      </button>
    </div>
  );

  // --- DATA FETCHING ---
  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchBills = async () => {
      try {
        setIsLoading(true);

        // 👇 UPDATE THIS URL TO YOUR REAL API
        const response = await fetch("https://nijal2-1.onrender.com/api/shippingBills");

        if (!response.ok) throw new Error("Failed to fetch data");

        const jsonResponse = await response.json();

        // 1. Get the array from the "data" key
        const apiData = jsonResponse.data || [];

        // 2. No Renaming - Just add essential UI flags
        const rawBills = apiData.map((bill) => ({
          ...bill, // Keep all API keys exactly as they are (shippingbillno, invoices, etc.)

          // Add these two defaults so your Filters don't crash
          bankName: bill.bankname || "Unknown Bank",
          isManualUpload: false,

          // Ensure invoices array exists
          invoices: bill.invoices || [],
        }));

        setAllBills(rawBills);
      } catch (err) {
        console.error("Error fetching bills:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBills();
  }, []);

  // --- HANDLE ESCAPE KEY ---
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        // Check if modal is open, then close it
        if (isLodgeModalOpen) {
          setLodgeModalOpen(false);
        }
        // Optional: Add your other modals here too if you want them to close on Esc
        if (isListModalOpen) setListModalOpen(false);
        if (isDetailsModalOpen) setDetailsModalOpen(false);
        if (isRemittanceModalOpen) setRemittanceModalOpen(false);
        if (isDoubleClickModalOpen) setIsDoubleClickModalOpen(false);
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup listener on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLodgeModalOpen, isListModalOpen, isDetailsModalOpen, isRemittanceModalOpen, isDoubleClickModalOpen]);

  // --- PAGINATION LOGIC ---

  // --- PAGINATION STATE & LOGIC ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  // 1. Calculate the slice of data to show
  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return billsToDisplay.slice(start, end);
  }, [billsToDisplay, currentPage]);

  // 2. Calculate total pages
  const totalPages = Math.ceil(billsToDisplay.length / ITEMS_PER_PAGE);

  // 3. Handle Page Change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // 4. Reset to Page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, bankFilter, allBills]);

  return (
    <div className="flex bg-gray-100">
      {/* Sidebar Component */}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* 2. Show Loading Spinner */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="mb-6 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  All Shipping Bills
                </h1>
                <ViewModeToggle />
              </div>
              <div className="flex flex-wrap justify-end gap-4">
                {bankFilter === "ICICI Bank" && (
                  <>
                    <button
                      onClick={() => setListModalOpen(true)}
                      className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700"
                    >
                      Fetch SB List
                    </button>
                    <button
                      onClick={handleOpenDetailsModal}
                      className="bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-gray-800"
                    >
                      Fetch SB Details
                    </button>
                  </>
                )}
              </div>
            </header>

            {updateMessage && (
              <div
                className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6"
                role="alert"
              >
                <span className="block sm:inline">{updateMessage}</span>
              </div>
            )}

            <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 items-center">
              {/* Bank Filter Dropdown */}
              <div>
                <label
                  htmlFor="bankFilter"
                  className="text-sm font-medium text-gray-700 mr-2"
                >
                  Bank:
                </label>
                <select
                  id="bankFilter"
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                  className="py-2 pl-3 pr-8 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {/* Sort: All first, then alphabetically */}
                  {Object.entries(bankCounts)
                    .sort(([bankA], [bankB]) => {
                      if (bankA === "All") return -1;
                      if (bankB === "All") return 1;
                      return bankA.localeCompare(bankB);
                    })
                    .map(([bankName, count]) => (
                      <option key={bankName} value={bankName}>
                        {bankName} ({count})
                      </option>
                    ))}
                </select>
              </div>
              {/* Status Filter Buttons - Updated Count Logic */}
              {/* Status Filter Buttons */}
              <div className="flex flex-wrap gap-2 border-l pl-4">
                {[
                  "All",
                  "Outstanding",
                  "Lodged",
                  "Part Realized",
                  "Realized",
                ].map((status) => {
                  const count = displayedStatusCounts[status] || 0;

                  // 1. Get color config for this status (fallback to gray if missing)
                  const colorConfig =
                    SB_STATUS_COLORS[status] || SB_STATUS_COLORS["All"];

                  // 2. Check if active
                  const isActive = filterStatus === status;

                  return (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 border 
          ${
            isActive
              ? colorConfig.buttonActive
              : `${colorConfig.buttonInactive} border-transparent` // Add transparency to inactive border if needed
          }`}
                    >
                      {status} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-700">
                  {/* --- TABLE HEADER --- */}
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-3 font-medium">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 font-medium">
                        Shipping Bill
                      </th>
                      <th scope="col" className="px-6 py-3 font-medium">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 font-medium">
                        Lodgement No
                      </th>
                      <th scope="col" className="px-6 py-3 font-medium">
                        Invoice No.
                      </th>
                      <th scope="col" className="px-6 py-3 font-medium">
                        FOB Value
                      </th>
                      <th scope="col" className="px-6 py-3 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  {/* --- TABLE BODY --- */}
                  <tbody className="divide-y divide-gray-200">
                    {allBills.length > 0 ? (
                      // === VIEW MODE 1: INVOICE VIEW ===
                      viewMode === "invoice" ? (
                        paginatedBills.flatMap((bill, billIndex) => {
                          // 1. Skip Manual Uploads in this view
                          if (bill.isManualUpload) return [];

                          // 2. Prepare Data
                          const invoices =
                            bill.invoices && bill.invoices.length > 0
                              ? bill.invoices
                              : [{}];

                          const billStatusInfo = getCombinedStatus(bill);

                          // 3. Render Invoice Rows
                          return invoices.map((invoice, invoiceIndex) => {
                            let rowStatus = billStatusInfo;

                            // Calculate Status Logic
                            if (bill.lodgementno) {
                              const invSummary =
                                calculateInvoiceSummaryWithRemittances(invoice);
                              let primaryText = "Lodged";
                              let primaryClass =
                                "bg-indigo-100 text-indigo-800";

                              if (
                                invSummary.outstanding <= 0 &&
                                invSummary.value > 0
                              ) {
                                primaryText = "Realized";
                                primaryClass = "bg-green-100 text-green-800";
                              } else if (
                                invSummary.outstanding < invSummary.value
                              ) {
                                primaryText = "Part Realized";
                                primaryClass = "bg-yellow-100 text-yellow-800";
                              }

                              rowStatus = {
                                primary: {
                                  text: primaryText,
                                  className: primaryClass,
                                },
                                secondary: billStatusInfo.secondary,
                              };
                            }

                            // 4. Return The Row
                            return (
                              <tr
                                key={`all-invoice-${bill.shippingBillNo}-${invoice.invoiceno || invoiceIndex}-${billIndex}`}
                                onDoubleClick={() => handleDoubleClick(bill)}
                                className="hover:bg-gray-50 cursor-pointer"
                              >
                                {/* --- GROUPED COLUMNS (Only render for first invoice) --- */}
                                {invoiceIndex === 0 ? (
                                  <>
                                    {/* Status Column */}
                                    <td
                                      rowSpan={invoices.length}
                                      className="px-6 py-4 align-top"
                                    >
                                      <span
                                        className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${rowStatus.primary.className}`}
                                      >
                                        {rowStatus.primary.text}
                                      </span>
                                      {rowStatus.secondary.text && (
                                        <div
                                          className={`text-xs mt-1 ${rowStatus.secondary.className}`}
                                        >
                                          {rowStatus.secondary.text}
                                        </div>
                                      )}
                                    </td>

                                    {/* Shipping Bill Column */}
                                    <td
                                      rowSpan={invoices.length}
                                      className="px-6 py-4 font-medium text-gray-900 align-top"
                                    >
                                      <div>{bill.shippingbillno}</div>
                                      <div className="text-xs text-gray-500">
                                        {bill.shippingbilldate ||
                                          bill.shippingdate}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Due: {bill.duedate}
                                      </div>
                                    </td>

                                    {/* Customer Column */}
                                    <td
                                      rowSpan={invoices.length}
                                      className="px-6 py-4 align-top"
                                    >
                                      <div className="font-semibold text-gray-900">
                                        {bill.consigneename || "-"}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {bill.buyercode || "-"}
                                      </div>
                                    </td>

                                    {/* Lodgement Column */}
                                    <td
                                      rowSpan={invoices.length}
                                      className="px-6 py-4 align-top"
                                    >
                                      <div className="font-semibold text-gray-900">
                                        {bill.lodgementno || "-"}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {bill.lodgementdate || ""}
                                      </div>
                                    </td>
                                  </>
                                ) : null}

                                {/* --- INDIVIDUAL INVOICE COLUMNS --- */}

                                {/* Invoice No */}
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-gray-900">
                                    {invoice.invoiceno}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {invoice.invoicedate}
                                  </div>
                                </td>

                                {/* Value */}
                                <td className="px-6 py-4 font-semibold text-gray-900">
                                  {formatCurrency(
                                    invoice.amount,
                                    invoice.fobcurrencycode,
                                  )}
                                </td>

                                {/* --- ACTION COLUMN (Only render for first invoice) --- */}
                                {invoiceIndex === 0 ? (
                                  <td
                                    rowSpan={invoices.length}
                                    className="px-6 py-4 align-top"
                                  >
                                    {!bill.lodgementno ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenLodgeModal(bill);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 font-semibold"
                                      >
                                        Lodge or regularize
                                      </button>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                ) : null}
                              </tr>
                            );
                          });
                        })
                      ) : (
                        // === VIEW MODE 2: SHIPPING BILL VIEW ===
                        paginatedBills.map((bill, billIndex) => {
                          // 1. Skip Manual Uploads
                          if (bill.isManualUpload) return null;

                          // 2. Calculate Totals & Status
                          const statusInfo = getCombinedStatus(bill);
                          const hasMultipleInvoices =
                            bill.invoices && bill.invoices.length > 1;
                          const singleInvoice =
                            (bill.invoices && bill.invoices[0]) || {};

                          const totalFob = hasMultipleInvoices
                            ? bill.invoices.reduce(
                                (sum, inv) =>
                                  sum + parseFloat(inv.exportbillvalue || 0),
                                0,
                              )
                            : parseFloat(singleInvoice.exportbillvalue || 0);

                          // 3. Return The Row
                          return (
                            <tr
                              key={`all-bill-view-${bill.shippingBillNo}-${billIndex}`}
                              onDoubleClick={() => handleDoubleClick(bill)}
                              className="hover:bg-gray-50 cursor-pointer"
                            >
                              {/* Status */}
                              <td className="px-6 py-4 align-top">
                                <span
                                  className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.primary.className}`}
                                >
                                  {statusInfo.primary.text}
                                </span>
                                {statusInfo.secondary.text && (
                                  <div
                                    className={`text-xs mt-1 ${statusInfo.secondary.className}`}
                                  >
                                    {statusInfo.secondary.text}
                                  </div>
                                )}
                              </td>

                              {/* SB Details */}
                              <td className="px-6 py-4 font-medium text-gray-900">
                                <div>{bill.shippingbillno}</div>
                                <div className="text-xs text-gray-500">
                                  {bill.shippingbilldate || bill.shippingDate}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Due: {bill.duedate}
                                </div>
                              </td>

                              {/* Customer */}
                              <td className="px-6 py-4 align-top">
                                <div className="font-semibold text-gray-900">
                                  {bill.consigneename || "-"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {bill.buyercode || "-"}
                                </div>
                              </td>

                              {/* Lodgement */}
                              <td className="px-6 py-4 align-top">
                                <div className="font-semibold text-gray-900">
                                  {bill.lodgementno || "-"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {bill.lodgementdate || ""}
                                </div>
                              </td>

                              {/* Invoice Summary */}
                              <td className="px-6 py-4">
                                {hasMultipleInvoices ? (
                                  <div className="font-semibold">
                                    {bill.invoices.length} Invoices
                                  </div>
                                ) : (
                                  <>
                                    <div className="font-semibold text-gray-900">
                                      {singleInvoice.invoiceno}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {singleInvoice.invoicedate}
                                    </div>
                                  </>
                                )}
                              </td>

                              {/* Value */}
                              <td className="px-6 py-4 font-semibold text-gray-900">
                                {formatCurrency(
                                  totalFob,
                                  singleInvoice.fobcurrencycode,
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4">
                                {!bill.lodgementno ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenLodgeModal(bill);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-semibold"
                                  >
                                    Lodge or regularize
                                  </button>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )
                    ) : (
                      // === EMPTY STATE ===
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center p-10 text-gray-500"
                        >
                          No shipping bills found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* --- PAGINATION UI --- */}
                {billsToDisplay.length > 0 && (
                  <div className="flex items-center justify-end gap-2 py-4 px-3 bg-white border-t">
                    {/* Prev Button */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border border-gray-200
        ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white hover:bg-gray-50 text-gray-700"}
      `}
                    >
                      Prev
                    </button>

                    {/* Page Numbers */}
                    {/* Note: If you have many pages, you might want to limit this array logic later */}
                    {[...Array(totalPages)].map((_, index) => {
                      const page = index + 1;
                      const isActive = currentPage === page;

                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition
            ${
              isActive
                ? "bg-gray-800 text-white shadow-md"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
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
                      className={`px-3 py-2 rounded-lg text-sm font-medium border border-gray-200
        ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white hover:bg-gray-50 text-gray-700"}
      `}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activePage === "remittances" && (
          <RemittancesTable
            data={remittanceData} // Pass the derived data
            formatCurrency={formatCurrency}
            onRowDoubleClick={handleRemittanceDoubleClick}
            allBills={allBills}
            // Citi Upload Props
            isUploadModalOpen={isUploadModalOpen}
            setIsUploadModalOpen={setIsUploadModalOpen}
            uploadDataInput={uploadDataInput}
            setUploadDataInput={setUploadDataInput}
            handleUploadSubmit={handleUploadSubmit}
            // ICICI Upload Props
            isICICIUploadModalOpen={isICICIUploadModalOpen}
            setIsICICIUploadModalOpen={setIsICICIUploadModalOpen}
            iciciUploadJsonInput={iciciUploadJsonInput}
            setIciciUploadJsonInput={setIciciUploadJsonInput}
            handleICICIUploadSubmit={handleICICIUploadSubmit}
            // Settle Modal Prop
            onOpenSettleModal={handleOpenSettleModal}
          />
        )}
      </div>

      {/* MODALS */}
      {isListModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto border w-full max-w-2xl shadow-lg rounded-xl bg-white">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900">
                Provide Shipping Bill JSON (ICICI Bank)
              </h3>
              <div className="mt-2">
                <textarea
                  value={listJsonInput}
                  onChange={(e) => setListJsonInput(e.target.value)}
                  className="w-full h-64 p-3 border rounded-lg"
                  placeholder="Paste JSON..."
                ></textarea>
              </div>
              <div className="mt-4 flex justify-end gap-4">
                <button
                  onClick={() => setListModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFetchListSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto border w-full max-w-3xl shadow-lg rounded-xl bg-white">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 text-center mb-4">
                Fetch SB Details (ICICI Bank)
              </h3>
              <div className="mb-4">
                <label className="font-semibold block mb-2">
                  Request (Auto-generated for ICICI Bank)
                </label>
                <pre className="bg-gray-100 p-3 rounded-lg text-sm whitespace-pre-wrap break-all">
                  <code>{detailsJsonRequest}</code>
                </pre>
              </div>
              <div>
                <label htmlFor="res-json" className="font-semibold block mb-2">
                  Paste JSON Response
                </label>
                <textarea
                  value={detailsJsonResponseInput}
                  onChange={(e) => setDetailsJsonResponseInput(e.target.value)}
                  id="res-json"
                  className="w-full h-48 p-3 border rounded-lg"
                  placeholder="Paste JSON..."
                ></textarea>
              </div>
              <div className="mt-4 flex justify-center gap-4">
                <button
                  onClick={() => setDetailsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFetchDetailsSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isLodgeModalOpen && lodgeFormState && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-20 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Lodge/Regularize SB: {lodgeFormState.shippingBillNo}
              </h3>
              <div className="p-4 border rounded-lg bg-gray-50 mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">
                  Shipping Bill Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-2">
                    <div>
                      <label className="block font-medium">Buyer Code</label>
                      <input
                        type="text"
                        name="buyerCode"
                        value={lodgeFormState.buyerCode || ""}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-medium">Buyer Name</label>
                      <input
                        type="text"
                        name="buyerName"
                        value={lodgeFormState.buyerName}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-medium">Buyer Address</label>
                      <input
                        type="text"
                        name="buyerAddress"
                        value={lodgeFormState.buyerAddress}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-medium">
                        Buyer Country Code
                      </label>
                      <input
                        type="text"
                        name="buyerCountryCode"
                        value={lodgeFormState.buyerCountryCode}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                  </div>
                  <div className="col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-2">
                    <div className="md:col-span-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isConsigneeSame"
                        checked={lodgeFormState.isConsigneeSame}
                        onChange={handleLodgeFormChange}
                        className="rounded"
                        id="consigneeCheck"
                      />
                      <label htmlFor="consigneeCheck">
                        Consignee same as buyer
                      </label>
                    </div>
                    <div>
                      <label className="block font-medium">
                        Consignee Name
                      </label>
                      <input
                        type="text"
                        name="consigneeName"
                        value={lodgeFormState.consigneeName}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-medium">
                        Consignee Address
                      </label>
                      <input
                        type="text"
                        name="consigneeAddress"
                        value={lodgeFormState.consigneeAddress}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-medium">
                        Consignee Country Code
                      </label>
                      <input
                        type="text"
                        name="consigneeCountryCode"
                        value={lodgeFormState.consigneeCountryCode}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                  </div>
                  <div className="col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4 mt-2">
                    <div>
                      <label className="block font-medium">
                        Origin of Goods
                      </label>
                      <input
                        type="text"
                        name="originOfGoods"
                        value={lodgeFormState.originOfGoods}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-medium">
                        State of Origin
                      </label>
                      <input
                        type="text"
                        name="stateOfOrigin"
                        value={lodgeFormState.stateOfOrigin || ""}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-medium">
                        Port of Loading
                      </label>
                      <input
                        type="text"
                        name="portOfLoading"
                        value={lodgeFormState.portOfLoading || ""}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-medium">
                        Port of Discharge
                      </label>
                      <input
                        type="text"
                        name="portOfDischarge"
                        value={lodgeFormState.portOfDischarge || ""}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-medium">
                        Country of Discharge
                      </label>
                      <input
                        type="text"
                        name="countryOfDischarge"
                        value={lodgeFormState.countryOfDischarge || ""}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                  </div>
                  <div className="col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-2">
                    <div>
                      <label className="block font-medium">
                        Port of Final Destination
                      </label>
                      <input
                        type="text"
                        name="portOfFinalDestination"
                        value={lodgeFormState.portOfFinalDestination || ""}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-medium">
                        Country of Final Destination
                      </label>
                      <input
                        type="text"
                        name="countryOfFinalDestination"
                        value={lodgeFormState.countryOfFinalDestination || ""}
                        onChange={handleLodgeFormChange}
                        className="mt-1 p-2 w-full border rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">
                  Invoice Details
                </h4>
                <div className="border-b">
                  <nav className="-mb-px flex space-x-4">
                    {(lodgeFormState.invoiceList || []).map((inv, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveInvoiceTab(index)}
                        className={`${activeInvoiceTab === index ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500"} py-2 px-3 border-b-2 font-medium text-sm`}
                      >
                        Invoice {index + 1}
                      </button>
                    ))}
                  </nav>
                </div>
                <div className="p-4 border border-t-0 rounded-b-lg">
                  {(lodgeFormState.invoiceList || []).map((inv, index) => (
                    <div
                      key={index}
                      className={
                        activeInvoiceTab === index ? "block" : "hidden"
                      }
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-500">
                            Invoice No.
                          </p>
                          <p>{inv.invoiceno}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-500">
                            Invoice Date
                          </p>
                          <p>{inv.invoicedate}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-500">FOB Value</p>
                          <p>
                            {inv.fobcurrencycode} {inv.exportbillvalue}
                          </p>
                        </div>
                        <div>
                          <label className="block font-medium">Tenor</label>
                          <input
                            type="text"
                            name="tenorasperInvoice"
                            value={inv.tenorasperInvoice || ""}
                            onChange={(e) => handleInvoiceFormChange(index, e)}
                            className="mt-1 p-2 w-full border rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block font-medium">Commodity</label>
                          <input
                            type="text"
                            name="commodityDescription"
                            value={inv.commodityDescription || ""}
                            onChange={(e) => handleInvoiceFormChange(index, e)}
                            className="mt-1 p-2 w-full border rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block font-medium">
                            Shipping Co.
                          </label>
                          <input
                            type="text"
                            name="shippingCompanyName"
                            value={inv.shippingCompanyName || ""}
                            onChange={(e) => handleInvoiceFormChange(index, e)}
                            className="mt-1 p-2 w-full border rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block font-medium">
                            BL/AWB No.
                          </label>
                          <input
                            type="text"
                            name="blAWBLRRRNo"
                            value={inv.blAWBLRRRNo || ""}
                            onChange={(e) => handleInvoiceFormChange(index, e)}
                            className="mt-1 p-2 w-full border rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block font-medium">
                            Vessel Name
                          </label>
                          <input
                            type="text"
                            name="vesselName"
                            value={inv.vesselName || ""}
                            onChange={(e) => handleInvoiceFormChange(index, e)}
                            className="mt-1 p-2 w-full border rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block font-medium">BL Date</label>
                          <DatePicker
                            selectedDate={inv.blDate}
                            onChange={(date) =>
                              handleInvoiceFormChange(index, {
                                target: { name: "blDate", value: date },
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block font-medium">
                            Comm. Inv. No.
                          </label>
                          <input
                            type="text"
                            name="commercialinvoiceno"
                            value={inv.commercialinvoiceno || ""}
                            onChange={(e) => handleInvoiceFormChange(index, e)}
                            className="mt-1 p-2 w-full border rounded-md"
                          />
                        </div>
                        <div className="col-span-3 grid grid-cols-2 gap-4 pt-4 border-t">
                          <DocumentUploader
                            docType="invoiceDocuments"
                            invoiceIndex={index}
                            onFileChange={handleFileChange}
                            files={inv.invoiceDocuments || []}
                            label="Invoice Documents"
                            onViewFile={handleViewFile}
                          />
                          <DocumentUploader
                            docType="blDocuments"
                            invoiceIndex={index}
                            onFileChange={handleFileChange}
                            files={inv.blDocuments || []}
                            label="BL Documents"
                            onViewFile={handleViewFile}
                          />
                        </div>
                      </div>
                      {index > 0 && (
                        <button
                          onClick={() => handlePrefillInvoice(index)}
                          className="mt-4 text-sm text-blue-600 hover:underline"
                        >
                          Pre-fill from Invoice 1
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setLodgeModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLodgeSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isRemittanceModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center">
          <div className="relative p-6 border w-full max-w-md shadow-lg rounded-xl bg-white">
            <h3 className="text-lg font-medium">Advance Remittances</h3>
            <p className="mt-2 text-sm text-gray-600">
              Any advance remittances against shipping bill?
            </p>
            {remittanceStep === 1 ? (
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => handleRemittanceChoice("Full Advance")}
                  className="w-full text-left p-3 bg-gray-100 hover:bg-blue-100 rounded-lg"
                >
                  Full Advance
                </button>
                <button
                  onClick={() => handleRemittanceChoice("Part Advance")}
                  className="w-full text-left p-3 bg-gray-100 hover:bg-blue-100 rounded-lg"
                >
                  Part Advance
                </button>
                <button
                  onClick={() => handleRemittanceChoice("No Advance")}
                  className="w-full text-left p-3 bg-gray-100 hover:bg-blue-100 rounded-lg"
                >
                  No Advance
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <button
                  onClick={() =>
                    handleRemittanceSubmit(remittanceChoice, "Map now")
                  }
                  className="w-full text-left p-3 bg-gray-100 hover:bg-blue-100 rounded-lg"
                >
                  Map remittances now
                </button>
                <button
                  onClick={() =>
                    handleRemittanceSubmit(remittanceChoice, "Map later")
                  }
                  className="w-full text-left p-3 bg-gray-100 hover:bg-blue-100 rounded-lg"
                >
                  Map later
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Double Click Modal */}
      {isDoubleClickModalOpen && currentBill && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto border w-full max-w-6xl shadow-lg rounded-xl bg-white">
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsDoubleClickModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
              <h3 className="text-xl leading-6 font-bold text-gray-900 mb-6">
                Shipping Bill Details: {currentBill.shippingBillNo}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
                <div className="p-4 border rounded-lg bg-gray-50 md:col-span-2">
                  <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">
                    Party Details
                  </h4>
                  <div className="space-y-1">
                    <DetailItemLR
                      label="Buyer Code"
                      value={currentBill.buyerCode}
                    />
                    <DetailItemLR
                      label="Buyer Name"
                      value={currentBill.buyerName}
                    />
                    <DetailItemLR
                      label="Buyer Address"
                      value={currentBill.buyerAddress}
                    />
                    <DetailItemLR
                      label="Buyer Country"
                      value={currentBill.buyerCountryCode}
                    />
                    <hr className="my-1" />
                    <DetailItemLR
                      label="Consignee Name"
                      value={currentBill.consigneeName}
                    />
                    <DetailItemLR
                      label="Consignee Address"
                      value={currentBill.consigneeAddress}
                    />
                    <DetailItemLR
                      label="Consignee Country"
                      value={currentBill.consigneeCountryCode}
                    />
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-gray-50 md:col-span-3">
                  <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">
                    Shipping Bill Info
                  </h4>
                  <div className="space-y-1">
                    <DetailItemLR
                      label="SB No."
                      value={currentBill.shippingBillNo}
                    />
                    <DetailItemLR
                      label="SB Date"
                      value={
                        currentBill.shippingBillDate || currentBill.shippingDate
                      }
                    />
                    <DetailItemLR
                      label="Port Code"
                      value={currentBill.portCode}
                    />
                    <DetailItemLR label="IE Code" value={currentBill.ieCode} />
                    <DetailItemLR
                      label="Due Date"
                      value={currentBill.dueDate}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gray-50 mb-6">
                <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">
                  Bank Details
                </h4>
                <div className="space-y-1 grid grid-cols-1 md:grid-cols-3 gap-x-6">
                  <DetailItemLR
                    label="Bank Name"
                    value={currentBill.bankName}
                  />
                  <DetailItemLR label="AD Code" value={currentBill.adCode} />
                  <DetailItemLR
                    label="IFSC Code"
                    value={currentBill.ifscCode}
                  />
                </div>
              </div>

              <div>
                <div className="border-b border-gray-200">
                  <nav
                    className="-mb-px flex space-x-6 overflow-x-auto"
                    aria-label="Detail Tabs"
                  >
                    {[
                      "PO Details",
                      "SO Details",
                      "Pre-shipment Details",
                      "Commercial Invoice Details",
                      "Logistics",
                      "Custom Invoice Details",
                    ].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveDetailTab(tab)}
                        className={`${activeDetailTab === tab ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                      >
                        {tab}
                      </button>
                    ))}
                  </nav>
                </div>
                <div className="mt-4 p-4 border rounded-b-lg min-h-[200px]">
                  {activeDetailTab === "PO Details" && (
                    <GenericDetailTable
                      title="PO Details"
                      data={currentBill.poDetails}
                      fields={[
                        "poNumber",
                        "poDate",
                        "poCurrency",
                        "poAmount",
                        "poAvailable",
                      ]}
                      remarks={currentBill.poRemarks}
                    />
                  )}
                  {activeDetailTab === "SO Details" && (
                    <GenericDetailTable
                      title="SO Details"
                      data={currentBill.soDetails}
                      fields={["soNumber", "soDate", "soCurrency", "soAmount"]}
                      remarks={currentBill.soRemarks}
                    />
                  )}
                  {activeDetailTab === "Pre-shipment Details" && (
                    <GenericDetailTable
                      title="Pre-shipment Details"
                      data={currentBill.preShipmentDetails}
                      fields={["docType", "docRef", "docDate"]}
                      remarks={currentBill.preShipmentRemarks}
                    />
                  )}
                  {activeDetailTab === "Commercial Invoice Details" && (
                    <div>
                      <GenericDetailTable
                        title="Commercial Invoice Details"
                        data={currentBill.commercialInvoiceDetails}
                        fields={["ciNumber", "ciDate", "ciValue"]}
                        remarks={currentBill.ciRemarks}
                      />
                      {/* New Payment Terms Section */}
                      <div className="mt-6">
                        <h6 className="font-semibold text-sm mb-2">
                          Payment Terms
                        </h6>
                        <div className="p-4 border rounded-lg bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-6">
                            <DetailItemLR label="Advance Amount" value="-" />
                            <DetailItemLR
                              label="Advance Percentage"
                              value="-"
                            />
                            <DetailItemLR
                              label="Advance Payment Terms"
                              value="-"
                            />
                            <DetailItemLR label="Spot Amount" value="-" />
                            <DetailItemLR label="Spot Percentage" value="-" />
                            <DetailItemLR
                              label="Spot Payment Terms"
                              value="-"
                            />
                            <DetailItemLR
                              label="Post Shipment Amount"
                              value="-"
                            />
                            <DetailItemLR
                              label="Post Shipment Percentage"
                              value="-"
                            />
                            <DetailItemLR
                              label="Post Shipment Payment Terms"
                              value="-"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* New Logistics Tab Content */}
                  {activeDetailTab === "Logistics" && (
                    <div>
                      {/* Shipment Details Section */}
                      <div className="p-4 border rounded-lg bg-gray-50 mb-6">
                        <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">
                          Shipment Details
                        </h4>
                        <div className="space-y-1 grid grid-cols-1 md:grid-cols-2 gap-x-6">
                          <DetailItemLR
                            label="Origin of Goods"
                            value={currentBill.originOfGoods}
                          />
                          <DetailItemLR
                            label="State of Origin"
                            value={currentBill.stateOfOrigin}
                          />
                          <DetailItemLR
                            label="Port of Loading"
                            value={currentBill.portOfLoading}
                          />
                          <DetailItemLR
                            label="Port of Discharge"
                            value={currentBill.portOfDischarge}
                          />
                          <DetailItemLR
                            label="Country of Discharge"
                            value={currentBill.countryOfDischarge}
                          />
                          <DetailItemLR
                            label="Port of Final Dest."
                            value={currentBill.portOfFinalDestination}
                          />
                          <DetailItemLR
                            label="Country of Final Dest."
                            value={currentBill.countryOfFinalDestination}
                          />
                        </div>
                      </div>

                      {/* BL Details Section */}
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">
                          BL Details
                        </h4>
                        <p className="text-xs text-gray-500 mb-3">
                          {currentBill?.invoiceList?.length > 1
                            ? "Showing details from first invoice. Details may vary for other invoices."
                            : currentBill?.invoiceList?.length === 1
                              ? "Showing details from invoice."
                              : "No invoice data available."}
                        </p>
                        <div className="space-y-1 grid grid-cols-1 md:grid-cols-2 gap-x-6">
                          <DetailItemLR
                            label="Shipping Company"
                            value={
                              currentBill?.invoiceList?.[0]?.shippingCompanyName
                            }
                          />
                          <DetailItemLR
                            label="BL/AWB No."
                            value={currentBill?.invoiceList?.[0]?.blAWBLRRRNo}
                          />
                          <DetailItemLR
                            label="Vessel Name"
                            value={currentBill?.invoiceList?.[0]?.vesselName}
                          />
                          <DetailItemLR
                            label="BL Date"
                            value={currentBill?.invoiceList?.[0]?.blDate}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === "Custom Invoice Details" && (
                    <div>
                      <div className="border-b border-gray-200 mb-4">
                        <nav className="-mb-px flex space-x-4 overflow-x-auto">
                          {(currentBill.invoiceList || []).map((inv, index) => (
                            <button
                              key={`inv-subtab-${index}`}
                              onClick={() => {
                                setActiveCustomInvoiceSubTab(index);
                                setActiveInvoiceIndexInModal(index); // NEW: Sync state
                                setPendingRemittances([]); // Clear pending when switching tabs
                              }}
                              className={`${activeCustomInvoiceSubTab === index ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-600"} whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-xs`}
                            >
                              Invoice {index + 1} ({inv.invoiceno})
                            </button>
                          ))}
                        </nav>
                      </div>

                      {(currentBill.invoiceList || []).map((inv, index) => {
                        if (index !== activeCustomInvoiceSubTab) return null;

                        const summary =
                          calculateInvoiceSummaryWithRemittances(inv);
                        const totalOutstandingForMapping = (
                          currentBill.invoiceList || []
                        ).reduce((sum, currentInv, idx) => {
                          const invSummary =
                            calculateInvoiceSummaryWithRemittances(currentInv);
                          let pendingUtilized = 0;
                          // If this is the active invoice, subtract pending remittances too
                          if (idx === activeCustomInvoiceSubTab) {
                            pendingUtilized = pendingRemittances.reduce(
                              (s, p) => s + p.irmUtilized,
                              0,
                            );
                          }
                          return (
                            sum + (invSummary.outstanding - pendingUtilized)
                          );
                        }, 0);

                        const firstInvoiceCurrency =
                          currentBill?.invoiceList?.[0]?.fobcurrencycode || "";

                        // --- Calculate Totals ---
                        const existingRemTotals = (inv.remittanceList || [])
                          .flatMap((rem) => rem.irmLines)
                          .reduce(
                            (acc, irm) => {
                              acc.irmUtilized += irm.irmUtilized || 0;
                              acc.invRealized += irm.invRealized || 0;
                              acc.fbChargesRem += irm.fbChargesRem || 0;
                              return acc;
                            },
                            { irmUtilized: 0, invRealized: 0, fbChargesRem: 0 },
                          );

                        const pendingRemTotals = pendingRemittances.reduce(
                          (acc, item) => {
                            acc.irmUtilized += item.irmUtilized || 0;
                            acc.invRealized += item.invRealized || 0;
                            acc.fbChargesRem += item.fbChargesRem || 0;
                            return acc;
                          },
                          { irmUtilized: 0, invRealized: 0, fbChargesRem: 0 },
                        );

                        return (
                          <div key={`inv-content-${index}`}>
                            <h5 className="font-semibold mb-3 text-base">
                              Invoice Summary
                            </h5>
                            <div className="overflow-x-auto mb-6 border rounded-lg">
                              <table className="min-w-full text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left font-medium">
                                      Invoice
                                    </th>
                                    <th className="px-4 py-2 text-right font-medium">
                                      Value
                                    </th>
                                    <th className="px-4 py-2 text-right font-medium">
                                      Realized
                                    </th>
                                    <th className="px-4 py-2 text-right font-medium">
                                      FB Charges
                                    </th>
                                    <th className="px-4 py-2 text-right font-medium">
                                      Reduction
                                    </th>
                                    <th className="px-4 py-2 text-right font-medium text-red-600">
                                      Outstanding
                                    </th>
                                    <th className="px-4 py-2 text-center font-medium">
                                      Status
                                    </th>
                                    <th className="px-4 py-2 text-center font-medium">
                                      Documents
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="px-4 py-2">
                                      <div>{inv.invoiceno}</div>
                                      <div className="text-xs text-gray-500">
                                        Date: {inv.invoicedate}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {formatCurrency(
                                        summary.value,
                                        summary.currency,
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {formatCurrency(
                                        summary.realized,
                                        summary.currency,
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {formatCurrency(
                                        summary.fbCharges,
                                        summary.currency,
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {formatCurrency(
                                        summary.reduction,
                                        summary.currency,
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-right text-red-600 font-semibold">
                                      {formatCurrency(
                                        summary.outstanding,
                                        summary.currency,
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <span
                                        className={`px-2 py-0.5 text-xs rounded-full ${summary.statusClass}`}
                                      >
                                        {summary.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {summary.hasDocs ? (
                                        <button
                                          onClick={() =>
                                            alert(
                                              "Show documents for " +
                                                inv.invoiceno,
                                            )
                                          }
                                          className="text-blue-600 text-lg"
                                        >
                                          📄
                                        </button>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            <h5 className="font-semibold mb-3 text-base">
                              Linked Remittance Details
                            </h5>
                            <div className="overflow-x-auto mb-6 border rounded-lg">
                              <table className="min-w-full text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left font-medium">
                                      IRM Details
                                    </th>
                                    <th className="px-4 py-2 text-left font-medium">
                                      Remittance Details
                                    </th>
                                    <th className="px-4 py-2 text-left font-medium">
                                      Remitter
                                    </th>
                                    <th className="px-4 py-2 text-right font-medium">
                                      IRM Utilized (in FCY)
                                    </th>
                                    <th className="px-4 py-2 text-right font-medium">
                                      Conv. Rate
                                    </th>
                                    <th className="px-4 py-2 text-right font-medium">
                                      Invoice Realized
                                    </th>
                                    <th className="px-4 py-2 text-right font-medium">
                                      FB Charges
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {summary.hasRemittanceData &&
                                  inv.remittanceList &&
                                  inv.remittanceList.length > 0 ? (
                                    inv.remittanceList.map((rem, remIndex) =>
                                      (rem.irmLines || []).map(
                                        (irm, irmIndex) => (
                                          <tr
                                            key={`rem-${rem.remRef}-${irm.irmRef || irmIndex}`}
                                          >
                                            <td className="px-4 py-2">
                                              <div>{irm.irmRef}</div>
                                              <div className="text-xs text-gray-500">
                                                {irm.irmDate}
                                              </div>
                                            </td>
                                            {irmIndex === 0 ? (
                                              <>
                                                <td
                                                  rowSpan={rem.irmLines.length}
                                                  className="px-4 py-2 align-top"
                                                >
                                                  <div>{rem.remRef}</div>
                                                  <div className="text-xs text-gray-500">
                                                    {rem.remDate}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    Net:{" "}
                                                    {rem.net?.toLocaleString(
                                                      "en-US",
                                                    ) ?? "-"}{" "}
                                                    (Ins:{" "}
                                                    {rem.instructed?.toLocaleString(
                                                      "en-US",
                                                    ) ?? "-"}{" "}
                                                    - Ch:{" "}
                                                    {rem.charges?.toLocaleString(
                                                      "en-US",
                                                    ) ?? "-"}
                                                    )
                                                  </div>
                                                </td>
                                                <td
                                                  rowSpan={rem.irmLines.length}
                                                  className="px-4 py-2 align-top"
                                                >
                                                  <div>{rem.remitterName}</div>
                                                  <div className="text-xs text-gray-500">
                                                    {currentBill.buyerCode}
                                                  </div>
                                                </td>
                                              </>
                                            ) : null}
                                            <td className="px-4 py-2 text-right">
                                              {formatCurrency(
                                                irm.irmUtilized,
                                                summary.currency,
                                              )}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              {irm.convRate?.toFixed(4) ?? "-"}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              {formatCurrency(
                                                irm.invRealized,
                                                summary.currency,
                                              )}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              {formatCurrency(
                                                irm.fbChargesRem,
                                                summary.currency,
                                              )}
                                            </td>
                                          </tr>
                                        ),
                                      ),
                                    )
                                  ) : (
                                    <tr>
                                      <td
                                        colSpan={7}
                                        className="text-center py-4 text-gray-500"
                                      >
                                        No remittances mapped yet.
                                      </td>
                                    </tr>
                                  )}

                                  {/* --- NEW: Pending Remittance Rows --- */}
                                  {pendingRemittances.map((item, itemIndex) => (
                                    <tr key={item.key} className="bg-blue-50">
                                      <td className="px-4 py-2">
                                        <div>{item.irmRef}</div>
                                        <div className="text-xs text-gray-500">
                                          {item.irmDate}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2">
                                        <div>{item.parentRemRef}</div>
                                        <div className="text-xs text-gray-500">
                                          {item.parentRemDate}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2">
                                        <div>{item.parentRemitterName}</div>
                                        <div className="text-xs text-gray-500">
                                          {item.parentBuyerCode}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-right w-36">
                                        <input
                                          type="number"
                                          value={item.irmUtilized}
                                          onChange={(e) =>
                                            handlePendingRemChange(
                                              item.key,
                                              "irmUtilized",
                                              e.target.value,
                                            )
                                          }
                                          className="w-full p-1 border rounded-md text-right text-sm"
                                          step="0.01"
                                        />
                                      </td>
                                      <td className="px-4 py-2 text-right w-28">
                                        <input
                                          type="number"
                                          value={
                                            item.convRate === null
                                              ? ""
                                              : item.convRate
                                          }
                                          onChange={(e) =>
                                            handlePendingRemChange(
                                              item.key,
                                              "convRate",
                                              e.target.value,
                                            )
                                          }
                                          className="w-full p-1 border rounded-md text-right text-sm"
                                          step="0.0001"
                                          placeholder={
                                            item.currency === summary.currency
                                              ? "1.00"
                                              : "Enter Rate"
                                          }
                                          disabled={
                                            item.currency === summary.currency
                                          }
                                        />
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {formatCurrency(
                                          item.invoiceRealized,
                                          summary.currency,
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {formatCurrency(
                                          item.fbChargesRem,
                                          summary.currency,
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                {/* --- NEW: Total and Sub-total Rows --- */}
                                <tfoot>
                                  {inv.remittanceList?.length > 0 && (
                                    <tr className="bg-gray-100 font-semibold">
                                      <td
                                        colSpan={3}
                                        className="px-4 py-2 text-right"
                                      >
                                        Total Linked:
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {formatCurrency(
                                          existingRemTotals.irmUtilized,
                                          summary.currency,
                                        )}
                                      </td>
                                      <td className="px-4 py-2"></td>
                                      <td className="px-4 py-2 text-right">
                                        {formatCurrency(
                                          existingRemTotals.invRealized,
                                          summary.currency,
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {formatCurrency(
                                          existingRemTotals.fbChargesRem,
                                          summary.currency,
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                  {pendingRemittances.length > 0 && (
                                    <tr className="bg-blue-100 font-semibold">
                                      <td
                                        colSpan={3}
                                        className="px-4 py-2 text-right"
                                      >
                                        Sub-Total Pending:
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {formatCurrency(
                                          pendingRemTotals.irmUtilized,
                                          summary.currency,
                                        )}
                                      </td>
                                      <td className="px-4 py-2"></td>
                                      <td className="px-4 py-2 text-right">
                                        {formatCurrency(
                                          pendingRemTotals.invRealized,
                                          summary.currency,
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {formatCurrency(
                                          pendingRemTotals.fbChargesRem,
                                          summary.currency,
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                </tfoot>
                              </table>
                            </div>

                            <div className="flex justify-between items-center mt-4">
                              <p className="text-sm">
                                Total Available for Mapping (All Invoices):{" "}
                                <span className="font-semibold text-red-600">
                                  {formatCurrency(
                                    totalOutstandingForMapping,
                                    firstInvoiceCurrency,
                                  )}
                                </span>
                              </p>
                              <div>
                                {pendingRemittances.length > 0 && (
                                  <button
                                    onClick={handleSavePendingRemittances}
                                    className="bg-green-600 text-white text-sm py-1.5 px-4 rounded-lg hover:bg-green-700 mr-2"
                                  >
                                    Save Mapped Remittances
                                  </button>
                                )}
                                <button
                                  onClick={handleOpenFetchSettledRemModal}
                                  className="bg-blue-600 text-white text-sm py-1.5 px-4 rounded-lg hover:bg-blue-700"
                                >
                                  Map Available Remittances
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {(!currentBill.invoiceList ||
                        currentBill.invoiceList.length === 0) && (
                        <div className="text-center py-4 text-gray-500">
                          <p>No invoices linked to this shipping bill.</p>
                          <h5 className="font-semibold mb-3 text-base mt-6">
                            Linked Remittance Details
                          </h5>
                          <div className="overflow-x-auto mb-6 border rounded-lg">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left font-medium">
                                    IRM Details
                                  </th>
                                  <th className="px-4 py-2 text-left font-medium">
                                    Remittance Details
                                  </th>{" "}
                                  <th className="px-4 py-2 text-left font-medium">
                                    Remitter
                                  </th>
                                  <th className="px-4 py-2 text-right font-medium">
                                    IRM Utilized (in FCY)
                                  </th>{" "}
                                  <th className="px-4 py-2 text-right font-medium">
                                    Conv. Rate
                                  </th>{" "}
                                  <th className="px-4 py-2 text-right font-medium">
                                    Invoice Realized
                                  </th>
                                  <th className="px-4 py-2 text-right font-medium">
                                    FB Charges
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td
                                    colSpan={7}
                                    className="text-center py-4 text-gray-500"
                                  >
                                    No data available.
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remittance Detail Modal */}
      {isRemittanceDetailModalOpen && currentRemittance && (
        <RemittanceDetailModal
          remittance={currentRemittance}
          allBills={allBills}
          onClose={() => setIsRemittanceDetailModalOpen(false)}
          activeSubTab={activeSettlementSubTab}
          setActiveSubTab={setActiveSettlementSubTab}
          onSettleClick={handleOpenSettleModal} // NEW: Pass handler to open settle modal
        />
      )}

      {/* Citi Upload Remittances Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto border w-full max-w-2xl shadow-lg rounded-xl bg-white">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Upload Outstanding Remittances (Citi Bank)
                </h3>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  &times;
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Paste your data below (including header row, tab-separated):
              </p>
              <textarea
                value={uploadDataInput}
                onChange={(e) => setUploadDataInput(e.target.value)}
                className="w-full h-64 p-3 border rounded-lg font-mono text-xs"
                placeholder={`Senders Ref.\tMessage ID\tF50-ORG Name\tInstr. Amount\t...\nREF123\tMSG001\tRemitter Name\t10000\t...`}
              ></textarea>
              <div className="mt-4 flex justify-end gap-4">
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
                >
                  Submit Remittances
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ICICI Upload Remittances Modal */}
      {isICICIUploadModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto border w-full max-w-2xl shadow-lg rounded-xl bg-white">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Upload Outstanding Remittances (ICICI Bank)
                </h3>
                <button
                  onClick={() => setIsICICIUploadModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  &times;
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Paste your JSON data below:
              </p>
              <textarea
                value={iciciUploadJsonInput}
                onChange={(e) => setIciciUploadJsonInput(e.target.value)}
                className="w-full h-64 p-3 border rounded-lg font-mono text-xs"
                placeholder={`{\n  "AssignmentDetails": {\n    "DTAssignment": [\n      {\n        "GRSReferenceNo": "...",\n        ...\n      }\n    ]\n  }\n}`}
              ></textarea>
              <div className="mt-4 flex justify-end gap-4">
                <button
                  onClick={() => setIsICICIUploadModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleICICIUploadSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
                >
                  Submit Remittances
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Settle Remittance Modal */}
      {isSettleModalOpen && currentRemittance && (
        <SettleRemittanceModal
          remittance={currentRemittance}
          allBills={allBills}
          onClose={() => setIsSettleModalOpen(false)}
          onSubmit={handleSettleSubmit}
          // Fetch Invoice Modal Props
          isFetchInvoiceModalOpen={isFetchInvoiceModalOpen}
          setIsFetchInvoiceModalOpen={setIsFetchInvoiceModalOpen}
          availableInvoices={availableInvoices}
          selectedFetchInvoices={selectedFetchInvoices}
          onOpenFetchInvoiceModal={handleOpenFetchInvoiceModal}
          onFetchInvoiceSelectionChange={handleFetchInvoiceSelectionChange}
        />
      )}
      {/* NEW: Fetch Settled Remittances Modal */}
      {isFetchSettledRemModalOpen && (
        <FetchSettledRemittancesModal
          customerName={currentBill?.buyerName || ""}
          customerCode={currentBill?.buyerCode || ""}
          remittances={availableSettledRemittances}
          selectedRemittances={selectedSettledRemittances}
          onSelectionChange={handleSettledRemSelectionChange}
          onClose={() => setIsFetchSettledRemModalOpen(false)}
          onProceed={handleProceedWithSettledRemittances}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}

// --- REMITTANCES TABLE COMPONENT ---
const RemittancesTable = ({
  data,
  formatCurrency,
  onRowDoubleClick,
  allBills,
  // Citi Props
  isUploadModalOpen,
  setIsUploadModalOpen,
  uploadDataInput,
  setUploadDataInput,
  handleUploadSubmit,
  // ICICI Props
  isICICIUploadModalOpen,
  setIsICICIUploadModalOpen,
  iciciUploadJsonInput,
  setIciciUploadJsonInput,
  handleICICIUploadSubmit,
  // Settle Modal Prop
  onOpenSettleModal, // Keep this prop for the detail modal to use
}) => {
  const [activeRemFilter, setActiveRemFilter] = useState("All");
  const [remBankFilter, setRemBankFilter] = useState("All");

  // --- Remittance Status Logic ---
  const getRemittanceStatus = (remGroup) => {
    // 1. Outstanding: No IRM ref
    if (
      !remGroup.irmLines ||
      remGroup.irmLines.length === 0 ||
      !remGroup.irmLines.some((irm) => irm.irmRef)
    ) {
      // Check if it's from a manual upload, which are always outstanding until mapped
      // Check if the remittance exists within a bill marked as isManualUpload
      const bill = allBills.find(
        (b) =>
          b.isManualUpload &&
          b.invoiceList[0]?.remittanceList?.some(
            (r) => r.remRef === remGroup.remRef,
          ),
      );
      if (bill)
        return { text: "Outstanding", className: "bg-blue-100 text-blue-800" }; // Changed class for manual uploads
      // Or if it's a regular one with no IRM
      return {
        text: "Outstanding",
        className: "bg-yellow-100 text-yellow-800",
      };
    }

    // 2. Unutilized, Part utilized, Utilized
    let totalUtilized = 0;
    let totalRemittanceValue = remGroup.net || 0; // Use net value of the remittance
    totalUtilized = remGroup.irmLines.reduce(
      (sum, irm) => sum + (irm.irmUtilized || 0),
      0,
    );

    if (totalUtilized === 0) {
      return { text: "Unutilized", className: "bg-blue-100 text-blue-800" };
    } else if (totalUtilized < totalRemittanceValue) {
      return {
        text: "Part utilized",
        className: "bg-purple-100 text-purple-800",
      };
    } else {
      // totalUtilized >= totalRemittanceValue
      return { text: "Utilized", className: "bg-green-100 text-green-800" };
    }
  };

  // Calculate bank counts, ensuring default banks are included
  const remBankCounts = useMemo(() => {
    const counts = data.reduce((acc, rem) => {
      const bankName = rem.bankName || "Unknown";
      acc[bankName] = (acc[bankName] || 0) + 1;
      return acc;
    }, {});
    // Ensure default banks exist, even if count is 0
    ["ICICI Bank", "Citi Bank", "HSBC"].forEach((bank) => {
      if (!counts[bank]) counts[bank] = 0;
    });
    counts["All"] = data.length;
    return counts;
  }, [data]);

  // Filter data *only* by bank first
  const bankFilteredRemittances = useMemo(() => {
    return data.filter((remGroup) => {
      return remBankFilter === "All" || remGroup.bankName === remBankFilter;
    });
  }, [data, remBankFilter]);

  // Calculate status counts based *only* on the bank-filtered remittances
  const displayedRemStatusCounts = useMemo(() => {
    const counts = bankFilteredRemittances.reduce((acc, rem) => {
      const statusText = getRemittanceStatus(rem).text;
      acc[statusText] = (acc[statusText] || 0) + 1;
      return acc;
    }, {});
    // Calculate the 'All' count as the sum of other statuses *within the filtered group*
    counts["All"] = Object.entries(counts).reduce(
      (sum, [key, value]) => (key === "All" ? sum : sum + value),
      0,
    );
    return counts;
  }, [bankFilteredRemittances, allBills]); // Added allBills

  // Filter data for display based on activeRemFilter
  const filteredData = useMemo(() => {
    if (activeRemFilter === "All") {
      return bankFilteredRemittances;
    }
    return bankFilteredRemittances.filter((remGroup) => {
      const statusMatch =
        getRemittanceStatus(remGroup).text === activeRemFilter;
      return statusMatch;
    });
  }, [bankFilteredRemittances, activeRemFilter, allBills]); // Added allBills dependency

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Remittances</h1>
        {/* Conditional Upload Buttons */}
        <div className="flex gap-4">
          {remBankFilter === "Citi Bank" && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-green-700"
            >
              Upload - Citi Remittances
            </button>
          )}
          {remBankFilter === "ICICI Bank" && (
            <button
              onClick={() => setIsICICIUploadModalOpen(true)}
              className="bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-orange-700"
            >
              Upload - ICICI Remittances
            </button>
          )}
        </div>
      </header>

      {/* Filters Row */}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 items-center">
        {/* Bank Filter Dropdown */}
        <div>
          <label
            htmlFor="remBankFilter"
            className="text-sm font-medium text-gray-700 mr-2"
          >
            Bank:
          </label>
          <select
            id="remBankFilter"
            value={remBankFilter}
            onChange={(e) => setRemBankFilter(e.target.value)}
            className="py-2 pl-3 pr-8 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {/* Ensure specific banks are listed first/always */}
            {["All", "ICICI Bank", "Citi Bank", "HSBC"]
              .concat(
                Object.keys(remBankCounts)
                  .filter(
                    (b) =>
                      !["All", "ICICI Bank", "Citi Bank", "HSBC"].includes(b),
                  )
                  .sort(),
              ) // Add other banks alphabetically
              .filter((value, index, self) => self.indexOf(value) === index) // Ensure unique
              .map((bankName) => (
                <option key={bankName} value={bankName}>
                  {bankName} ({remBankCounts[bankName] || 0})
                </option>
              ))}
          </select>
        </div>

        {/* Status Filter Buttons - Updated Count Logic */}
        <div className="flex flex-wrap gap-2 border-l pl-4">
          {[
            "All",
            "Outstanding",
            "Unutilized",
            "Part utilized",
            "Utilized",
          ].map((status) => {
            const count = displayedRemStatusCounts[status] || 0;
            return (
              <button
                key={status}
                onClick={() => setActiveRemFilter(status)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200 ${activeRemFilter === status ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">
                  Settlement Status
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Remittance Details
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Sender Reference
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Remitter
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  IRM Details
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Purpose
                </th>
                <th scope="col" className="px-6 py-3 font-medium text-right">
                  Amount (FCY)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.length > 0 ? (
                filteredData.flatMap((remGroup, groupIndex) => {
                  const rowSpan = remGroup.irmLines.length || 1; // Handle groups with no IRMs
                  const status = getRemittanceStatus(remGroup);

                  // Handle case with no IRM lines (e.g., manual upload)
                  if (rowSpan === 1 && remGroup.irmLines.length === 0) {
                    return [
                      // Return as array for flatMap
                      <tr
                        key={`${remGroup.remRef}-no-irm-${groupIndex}`} // Added groupIndex to key
                        onDoubleClick={() => onRowDoubleClick(remGroup)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 align-top">
                          <span
                            className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.className}`}
                          >
                            {status.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="font-semibold text-gray-900">
                            {remGroup.remRef}
                          </div>
                          <div className="text-xs text-gray-500">
                            {remGroup.remDate}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Net:{" "}
                            <span className="font-semibold text-gray-900">
                              {remGroup.net?.toLocaleString("en-US") ?? "-"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            (Ins:{" "}
                            {remGroup.instructed?.toLocaleString("en-US") ??
                              "-"}{" "}
                            - Ch:{" "}
                            {remGroup.charges?.toLocaleString("en-US") ?? "-"})
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="font-semibold text-gray-900">
                            {remGroup.senderRefNo || "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {remGroup.senderRefDate || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="font-semibold text-gray-900">
                            {remGroup.remitterName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {remGroup.buyerCode}
                          </div>
                        </td>
                        <td className="px-6 py-4">-</td>
                        <td className="px-6 py-4">-</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {formatCurrency(remGroup.net, remGroup.currency)}
                        </td>
                      </tr>,
                    ];
                  }

                  return remGroup.irmLines.map((irm, irmIndex) => (
                    <tr
                      key={`${remGroup.remRef}-${irm.irmRef || irmIndex}-${groupIndex}`} // Added groupIndex to key
                      onDoubleClick={() => onRowDoubleClick(remGroup)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      {irmIndex === 0 ? (
                        <>
                          <td rowSpan={rowSpan} className="px-6 py-4 align-top">
                            <span
                              className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.className}`}
                            >
                              {status.text}
                            </span>
                          </td>
                          <td rowSpan={rowSpan} className="px-6 py-4 align-top">
                            <div className="font-semibold text-gray-900">
                              {remGroup.remRef}
                            </div>
                            <div className="text-xs text-gray-500">
                              {remGroup.remDate}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Net:{" "}
                              <span className="font-semibold text-gray-900">
                                {remGroup.net?.toLocaleString("en-US") ?? "-"}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              (Ins:{" "}
                              {remGroup.instructed?.toLocaleString("en-US") ??
                                "-"}{" "}
                              - Ch:{" "}
                              {remGroup.charges?.toLocaleString("en-US") ?? "-"}
                              )
                            </div>
                          </td>
                          <td rowSpan={rowSpan} className="px-6 py-4 align-top">
                            <div className="font-semibold text-gray-900">
                              {remGroup.senderRefNo || "-"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {remGroup.senderRefDate || "-"}
                            </div>
                          </td>
                          <td rowSpan={rowSpan} className="px-6 py-4 align-top">
                            <div className="font-semibold text-gray-900">
                              {remGroup.remitterName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {remGroup.buyerCode}
                            </div>
                          </td>
                        </>
                      ) : null}
                      {/* These columns are per-IRM line */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {irm.irmRef || "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {irm.irmDate || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {irm.purposeCode}
                        </div>
                        <div className="text-xs text-gray-500">
                          {irm.purposeDesc}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        {formatCurrency(irm.irmUtilized, irm.currency)}
                      </td>
                    </tr>
                  ));
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-10 text-gray-500">
                    No remittances found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- REMITTANCE DETAIL MODAL ---
const RemittanceDetailModal = ({
  remittance,
  allBills,
  onClose,
  activeSubTab,
  setActiveSubTab,
  onSettleClick,
}) => {
  // Added onSettleClick prop

  // Find party details from allBills
  const partyDetails = useMemo(() => {
    const bill = allBills.find(
      (b) =>
        b.buyerCode === remittance.buyerCode ||
        b.buyerName === remittance.remitterName,
    );
    return {
      name: remittance.remitterName,
      code: remittance.buyerCode,
      address: bill ? bill.buyerAddress : "N/A", // Get address from the found bill
    };
  }, [remittance, allBills]);

  // Find all linked invoices for all IRMs in this remittance group
  const linkedInvoiceMap = useMemo(() => {
    const map = new Map();
    if (!remittance || !allBills) return map;

    for (const irmLine of remittance.irmLines) {
      // Use irmRef as key; use a unique placeholder for null refs
      const key =
        irmLine.irmRef || `null-${irmLine.purposeCode}-${irmLine.irmUtilized}`;

      if (map.has(key)) continue; // Already processed this IRM

      const invoicesFound = [];
      if (irmLine.irmRef) {
        // Only search for linked invoices if irmRef exists
        for (const bill of allBills) {
          if (bill.isManualUpload) continue; // Don't check manual bills
          for (const inv of bill.invoiceList || []) {
            for (const rem of inv.remittanceList || []) {
              const matchingIrm = rem.irmLines.find(
                (irm) => irm.irmRef === irmLine.irmRef,
              );
              if (matchingIrm) {
                invoicesFound.push({
                  shippingBillNo: bill.shippingBillNo,
                  shippingBillDate: bill.shippingBillDate || bill.shippingDate,
                  invoiceno: inv.invoiceno,
                  invoiceValue: inv.exportbillvalue,
                  currency: inv.fobcurrencycode,
                  remittanceUtilized: matchingIrm.irmUtilized,
                  convRate: matchingIrm.convRate,
                  invoiceRealized: matchingIrm.invRealized,
                  fbCharges: matchingIrm.fbChargesRem,
                });
              }
            }
          }
        }
      }
      map.set(key, invoicesFound);
    }
    return map;
  }, [remittance, allBills]);

  const DetailItemLR = ({ label, value }) => (
    <div className="grid grid-cols-2 gap-1 py-1">
      <p className="font-medium text-gray-500 text-sm">{label}</p>
      <p className="text-gray-800 text-sm">{value || "-"}</p>
    </div>
  );

  // Determine the currency for the summary section
  const summaryCurrency =
    remittance.irmLines[0]?.currency || remittance.currency || "USD"; // Fallback
  const isOutstanding = remittance.irmLines.length === 0; // Check if outstanding

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto border w-full max-w-6xl shadow-lg rounded-xl bg-white">
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            &times;
          </button>
          <h3 className="text-xl leading-6 font-bold text-gray-900 mb-6">
            Remittance Details
          </h3>

          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">
                Party Details
              </h4>
              <div className="space-y-1">
                <DetailItemLR
                  label="Remitter Name:"
                  value={partyDetails.name}
                />
                <DetailItemLR
                  label="Customer Code:"
                  value={partyDetails.code}
                />
                <DetailItemLR label="Address:" value={partyDetails.address} />
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">
                Bank Details
              </h4>
              <div className="space-y-1">
                <DetailItemLR label="Bank Name:" value={remittance.bankName} />
                <DetailItemLR label="AD Code:" value={remittance.adCode} />
                <DetailItemLR label="IFSC Code:" value={remittance.ifscCode} />
              </div>
            </div>
          </div>

          {/* Remittance Summary - Adding new fields */}
          <div className="p-4 border rounded-lg bg-gray-50 mb-6">
            <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">
              Remittance Summary
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <DetailItemLR
                label="Sender Ref"
                value={`${remittance.senderRefNo || "-"} (${remittance.senderRefDate || "-"})`}
              />
              <DetailItemLR
                label="Remittance Ref"
                value={`${remittance.remRef} (${remittance.remDate})`}
              />
              <DetailItemLR
                label="Instructed Value"
                value={formatCurrency(remittance.instructed, summaryCurrency)}
              />
              <DetailItemLR
                label="FB Charges Deducted"
                value={formatCurrency(remittance.charges, summaryCurrency)}
              />
              <DetailItemLR
                label="Beneficiary Name (Swift)"
                value={remittance.beneficiaryNameSwift || "-"}
              />
              <DetailItemLR
                label="Beneficiary Bank ID"
                value={remittance.beneficiaryBankId || "-"}
              />
              <div className="col-span-1 md:col-span-2 mt-1 pt-1 border-t">
                <DetailItemLR
                  label="Remitter Remarks"
                  value={remittance.remitterRemarks || "-"}
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <DetailItemLR
                  label="Details of Charges"
                  value={remittance.detailsOfCharges || "-"}
                />
              </div>
              <div className="col-span-1 md:col-span-2 mt-2 pt-2 border-t">
                <DetailItemLR
                  label="Net Remittance Value"
                  value={
                    <span className="font-bold text-blue-600">
                      {formatCurrency(remittance.net, summaryCurrency)}
                    </span>
                  }
                />
              </div>
            </div>
          </div>

          {/* Bottom Settlement Tabs Section */}
          <div>
            <div className="border-b border-gray-200">
              <nav
                className="-mb-px flex space-x-6 overflow-x-auto"
                aria-label="Settlement Tabs"
              >
                {!isOutstanding ? (
                  remittance.irmLines.map((irm, index) => (
                    <button
                      key={`settlement-tab-${index}`}
                      onClick={() => setActiveSubTab(index)}
                      className={`${activeSubTab === index ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                    >
                      Settlement {index + 1}
                    </button>
                  ))
                ) : (
                  <p className="py-3 text-sm text-gray-500">
                    No settlement details available (Outstanding)
                  </p>
                )}
              </nav>
            </div>
            <div className="mt-4 p-4 border rounded-b-lg min-h-[200px]">
              {!isOutstanding ? (
                remittance.irmLines.map((irm, index) => {
                  if (index !== activeSubTab) return null;

                  const key =
                    irm.irmRef || `null-${irm.purposeCode}-${irm.irmUtilized}`;
                  const linkedInvoices = linkedInvoiceMap.get(key) || [];
                  const settlementOutstanding = 0; // Per screenshot, this seems to be 0 if utilized

                  return (
                    <div key={`settlement-content-${index}`}>
                      {/* Settlement & Purpose Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-6">
                        <DetailItemLR
                          label="Credit Account"
                          value="ABC Exporters Pvt Ltd - 123456789"
                        />{" "}
                        {/* Placeholder */}
                        <DetailItemLR
                          label="Purpose Code"
                          value={irm.purposeCode}
                        />
                        <DetailItemLR
                          label="Credit Amount"
                          value={formatCurrency(irm.irmUtilized, irm.currency)}
                        />
                        <DetailItemLR
                          label="Purpose Description"
                          value={irm.purposeDesc}
                        />
                        <DetailItemLR
                          label="Settlement Utilized"
                          value={formatCurrency(irm.irmUtilized, irm.currency)}
                        />
                        <DetailItemLR
                          label="Settlement Outstanding"
                          value={
                            <span className="text-red-600 font-medium">
                              {formatCurrency(
                                settlementOutstanding,
                                irm.currency,
                              )}
                            </span>
                          }
                        />
                      </div>

                      {/* Invoice Mapped Table */}
                      <h5 className="font-semibold mb-3 text-base">
                        Invoice Mapped Details
                      </h5>
                      <div className="overflow-x-auto mb-6 border rounded-lg">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">
                                Invoice Details
                              </th>
                              <th className="px-4 py-2 text-left font-medium">
                                Shipping Bill
                              </th>
                              <th className="px-4 py-2 text-right font-medium">
                                Invoice Value
                              </th>
                              <th className="px-4 py-2 text-right font-medium">
                                Remittance Utilized
                              </th>
                              <th className="px-4 py-2 text-right font-medium">
                                Conv. Rate
                              </th>
                              <th className="px-4 py-2 text-right font-medium">
                                Invoice Realized
                              </th>
                              <th className="px-4 py-2 text-right font-medium">
                                FB Charges
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {linkedInvoices.length > 0 ? (
                              linkedInvoices.map((inv, invIndex) => (
                                <tr key={`linked-inv-${invIndex}`}>
                                  <td className="px-4 py-2">
                                    <div>{inv.invoiceno}</div>
                                    <div className="text-xs text-gray-500">
                                      {inv.invoicedate || "N/A"}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div>{inv.shippingBillNo}</div>
                                    <div className="text-xs text-gray-500">
                                      {inv.shippingBillDate}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {formatCurrency(
                                      inv.invoiceValue,
                                      inv.currency,
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {formatCurrency(
                                      inv.remittanceUtilized,
                                      inv.currency,
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {inv.convRate?.toFixed(4) ?? "-"}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {formatCurrency(
                                      inv.invoiceRealized,
                                      inv.currency,
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {formatCurrency(
                                      inv.fbCharges,
                                      inv.currency,
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="text-center py-4 text-gray-500"
                                >
                                  Not mapped to any invoice.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <p>This is an outstanding remittance.</p>
                  <button
                    onClick={() => onSettleClick(remittance)} // Call the passed handler
                    className="mt-4 bg-blue-600 text-white text-sm py-1.5 px-4 rounded-lg hover:bg-blue-700"
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
  );
};

// --- NEW: SETTLE REMITTANCE MODAL (MULTI-SETTLEMENT) ---
const SettleRemittanceModal = ({
  remittance,
  allBills,
  onClose,
  onSubmit,
  // Fetch Invoice Modal Props
  isFetchInvoiceModalOpen,
  setIsFetchInvoiceModalOpen,
  availableInvoices,
  selectedFetchInvoices,
  onOpenFetchInvoiceModal,
  onFetchInvoiceSelectionChange,
}) => {
  // Global state for the modal
  const [globalSettlementData, setGlobalSettlementData] = useState({
    totalFbCharges: remittance.charges || 0,
    checker: "No Checker",
  });

  // Array to hold data for each settlement tab
  const [settlements, setSettlements] = useState([
    // Initial settlement tab
    {
      creditAccount: "ICICI Bank - 1234567890 (INR)",
      creditAmount: remittance.net || 0,
      purposeCode: "P0102",
      purposeDescription: "Export of Goods",
      dealType: "Bank",
      attachment: null,
      linkedInvoices: [], // Each settlement has its own linked invoices
    },
  ]);
  const [activeSettlementIndex, setActiveSettlementIndex] = useState(0);

  // --- Calculations ---
  const totalRemittanceAmount = useMemo(
    () => remittance.net || 0,
    [remittance],
  );

  const totalCreditAmountAllocated = useMemo(() => {
    return settlements.reduce(
      (sum, s) => sum + (parseFloat(s.creditAmount) || 0),
      0,
    );
  }, [settlements]);

  const overallBalanceAmount = useMemo(() => {
    return totalRemittanceAmount - totalCreditAmountAllocated;
  }, [totalRemittanceAmount, totalCreditAmountAllocated]);

  const currentSettlementAvailableForMapping = useMemo(() => {
    const current = settlements[activeSettlementIndex];
    if (!current) return 0;
    const creditAmount = parseFloat(current.creditAmount) || 0;
    const utilizedAmount = current.linkedInvoices.reduce(
      (sum, inv) => sum + (parseFloat(inv.remittanceUtilized) || 0),
      0,
    );
    return creditAmount - utilizedAmount;
  }, [settlements, activeSettlementIndex]);

  const purposeCodes = {
    P0102: "Export of Goods",
    P0103: "Advance against Export",
    P0807: "Other Services",
    // Add more codes as needed
  };

  // --- Handlers ---
  const handleGlobalInputChange = (e) => {
    const { name, value } = e.target;
    setGlobalSettlementData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSettlementInputChange = (index, e) => {
    const { name, value } = e.target;
    setSettlements((prev) => {
      const updated = [...prev];
      const settlement = { ...updated[index] };
      settlement[name] = value;
      if (name === "purposeCode") {
        settlement.purposeDescription = purposeCodes[value] || "";
      }
      updated[index] = settlement;
      return updated;
    });
  };

  const handleSettlementFileChange = (index, e) => {
    if (e.target.files && e.target.files[0]) {
      setSettlements((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], attachment: e.target.files[0] };
        return updated;
      });
    }
  };

  const addSettlementTab = () => {
    setSettlements((prev) => [
      ...prev,
      {
        // New empty settlement
        creditAccount: "ICICI Bank - 1234567890 (INR)",
        creditAmount: 0, // Start with 0
        purposeCode: "P0102",
        purposeDescription: "Export of Goods",
        dealType: "Bank",
        attachment: null,
        linkedInvoices: [],
      },
    ]);
    setActiveSettlementIndex(settlements.length); // Switch to the new tab
  };

  // --- Handlers for Linked Invoices (modified to use active index) ---
  const handleAddSelectedInvoices = (selectedInvoicesData) => {
    const newLinkedInvoices = selectedInvoicesData.map((inv) => {
      const outstanding = parseFloat(inv.outstanding) || 0;
      // Prefill utilized amount capped by current settlement's remaining available amount
      const currentCreditAmount =
        parseFloat(settlements[activeSettlementIndex]?.creditAmount) || 0;
      const currentUtilized =
        settlements[activeSettlementIndex]?.linkedInvoices.reduce(
          (sum, i) => sum + i.remittanceUtilized,
          0,
        ) || 0;
      const remainingAvailable = currentCreditAmount - currentUtilized;
      const remittanceUtilized = Math.min(
        outstanding,
        remainingAvailable > 0 ? remainingAvailable : 0,
      ); // Cap at 0 if no amount left

      const convRate = remittance.currency === inv.fobcurrencycode ? 1.0 : null;
      const invoiceRealized =
        convRate !== null ? remittanceUtilized * convRate : 0;

      return {
        id: `${inv.invoiceno}|${inv.shippingBillNo}`,
        invoiceno: inv.invoiceno,
        invoicedate: inv.invoicedate,
        shippingBillNo: inv.shippingBillNo,
        shippingBillDate: inv.shippingBillDate,
        invoiceValue: parseFloat(inv.exportbillvalue) || 0,
        currency: inv.fobcurrencycode,
        remittanceUtilized: remittanceUtilized,
        convRate: convRate,
        invoiceRealized: invoiceRealized,
        fbCharges: 0, // FB Charges calculated later
      };
    });

    setSettlements((prevSettlements) => {
      const updatedSettlements = [...prevSettlements];
      const currentLinked =
        updatedSettlements[activeSettlementIndex].linkedInvoices;
      const existingIds = new Set(currentLinked.map((inv) => inv.id));
      const uniqueNewInvoices = newLinkedInvoices.filter(
        (inv) => !existingIds.has(inv.id),
      );
      updatedSettlements[activeSettlementIndex] = {
        ...updatedSettlements[activeSettlementIndex],
        linkedInvoices: [...currentLinked, ...uniqueNewInvoices],
      };
      return updatedSettlements;
    });
  };

  const handleLinkedInvoiceChange = (
    settlementIndex,
    invoiceIndex,
    field,
    value,
  ) => {
    setSettlements((prevSettlements) => {
      const updatedSettlements = [...prevSettlements];
      const settlement = { ...updatedSettlements[settlementIndex] };
      const updatedInvoices = [...settlement.linkedInvoices];
      const invoice = { ...updatedInvoices[invoiceIndex] };

      let numValue = parseFloat(value);
      // Handle empty input for numbers gracefully
      if (field === "remittanceUtilized" || field === "convRate") {
        if (value === "" || isNaN(numValue)) {
          numValue = field === "convRate" ? null : 0; // Allow null for convRate, 0 for utilized
        }
      } else {
        // Fallback for other potential numeric fields
        if (isNaN(numValue)) numValue = 0;
      }

      if (field === "remittanceUtilized") {
        invoice.remittanceUtilized = numValue;
        if (invoice.convRate !== null) {
          invoice.invoiceRealized = numValue * invoice.convRate;
        } else {
          invoice.invoiceRealized = 0; // Reset if convRate is null
        }
      } else if (field === "convRate") {
        invoice.convRate = numValue; // Can be null if input is empty
        if (numValue !== null) {
          invoice.invoiceRealized = invoice.remittanceUtilized * numValue;
        } else {
          invoice.invoiceRealized = 0; // Cannot calculate if rate is missing
        }
      }

      updatedInvoices[invoiceIndex] = invoice;
      settlement.linkedInvoices = updatedInvoices;
      updatedSettlements[settlementIndex] = settlement;
      return updatedSettlements; // Return the updated array of settlements
    });
  };

  const handleRemoveLinkedInvoice = (settlementIndex, invoiceIndexToRemove) => {
    setSettlements((prevSettlements) => {
      const updatedSettlements = [...prevSettlements];
      const settlement = { ...updatedSettlements[settlementIndex] };
      settlement.linkedInvoices = settlement.linkedInvoices.filter(
        (_, index) => index !== invoiceIndexToRemove,
      );
      updatedSettlements[settlementIndex] = settlement;
      return updatedSettlements;
    });
  };

  // Recalculate all FB charges whenever global charges or any settlement data changes
  useEffect(() => {
    const totalFbChg = parseFloat(globalSettlementData.totalFbCharges) || 0;
    const totalRemAmount =
      totalRemittanceAmount > 0 ? totalRemittanceAmount : 1; // Avoid division by zero

    setSettlements((prevSettlements) => {
      return prevSettlements.map((settlement) => {
        const settlementCredit = parseFloat(settlement.creditAmount) || 0;
        // Calculate FB charges allocated to this settlement
        const settlementFbChargeTotal =
          (settlementCredit / totalRemAmount) * totalFbChg;

        const settlementTotalUtilized = settlement.linkedInvoices.reduce(
          (sum, inv) => sum + inv.remittanceUtilized,
          0,
        );
        const safeSettlementTotalUtilized =
          settlementTotalUtilized > 0 ? settlementTotalUtilized : 1; // Avoid division by zero

        const updatedLinkedInvoices = settlement.linkedInvoices.map((inv) => ({
          ...inv,
          // Distribute this settlement's FB charges among its linked invoices
          fbCharges:
            (inv.remittanceUtilized / safeSettlementTotalUtilized) *
            settlementFbChargeTotal,
        }));

        return { ...settlement, linkedInvoices: updatedLinkedInvoices };
      });
    });
  }, [globalSettlementData.totalFbCharges, settlements, totalRemittanceAmount]); // Rerun when global charges or any settlement data changes

  const handleSubmit = (e) => {
    e.preventDefault();

    // --- Validation ---
    // 1. Overall Balance Check
    if (Math.abs(overallBalanceAmount) > 0.01) {
      alert(
        `Overall Balance Amount (${formatCurrency(overallBalanceAmount, remittance.currency)}) must be zero.`,
      );
      return;
    }

    // 2. Individual Settlement Available Amount Check
    for (let i = 0; i < settlements.length; i++) {
      const settlement = settlements[i];
      const creditAmount = parseFloat(settlement.creditAmount) || 0;
      const utilizedAmount = settlement.linkedInvoices.reduce(
        (sum, inv) => sum + (parseFloat(inv.remittanceUtilized) || 0),
        0,
      );
      const available = creditAmount - utilizedAmount;
      if (Math.abs(available) > 0.01) {
        alert(
          `Available for Mapping in Settlement ${i + 1} (${formatCurrency(available, remittance.currency)}) must be zero.`,
        );
        return;
      }
      // 3. Check for null convRate if currencies differ
      for (const inv of settlement.linkedInvoices) {
        if (remittance.currency !== inv.currency && inv.convRate === null) {
          alert(
            `Conversion Rate is required for Invoice ${inv.invoiceno} in Settlement ${i + 1} as currencies differ.`,
          );
          return;
        }
      }
    }

    // If all validations pass
    onSubmit(globalSettlementData, settlements); // Pass global data and settlements array up
  };

  // Calculate totals for the footer row of the *active* settlement tab
  const activeTotals = useMemo(() => {
    const activeLinked =
      settlements[activeSettlementIndex]?.linkedInvoices || [];
    return activeLinked.reduce(
      (acc, inv) => {
        acc.remittanceUtilized += parseFloat(inv.remittanceUtilized) || 0;
        acc.invoiceRealized += parseFloat(inv.invoiceRealized) || 0;
        acc.fbCharges += parseFloat(inv.fbCharges) || 0;
        return acc;
      },
      { remittanceUtilized: 0, invoiceRealized: 0, fbCharges: 0 },
    );
  }, [settlements, activeSettlementIndex]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto border w-full max-w-5xl shadow-lg rounded-xl bg-white">
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              &times;
            </button>
            <h3 className="text-xl leading-6 font-bold text-gray-900 mb-4">
              Settle Outstanding Remittance
            </h3>

            {/* Top Summary Bar - UPDATED */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6 flex justify-between items-center text-sm gap-4">
              <div className="flex-1">
                <span className="text-gray-600">Total Remittance Amount</span>
                <p className="font-bold text-lg text-blue-800">
                  {formatCurrency(totalRemittanceAmount, remittance.currency)}
                </p>
              </div>
              <div className="flex-1">
                <label
                  htmlFor="totalFbCharges"
                  className="text-gray-600 block mb-1"
                >
                  Total FB Charges
                </label>
                <input
                  type="number"
                  id="totalFbCharges"
                  name="totalFbCharges"
                  value={globalSettlementData.totalFbCharges}
                  onChange={handleGlobalInputChange}
                  className="w-full p-2 border rounded-md text-lg font-bold"
                  step="0.01"
                />
              </div>
              <div className="flex-1 text-right">
                <span className="text-gray-600">Overall Balance Amount</span>
                <p
                  className={`font-bold text-lg ${Math.abs(overallBalanceAmount) < 0.01 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(overallBalanceAmount, remittance.currency)}
                </p>
              </div>
            </div>

            {/* --- Settlement Tabs --- */}
            <div className="mb-4 flex items-center gap-2 border-b">
              {settlements.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => setActiveSettlementIndex(index)}
                  className={`py-2 px-3 text-sm font-medium border-b-2 ${activeSettlementIndex === index ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                  Settlement {index + 1}
                </button>
              ))}
              {/* Add Settlement Button */}
              {overallBalanceAmount > 0.01 && ( // Show only if there's a balance
                <button
                  type="button"
                  onClick={addSettlementTab}
                  className="ml-2 text-blue-600 hover:text-blue-800 text-xl font-bold"
                  title="Add Settlement"
                >
                  +
                </button>
              )}
            </div>

            {/* --- Content for Active Settlement Tab --- */}
            {settlements.map((settlement, index) => (
              <div
                key={index}
                className={activeSettlementIndex === index ? "block" : "hidden"}
              >
                {/* Settlement & Purpose Details Form */}
                <div className="border rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3 text-base">
                    Settlement & Purpose Details (Settlement {index + 1})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label
                        htmlFor={`creditAccount-${index}`}
                        className="block font-medium mb-1"
                      >
                        Credit Account
                      </label>
                      <select
                        id={`creditAccount-${index}`}
                        name="creditAccount"
                        value={settlement.creditAccount}
                        onChange={(e) => handleSettlementInputChange(index, e)}
                        className="w-full p-2 border rounded-md bg-white"
                      >
                        <option>ICICI Bank - 1234567890 (INR)</option>
                        <option>HDFC Bank - 0987654321 (INR)</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor={`creditAmount-${index}`}
                        className="block font-medium mb-1"
                      >
                        Credit Amount ({remittance.currency})
                      </label>
                      <input
                        type="number"
                        id={`creditAmount-${index}`}
                        name="creditAmount"
                        value={settlement.creditAmount}
                        onChange={(e) => handleSettlementInputChange(index, e)}
                        className="w-full p-2 border rounded-md"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`purposeCode-${index}`}
                        className="block font-medium mb-1"
                      >
                        Purpose Code
                      </label>
                      <select
                        id={`purposeCode-${index}`}
                        name="purposeCode"
                        value={settlement.purposeCode}
                        onChange={(e) => handleSettlementInputChange(index, e)}
                        className="w-full p-2 border rounded-md bg-white"
                      >
                        {Object.entries(purposeCodes).map(([code, desc]) => (
                          <option key={code} value={code}>
                            {code} - {desc}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor={`purposeDescription-${index}`}
                        className="block font-medium mb-1"
                      >
                        Purpose Description
                      </label>
                      <input
                        type="text"
                        id={`purposeDescription-${index}`}
                        name="purposeDescription"
                        value={settlement.purposeDescription}
                        readOnly
                        className="w-full p-2 border rounded-md bg-gray-100"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`dealType-${index}`}
                        className="block font-medium mb-1"
                      >
                        Deal Type
                      </label>
                      <select
                        id={`dealType-${index}`}
                        name="dealType"
                        value={settlement.dealType}
                        onChange={(e) => handleSettlementInputChange(index, e)}
                        className="w-full p-2 border rounded-md bg-white"
                      >
                        <option>Bank</option>
                        <option>Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium mb-1">
                        Attachment
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="file"
                          id={`attachmentFile-${index}`}
                          className="hidden"
                          onChange={(e) => handleSettlementFileChange(index, e)}
                        />
                        <label
                          htmlFor={`attachmentFile-${index}`}
                          className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded-md cursor-pointer"
                        >
                          Upload
                        </label>
                        <button
                          type="button"
                          onClick={() => alert("View Attachment clicked")}
                          className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded-md"
                        >
                          View
                        </button>
                        {settlement.attachment && (
                          <span className="text-xs text-gray-500 truncate">
                            {settlement.attachment.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linked Invoice Details - UPDATED */}
                <div className="border rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-800 text-base">
                      Linked Invoice Details
                    </h4>
                    <span className="text-sm">
                      Available for Mapping:{" "}
                      <span
                        className={`font-semibold ${Math.abs(currentSettlementAvailableForMapping) < 0.01 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(
                          currentSettlementAvailableForMapping,
                          remittance.currency,
                        )}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={onOpenFetchInvoiceModal}
                      className="text-sm bg-blue-100 text-blue-700 py-1 px-3 rounded-md hover:bg-blue-200"
                    >
                      Fetch Available Invoices
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">
                            Invoice Details
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Shipping Bill
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Invoice Value
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Remittance Utilized
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Conv. Rate
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Invoice Realized
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            FB Charges
                          </th>
                          <th className="px-3 py-2 text-center font-medium">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {settlement.linkedInvoices.length > 0 ? (
                          settlement.linkedInvoices.map((inv, invIndex) => (
                            <tr key={inv.id}>
                              <td className="px-3 py-2">
                                <div>{inv.invoiceno}</div>
                                <div className="text-gray-500">
                                  {inv.invoicedate}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div>{inv.shippingBillNo}</div>
                                <div className="text-gray-500">
                                  {inv.shippingBillDate}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(inv.invoiceValue, inv.currency)}
                              </td>
                              <td className="px-3 py-2 text-right w-32">
                                <input
                                  type="number"
                                  value={inv.remittanceUtilized}
                                  onChange={(e) =>
                                    handleLinkedInvoiceChange(
                                      index,
                                      invIndex,
                                      "remittanceUtilized",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full p-1 border rounded-md text-right text-xs"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-3 py-2 text-right w-24">
                                <input
                                  type="number"
                                  value={
                                    inv.convRate === null ? "" : inv.convRate
                                  }
                                  onChange={(e) =>
                                    handleLinkedInvoiceChange(
                                      index,
                                      invIndex,
                                      "convRate",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full p-1 border rounded-md text-right text-xs"
                                  step="0.0001"
                                  placeholder={
                                    remittance.currency === inv.currency
                                      ? "1.00"
                                      : "Enter Rate"
                                  }
                                  disabled={
                                    remittance.currency === inv.currency
                                  } // Disable if same currency
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(
                                  inv.invoiceRealized,
                                  inv.currency,
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(
                                  inv.fbCharges,
                                  remittance.currency,
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveLinkedInvoice(index, invIndex)
                                  }
                                  className="text-red-500 hover:text-red-700"
                                >
                                  &#x1F5D1; {/* Trash can icon */}
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={8}
                              className="text-center py-4 text-gray-400"
                            >
                              No invoices linked yet for this settlement.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {/* Total Row for active tab */}
                      {settlement.linkedInvoices.length > 1 && (
                        <tfoot>
                          <tr className="bg-gray-100 font-semibold">
                            <td colSpan={3} className="px-3 py-2 text-right">
                              Settlement Total:
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(
                                activeTotals.remittanceUtilized,
                                remittance.currency,
                              )}
                            </td>
                            <td className="px-3 py-2"></td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(
                                activeTotals.invoiceRealized,
                                remittance.currency,
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(
                                activeTotals.fbCharges,
                                remittance.currency,
                              )}
                            </td>
                            <td className="px-3 py-2"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <div>
                <label htmlFor="checker" className="text-sm font-medium mr-2">
                  Checker
                </label>
                <select
                  id="checker"
                  name="checker"
                  value={globalSettlementData.checker}
                  onChange={handleGlobalInputChange}
                  className="p-2 border rounded-md bg-white text-sm"
                >
                  <option>No Checker</option>
                  <option>Checker 1</option>
                </select>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium"
                >
                  Submit Settlement
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- NEW: FETCH SETTLED REMITTANCES MODAL ---
// This is the modal that pops up when clicking "Map Available Remittances"
const FetchSettledRemittancesModal = ({
  customerName,
  customerCode,
  remittances,
  selectedRemittances,
  onSelectionChange,
  onClose,
  onProceed,
  formatCurrency,
}) => {
  const [customerFilter, setCustomerFilter] = useState(
    customerCode || customerName,
  );

  // Select/Deselect All Logic
  const handleSelectAll = (e) => {
    const isChecked = e.target.checked;
    const newSelection = {};
    if (isChecked) {
      remittances.forEach((rem) => {
        newSelection[rem.irmRef] = true;
      });
    }
    // This modal is simple: just update its internal selection state
    // The parent handler `handleSettledRemSelectionChange` expects *one key*
    // So we need a different approach. Let's call the handler for each item.
    // This is inefficient. Let's modify the handler.
    // --- Re-thinking this. The parent component owns the selection state.
    // --- It's better to have a single handler in the parent.
    // --- I will modify the `onSelectionChange` call to pass a *new object*

    const allKeys = {};
    if (isChecked) {
      remittances.forEach((rem) => {
        allKeys[rem.irmRef] = true;
      });
    }
    onSelectionChange(allKeys); // Pass the new selection object
  };

  // Check if all items are selected
  const allSelected =
    remittances.length > 0 &&
    remittances.every((rem) => selectedRemittances[rem.irmRef]);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 z-[60] flex items-center justify-center p-4">
      <div className="relative mx-auto border w-full max-w-5xl shadow-lg rounded-xl bg-white">
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            &times;
          </button>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Fetch Available Remittances
          </h3>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-1">
              <label
                htmlFor="custFilter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Customer Name/Code
              </label>
              <input
                type="text"
                id="custFilter"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="flex gap-4 items-center pt-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" /> Cross Currency
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" /> Third Party
              </label>
            </div>
            <div className="text-right">
              <button
                type="button"
                className="bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium"
              >
                Fetch Details
              </button>
            </div>
          </div>

          {/* Remittance Table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={allSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Settlement Details (IRM)
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Remittance Details (Parent)
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Remitter</th>
                  <th className="px-3 py-2 text-left font-medium">Purpose</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Available Amt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {remittances.length > 0 ? (
                  remittances.map((irm) => (
                    <tr key={irm.irmRef} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={!!selectedRemittances[irm.irmRef]}
                          onChange={() => onSelectionChange(irm.irmRef)} // Parent handles single toggle
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div>{irm.irmRef}</div>
                        <div className="text-gray-500">{irm.irmDate}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div>{irm.parentRemRef}</div>
                        <div className="text-gray-500">{irm.parentRemDate}</div>
                        <div className="text-gray-500">
                          Ins:{" "}
                          {formatCurrency(irm.parentInstructed, irm.currency)} |
                          Chg: {formatCurrency(irm.parentCharges, irm.currency)}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div>{irm.parentRemitterName}</div>
                        <div className="text-gray-500">
                          {irm.parentBuyerCode}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {irm.purposeDesc || irm.purposeCode}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatCurrency(irm.outstandingAmt, irm.currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
                      No available settled remittances found for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              typeD="button"
              onClick={onProceed}
              className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium"
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- HELPER COMPONENTS (DatePicker, DocumentUploader, GenericDetailTable) ---
const DatePicker = ({ selectedDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Ensure displayDate is initialized correctly, handling potential invalid date strings
  const initialDate = selectedDate
    ? new Date(selectedDate.split("-").reverse().join("-"))
    : new Date();
  const [displayDate, setDisplayDate] = useState(
    isNaN(initialDate?.getTime()) ? new Date() : initialDate,
  );

  const datePickerRef = useRef(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [datePickerRef]);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handleDateSelect = (day) => {
    const newDate = new Date(
      displayDate.getFullYear(),
      displayDate.getMonth(),
      day,
    );
    if (!isNaN(newDate.getTime())) {
      // Check if the date is valid before updating
      onChange(newDate.toLocaleDateString("en-GB").replace(/\//g, "-"));
      setIsOpen(false);
    }
  };

  const renderCalendar = () => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const numDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: numDays }, (_, i) => i + 1);

    return (
      <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 p-2 w-72">
        <div className="flex justify-between items-center mb-2">
          <button
            type="button"
            onClick={() => setDisplayDate(new Date(year, month - 1))}
            className="px-2 py-1 rounded hover:bg-gray-100"
          >
            &lt;
          </button>
          <span className="font-semibold">
            {displayDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() => setDisplayDate(new Date(year, month + 1))}
            className="px-2 py-1 rounded hover:bg-gray-100"
          >
            &gt;
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-gray-500">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={`day-label-${d}-${i}`}>{d}</div>
          ))}{" "}
          {/* Fixed Key */}
        </div>
        <div className="grid grid-cols-7 text-center text-sm mt-1">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`}></div>
          ))}
          {days.map((day) => {
            const date = new Date(year, month, day);
            const isDisabled = date > today;
            const formattedDate = date
              .toLocaleDateString("en-GB")
              .replace(/\//g, "-"); // Format for comparison
            return (
              <button
                type="button"
                key={day}
                onClick={() => !isDisabled && handleDateSelect(day)}
                className={`p-1 rounded-full w-8 h-8 flex items-center justify-center 
                                ${isDisabled ? "text-gray-300 cursor-not-allowed" : "hover:bg-blue-100"} 
                                ${selectedDate === formattedDate ? "bg-blue-500 text-white" : ""}`} // Compare formatted date
                disabled={isDisabled}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={datePickerRef}>
      <input
        type="text"
        value={selectedDate || ""}
        readOnly
        onClick={() => setIsOpen(!isOpen)}
        className="mt-1 p-2 w-full border rounded-md cursor-pointer"
        placeholder="dd-mm-yyyy"
      />
      {isOpen && renderCalendar()}
    </div>
  );
};

const DocumentUploader = ({
  docType,
  invoiceIndex,
  onFileChange,
  files = [],
  label,
  onViewFile,
}) => {
  const fileInputRef = useRef(null);
  return (
    <div>
      <label className="block font-medium text-gray-600 mb-1">
        {label} ({files.length})
      </label>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => onFileChange(e, invoiceIndex, docType)}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current.click()}
        className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded-md"
      >
        Attach Files
      </button>
      <div className="mt-2 space-y-1 text-xs">
        {files.map((file, i) => (
          // Use onViewFile if provided, otherwise default behavior
          <a
            key={i}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onViewFile
                ? onViewFile(file.name)
                : alert(`Viewing ${file.name}`);
            }}
            className="block text-blue-600 truncate hover:underline"
          >
            {file.name}
          </a>
        ))}
      </div>
    </div>
  );
};

// New component for PO/SO/etc. tabs
const GenericDetailTable = ({ title, data, fields, remarks }) => {
  // Helper to format field names (e.g., "poNumber" -> "PO Number")
  const formatHeader = (field) => {
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div>
      <h5 className="font-semibold mb-3 text-base">{title}</h5>
      <div className="overflow-x-auto mb-6 border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {fields.map((field) => (
                <th key={field} className="px-4 py-2 text-left font-medium">
                  {formatHeader(field)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data && data.length > 0 ? (
              data.map((item, index) => (
                <tr key={index}>
                  {fields.map((field) => (
                    <td key={field} className="px-4 py-2">
                      {item[field] || "-"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={fields.length}
                  className="text-center py-4 text-gray-500"
                >
                  No {title} available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div>
        <h6 className="font-semibold text-sm mb-1">Remarks</h6>
        <p className="text-sm text-gray-700 p-3 border rounded-lg bg-gray-50 min-h-[50px]">
          {remarks || "N/A"}
        </p>
      </div>
    </div>
  );
};
