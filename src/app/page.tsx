"use client";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ErrorBoundary from "@/components/ErrorBoundary";

// We're using a mock PapaParse here since we can't import external libraries
const Papa = {
  parse: (csv: string) => {
    const lines = csv.split("\n");
    const headers = lines[0].split(",");
    const data = lines.slice(1).map((line) => line.split(","));
    return { data, headers };
  },
  unparse: (data: any, config?: { quotes: boolean; quoteChar: string }) => {
    return data.map((row: string[]) => 
      row.map(cell => {
        // If the cell contains a comma or the quotes option is true, wrap it in quotes
        if (config?.quotes || cell.includes(',')) {
          const quoteChar = config?.quoteChar || '"';
          // Escape any existing quotes in the cell
          const escapedCell = cell.replace(new RegExp(quoteChar, 'g'), quoteChar + quoteChar);
          return `${quoteChar}${escapedCell}${quoteChar}`;
        }
        return cell;
      }).join(',')
    ).join('\n');
  },
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export default function Component() {
  const [csvContent, setCsvContent] = useState<string>("");
  const [processedData, setProcessedData] = useState<string[][]>([]);
  const [bcc, setBcc] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [sendAs, setSendAs] = useState<string>("");
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);
  const [emailError, setEmailError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileError, setFileError] = useState<string>('');
  const [processError, setProcessError] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string>('');
  const [attachment, setAttachment] = useState<string>("");

  const sanitizeCSVContent = (content: string): string => {
    // Remove any potential harmful characters or formula injections
    return content.replace(/^[=+\-@\t\r]/g, '');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setFileError('');
      const file = event.target.files?.[0];
      
      if (!file) {
        setFileError('No file selected');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setFileError('File is too large (max 5MB)');
        return;
      }

      if (!file.name.toLowerCase().endsWith('.csv')) {
        setFileError('Only CSV files are allowed');
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => {
        setFileError('Failed to read file');
      };
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          if (!content) {
            throw new Error('Empty file content');
          }
          setCsvContent(sanitizeCSVContent(content));
        } catch (error) {
          setFileError(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      reader.readAsText(file);
    } catch (error) {
      setFileError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const processCSV = async () => {
    if (isProcessing) return;
    
    try {
      setProcessError('');
      setIsProcessing(true);

      if (!csvContent) {
        throw new Error('No CSV content to process');
      }

      // Validate required fields
      if (!sendAs && !validateEmail(sendAs)) {
        throw new Error('Invalid "Send As" email address');
      }

      if (bcc && !validateEmail(bcc)) {
        throw new Error('Invalid BCC email address');
      }

      // Your existing processing logic
      const { data, headers } = Papa.parse(csvContent);
      
      // Validate CSV structure
      if (!Array.isArray(headers) || !Array.isArray(data)) {
        throw new Error('Invalid CSV structure');
      }

      const uniqueEmails = new Map();
      
      const accountNameIndex = headers.findIndex((h) => h === "Account Name");
      const firstNameIndex = headers.findIndex((h) => h === "First Name");
      const lastNameIndex = headers.findIndex((h) => h === "Last Name");
      const emailIndex = headers.findIndex((h) => h === "Email");

      console.log("1. Starting processing");
      
      // First, group rows by account name to check spouse pairs
      const accountGroups = new Map();
      data.forEach((row: string[]) => {
        const accountName = ((row[accountNameIndex] || "") as string)
          .replace(/\s*household\s*/gi, "")
          .trim();
        
        if (!accountGroups.has(accountName)) {
          accountGroups.set(accountName, []);
        }
        accountGroups.get(accountName).push(row);
      });

      // Log the groups to verify
      console.log("Account Groups:", Object.fromEntries(accountGroups));

      const processedRows = data.filter((row: string[], index: number) => {
        if (!Array.isArray(row) || row.length <= emailIndex) {
          return false;
        }
        
        const email = ((row[emailIndex] || "") as string).trim();
        const accountName = ((row[accountNameIndex] || "") as string)
          .replace(/\s*household\s*/gi, "")
          .trim();
        const firstName = ((row[firstNameIndex] || "") as string).toLowerCase();
        
        // If it's a child (first name not in account name) with blank email, skip this row
        if (email === "" && !accountName.toLowerCase().includes(firstName)) {
          return false;
        }

        // For joint accounts
        if (accountName.includes("&")) {
          const accountRows = accountGroups.get(accountName) || [];
          const allEmailsBlank = accountRows.every((r: string[]) => 
            ((r[emailIndex] || "") as string).trim() === ""
          );
          const someEmailsPresent = accountRows.some((r: string[]) => 
            ((r[emailIndex] || "") as string).trim() !== ""
          );
          
          // If all emails are blank, keep this row
          if (allEmailsBlank) {
            return true;
          }
          
          // If some emails are present and this row has no email, filter it out
          if (someEmailsPresent && email === "") {
            return false;
          }
          
          // Keep rows with emails
          return email !== "";
        }
        
        // Keep single person accounts and rows with emails
        return true;
      });

      console.log("2. After filtering");

      // 2. Sort by the 'account name' column
      processedRows.sort((a: string[], b: string[]) => {
        const nameA = ((a[accountNameIndex] || "") as string).toLowerCase();
        const nameB = ((b[accountNameIndex] || "") as string).toLowerCase();
        return nameA.localeCompare(nameB);
      });

      console.log("3. After first sort");

      // 3. Sort children with emails to the bottom
      const sortedRows = processedRows.sort((a: string[], b: string[]) => {
        const aAccountName = ((a[accountNameIndex] || "") as string).toLowerCase();
        const aFirstName = ((a[firstNameIndex] || "") as string).toLowerCase();
        const aEmail = ((a[emailIndex] || "") as string).trim();
        
        const bAccountName = ((b[accountNameIndex] || "") as string).toLowerCase();
        const bFirstName = ((b[firstNameIndex] || "") as string).toLowerCase();
        const bEmail = ((b[emailIndex] || "") as string).trim();

        const aIsChildWithEmail = !aAccountName.includes(aFirstName) && aEmail !== "";
        const bIsChildWithEmail = !bAccountName.includes(bFirstName) && bEmail !== "";

        if (aIsChildWithEmail && !bIsChildWithEmail) return 1;  // Move a to bottom
        if (!aIsChildWithEmail && bIsChildWithEmail) return -1; // Move b to bottom
        return 0;
      });

      console.log("4. After second sort");

      const combinedRows = new Map();

      // First, collect and merge emails for each original account name
      sortedRows.forEach((row: string[]) => {
        const originalAccountName = ((row[accountNameIndex] || "") as string)
          .replace(/\s*household\s*/gi, "")
          .trim();

        const firstName = (row[firstNameIndex] || "").trim();
        const lastName = (row[lastNameIndex] || "").trim();
        const email = (row[emailIndex] || "").trim();

        // Check if this is a child with email
        const isChildWithEmail = !originalAccountName.toLowerCase().includes(firstName.toLowerCase()) && email !== "";
        
        // If it's a child with email, check if the email is already in use
        if (isChildWithEmail) {
          // Check if this email already exists in any parent row
          const emailExists = Array.from(combinedRows.values()).some(existingEmail => 
            existingEmail.split(';').includes(email)
          );
          
          // Only add child row if email is unique
          if (!emailExists) {
            const displayName = `${firstName} ${lastName}`;
            combinedRows.set(displayName, email);
          }
          return;
        }

        // For accounts where both spouses have blank emails, combine their first names
        if ((originalAccountName.includes("&")) && email === "") {
          const accountRows = accountGroups.get(originalAccountName) || [];
          const allEmailsBlank = accountRows.every((r: string[]) => 
            ((r[emailIndex] || "") as string).trim() === ""
          );
          
          if (allEmailsBlank && accountRows.length > 1) {
            const firstNames = accountRows
              .map((r: string[]) => (r[firstNameIndex] || "").trim())
              .filter((name: string) => name)
              .join(" and ");
            const displayName = `${firstNames} ${lastName}`;
            
            if (!combinedRows.has(displayName)) {
              combinedRows.set(displayName, "");
            }
            return;
          }
        }

        const displayName = email === "" 
          ? `${firstName} ${lastName}`.trim()
          : originalAccountName;

        if (displayName) {
          if (combinedRows.has(displayName)) {
            const existingEmails = combinedRows.get(displayName) || "";
            if (email && !existingEmails.includes(email)) {
              combinedRows.set(
                displayName,
                existingEmails ? `${existingEmails};${email}` : email
              );
            }
          } else {
            combinedRows.set(displayName, email);
          }
        }
      });

      console.log("7. After forEach");

      // Then, modify the account names while preserving uniqueness
      const finalCombinedRows = new Map<string, string>();
      const nameCountMap = new Map<string, number>();

      combinedRows.forEach((emails: string, originalAccountName: string) => {
        const nameParts = originalAccountName.split(" ");
        let accountName;

        // Check if this is a child with email
        const isChildWithEmail = !data.some(row => 
          ((row[accountNameIndex] || "") as string).toLowerCase().includes(nameParts[0].toLowerCase())
        ) && emails !== "";

        // Keep full name for children with emails, blank emails, or single-word names
        if (isChildWithEmail || emails === "" || nameParts.length === 1) {
          accountName = originalAccountName;
        } else {
          // Remove last name only for parents/accounts with emails
          accountName = nameParts.slice(0, -1).join(" ");
        }

        // Replace any remaining "&" with "and"
        accountName = accountName.replace(/\s*&\s*/g, " and ");

        // Use a case-sensitive key for the Map
        const caseSensitiveKey = `${accountName}\0${accountName.toLowerCase()}`;

        // Check if this name has been used before
        if (nameCountMap.has(caseSensitiveKey)) {
          const count = nameCountMap.get(caseSensitiveKey)! + 1;
          nameCountMap.set(caseSensitiveKey, count);
          // Use numbered key internally to maintain uniqueness in the Map
          const internalKey = `${accountName} (${count})`;
          // Store with the non-numbered display name
          finalCombinedRows.set(internalKey, emails);
        } else {
          nameCountMap.set(caseSensitiveKey, 1);
          finalCombinedRows.set(accountName, emails);
        }
      });

      // Log the final combined rows map
      console.log("Final Combined Rows Map:", Array.from(finalCombinedRows.entries()));

      // 5. Convert to array and sort blank emails to the bottom, and children with emails after that
      const sortedData = Array.from(finalCombinedRows.entries()).sort(
        ([nameA, emailA], [nameB, emailB]) => {
          const isChildA = !data.some(row => 
            ((row[accountNameIndex] || "") as string).toLowerCase().includes(nameA.split(" ")[0].toLowerCase())
          );
          const isChildB = !data.some(row => 
            ((row[accountNameIndex] || "") as string).toLowerCase().includes(nameB.split(" ")[0].toLowerCase())
          );

          // If one is a child and one isn't, sort children to the bottom
          if (isChildA !== isChildB) {
            return isChildA ? 1 : -1;
          }
          
          // If neither is a child, sort blank emails to the bottom
          if (!isChildA && !isChildB) {
            if (emailA === "" && emailB !== "") return 1;
            if (emailA !== "" && emailB === "") return -1;
          }
          
          return 0;
        }
      );

      const finalData = [
        ["Known As", "To", "BCC", "Subject", "Send As", "Attachment1"],
        ...sortedData.map(([accountName, email]) => [
          accountName.replace(/\s*\(\d+\)$/, ''), // Remove the (number) from display
          email,
          bcc,
          subject,
          sendAs,
          attachment,
        ]),
      ];
      setProcessedData(finalData);
    } catch (error) {
      setProcessError(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProcessedData([]); // Clear any partial results
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCSV = () => {
    try {
      setDownloadError('');
      
      if (processedData.length === 0) {
        throw new Error('No data to download');
      }

      const csvContent = Papa.unparse(processedData, {
        quotes: true,  // Force quotes around all fields
        quoteChar: '"'
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      if (!downloadLinkRef.current) {
        throw new Error('Download link not available');
      }

      downloadLinkRef.current.href = url;
      downloadLinkRef.current.download = "processed_data.csv";
      downloadLinkRef.current.click();

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      setDownloadError(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email === '' || email.split(';').every(e => emailRegex.test(e.trim()));
  };

  const getErrorHelp = (error: string): string => {
    if (error.includes('file size')) {
      return 'Try splitting your data into smaller files';
    }
    if (error.includes('Invalid CSV')) {
      return 'Please ensure your CSV file is properly formatted';
    }
    if (error.includes('email')) {
      return 'Check that all email addresses are in the correct format';
    }
    return 'If the problem persists, please contact support';
  };

  useEffect(() => {
    return () => {
      setCsvContent('');
      setProcessedData([]);
      setBcc('');
      setSubject('');
      setSendAs('');
      setAttachment('');
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="mt-8 mb-16">
        <Card className="w-full max-w-2xl mx-auto relative">
          <div className="absolute top-0 right-3">
            <img 
              src="/images/hope-international-logo.png" 
              alt="HOPE International Logo" 
              className="w-40 h-auto"
            />
          </div>
          <CardHeader>
            <CardTitle>CSV Processor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="csv-upload">Upload CSV File</Label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
              />
              {fileError && (
                <div className="text-red-500 text-sm mt-1">
                  <p>{fileError}</p>
                  <p className="text-sm mt-1">{getErrorHelp(fileError)}</p>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="sendAs">Send As</Label>
              <Input
                id="sendAs"
                type="email"
                placeholder="Enter Send As email"
                value={sendAs}
                onChange={(e) => {
                  setSendAs(e.target.value);
                  if (!validateEmail(e.target.value)) {
                    setEmailError('Please enter valid email address(es)');
                  } else {
                    setEmailError('');
                  }
                }}
              />
              {emailError && <p className="text-red-500">{emailError}</p>}
            </div>
            <div>
              <Label htmlFor="bcc">BCC</Label>
              <Input
                id="bcc"
                type="email"
                placeholder="Enter BCC email"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                type="text"
                placeholder="Enter email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="attachment">Attachment</Label>
                <div className="relative group">
                  <span className="cursor-help text-gray-500 hover:text-gray-700">
                    (?)</span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-white border border-gray-200 rounded-lg p-3 shadow-lg w-64 z-50">
                    <p className="font-semibold mb-1">How to get a file path:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                      <li>Hold Shift and right-click on your file</li>
                      <li>Select "Copy as path"</li>
                      <li>Paste the path here</li>
                    </ol>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-gray-200"></div>
                  </div>
                </div>
              </div>
              <Input
                id="attachment"
                type="text"
                placeholder="Enter File Path or leave blank if not applicable"
                value={attachment}
                onChange={(e) => setAttachment(e.target.value)}
              />
            </div>
            <Button 
              onClick={processCSV} 
              disabled={isProcessing || !csvContent}
              className="w-full"
            >
              {isProcessing ? 'Processing...' : 'Process CSV'}
            </Button>
            {processError && (
              <p className="text-red-500 text-sm mt-1">{processError}</p>
            )}
            <div>
              <Label htmlFor="processed-data">Processed CSV Data</Label>
              <div
                id="processed-data"
                className="border rounded-md overflow-auto max-h-[400px]"
              >
                {processedData.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {processedData[0]?.map((header, index) => (
                          <TableHead
                            key={index}
                            className="px-4 py-2 bg-muted sticky top-0"
                          >
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.slice(1).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell
                              key={cellIndex}
                              className="px-4 py-2 whitespace-nowrap"
                            >
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              onClick={downloadCSV}
              className="w-full"
              disabled={processedData.length === 0}
            >
              Download Processed CSV
            </Button>
            {downloadError && (
              <p className="text-red-500 text-sm mt-1">{downloadError}</p>
            )}
            <a ref={downloadLinkRef} className="sr-only">
              Download CSV
            </a>
          </CardFooter>
        </Card>
        {processedData.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            CSV processing complete. You can now download the processed file.
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
