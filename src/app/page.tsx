"use client";
import React, { useState, useRef } from "react";
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

// We're using a mock PapaParse here since we can't import external libraries
const Papa = {
  parse: (csv: string) => {
    const lines = csv.split("\n");
    const headers = lines[0].split(",");
    const data = lines.slice(1).map((line) => line.split(","));
    return { data, headers };
  },
  unparse: (data: any) => {
    return data.map((row: string[]) => row.join(",")).join("\n");
  },
};

export default function Component() {
  const [csvContent, setCsvContent] = useState<string>("");
  const [processedData, setProcessedData] = useState<string[][]>([]);
  const [bcc, setBcc] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [sendAs, setSendAs] = useState<string>("");
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvContent(content);
      };
      reader.readAsText(file);
    }
  };

  const processCSV = () => {
    try {
      const { data, headers } = Papa.parse(csvContent);
      console.log("Parsed CSV data:", data);
      console.log("CSV headers:", headers);

      if (!Array.isArray(headers) || !Array.isArray(data)) {
        throw new Error("Invalid CSV structure");
      }

      const accountNameIndex = headers.findIndex((h) => h === "Account Name");
      const firstNameIndex = headers.findIndex((h) => h === "First Name");
      const lastNameIndex = headers.findIndex((h) => h === "Last Name");
      const emailIndex = headers.findIndex((h) => h === "Email");

      console.log("Column indices:", { accountNameIndex, firstNameIndex, lastNameIndex, emailIndex });

      if (accountNameIndex === -1 || firstNameIndex === -1 || lastNameIndex === -1 || emailIndex === -1) {
        throw new Error('CSV must contain "Account Name", "First Name", "Last Name", and "Email" columns');
      }

      // 1. Filter out duplicate emails (keeping blank emails)
      const uniqueEmails = new Map();
      const processedRows = data.filter((row: string[], index: number) => {
        if (!Array.isArray(row) || row.length <= emailIndex) {
          console.warn(`Skipping invalid row at index ${index}:`, row);
          return false;
        }
        
        // Safely access the email, providing a default empty string if undefined
        const email = ((row[emailIndex] || "") as string).trim();
        
        if (email === "") return true; // Keep blank emails
        if (uniqueEmails.has(email)) return false;
        uniqueEmails.set(email, row);
        return true;
      });

      console.log("Processed rows after filtering:", processedRows);

      // 2. Sort by the 'account name' column
      processedRows.sort((a: string[], b: string[]) => {
        const nameA = ((a[accountNameIndex] || "") as string).toLowerCase();
        const nameB = ((b[accountNameIndex] || "") as string).toLowerCase();
        return nameA.localeCompare(nameB);
      });

      // 3. Delete children rows
      const filteredRows = processedRows.filter((row: string[]) => {
        const accountName = ((row[accountNameIndex] || "") as string).toLowerCase();
        const firstName = ((row[firstNameIndex] || "") as string).toLowerCase();
        return accountName.includes(firstName);
      });

      const combinedRows = new Map();

      // First, collect and merge emails for each original account name
      filteredRows.forEach((row: string[]) => {
        const originalAccountName = ((row[accountNameIndex] || "") as string)
          .replace(/&/g, "and")
          .replace(/household/gi, "")
          .trim();

        const email = ((row[emailIndex] || "") as string).trim();

        if (originalAccountName) {
          if (combinedRows.has(originalAccountName)) {
            const existingEmails = combinedRows.get(originalAccountName) || "";
            if (email && !existingEmails.includes(email)) {
              combinedRows.set(
                originalAccountName,
                existingEmails ? `${existingEmails};${email}` : email
              );
            }
          } else {
            combinedRows.set(originalAccountName, email);
          }
        }
      });

      // Then, modify the account names while preserving uniqueness
      const finalCombinedRows = new Map<string, string>();
      const nameCountMap = new Map<string, number>();

      combinedRows.forEach((emails, originalAccountName) => {
        const nameParts = originalAccountName.split(" ");
        let accountName;

        if (nameParts.length > 1) {
          // Remove the last word entirely
          accountName = nameParts.slice(0, -1).join(" ");
        } else {
          // If there's only one word, keep it as is
          accountName = originalAccountName;
        }

        // Use a case-sensitive key for the Map
        const caseSensitiveKey = `${accountName}\0${accountName.toLowerCase()}`;

        // Check if this name has been used before
        if (nameCountMap.has(caseSensitiveKey)) {
          const count = nameCountMap.get(caseSensitiveKey)! + 1;
          nameCountMap.set(caseSensitiveKey, count);
          accountName = `${accountName} (${count})`;
        } else {
          nameCountMap.set(caseSensitiveKey, 1);
        }

        finalCombinedRows.set(accountName, emails);
      });

      // Log the final combined rows map
      console.log("Final Combined Rows Map:", Array.from(finalCombinedRows.entries()));

      // 5. Convert to array and sort blank emails to the bottom
      const sortedData = Array.from(finalCombinedRows.entries()).sort(
        ([, emailA], [, emailB]) => {
          if (emailA === "" && emailB !== "") return 1;
          if (emailA !== "" && emailB === "") return -1;
          return 0;
        },
      );

      const finalData = [
        ["Known As", "To", "BCC", "Subject", "Send As"],
        ...sortedData.map(([accountName, email]) => [
          accountName,
          email,
          bcc,
          subject,
          sendAs,
        ]),
      ];
      setProcessedData(finalData);
    } catch (error) {
      console.error("Error in processCSV:", error);
      alert("An error occurred while processing the CSV. Please check the console for details.");
    }
  };

  const downloadCSV = () => {
    if (processedData.length === 0) {
      alert("Please process the CSV first");
      return;
    }

    const csvContent = Papa.unparse(processedData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    if (downloadLinkRef.current) {
      downloadLinkRef.current.href = url;
      downloadLinkRef.current.download = "processed_data.csv";
      downloadLinkRef.current.click();
    }

    // Clean up the URL object after the download is initiated
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
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
            <Label htmlFor="sendAs">Send As</Label>
            <Input
              id="sendAs"
              type="email"
              placeholder="Enter Send As email"
              value={sendAs}
              onChange={(e) => setSendAs(e.target.value)}
            />
          </div>
          <Button onClick={processCSV} className="w-full">
            Process CSV
          </Button>
          <div>
            <Label htmlFor="processed-data">Processed CSV Data</Label>
            <div
              id="processed-data"
              className="border rounded-md overflow-auto max-h-[400px]"
            >
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
          <a ref={downloadLinkRef} style={{ display: "none" }}>
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
  );
}
