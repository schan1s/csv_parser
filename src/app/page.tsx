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
  const [sendAsError, setSendAsError] = useState<string>('');
  const [bccError, setBccError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileError, setFileError] = useState<string>('');
  const [processError, setProcessError] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string>('');
  const [attachment, setAttachment] = useState<string>("");
  const [cc, setCc] = useState<string>("");
  const [ccError, setCcError] = useState<string>('');
  const [useFullNames, setUseFullNames] = useState<boolean>(false);

  const [sendAsOptions] = useState<Array<{value: string, label: string}>>([
    { value: "abaker@hopeinternational.org", label: "Addison Baker" },
    { value: "aclark@homes4hope.org", label: "Abby Murphy" },
    { value: "ahartman@hopeinternational.org", label: "Amy Hartman" },
    { value: "anardozzi@hopeinternational.org", label: "Amy Nardozzi" },
    { value: "aschunk@hopeinternational.org", label: "Adrian Schunk" },
    { value: "asheaffer@hopeinternational.org", label: "Ashley Sheaffer" },
    { value: "asieve@hopeinternational.org", label: "Amy Sieve" },
    { value: "azappitella@hopeinternational.org", label: "Addison Zappitella Hansen" },
    { value: "bboycan@hopeinternational.org", label: "Brian Boycan" },
    { value: "bholley@hopeinternational.org", label: "Bridgette Holley" },
    { value: "cbyrne@hopeinternational.org", label: "Cheryl Byrne" },
    { value: "DBirkey@Hopeinternational.org", label: "Deborah Birkey" },
    { value: "dcummings@hopeinternational.org", label: "Destiney Cummings" },
    { value: "dfarr@hopeinternational.org", label: "Donna Farr" },
    { value: "dholtry@hopeinternational.org", label: "Drake Holtry" },
    { value: "edunham@hopeinternational.org", label: "Erica Dunham" },
    { value: "EQuaile@Hopeinternational.org", label: "Erika Quaile" },
    { value: "EWoodman@Hopeinternational.org", label: "Elizabeth Woodman" },
    { value: "fmensah@hopeinternational.org", label: "Fantasia Mensah" },
    { value: "gbrent@hopeinternational.org", label: "Grace Brent" },
    { value: "gschrader@hopeinternational.org", label: "Grace Schrader" },
    { value: "hgarcia@hopeinternational.org", label: "Hannah Garcia" },
    { value: "hschundler@hopeinternational.org", label: "Hannah Schundler" },
    { value: "HSmith@Hopeinternational.org", label: "Haley Smith" },
    { value: "HWylie@Hopeinternational.org", label: "Holly Wylie" },
    { value: "JBeachy@Hopeinternational.org", label: "Jen Beachy" },
    { value: "JPage@hopeinternational.org", label: "Jenni Page" },
    { value: "JTang@Hopeinternational.org", label: "Joe Tang" },
    { value: "kblazanin@hopeinternational.org", label: "Kendall Blazanin" },
    { value: "KFox@Hopeinternational.org", label: "Kelsey Fox" },
    { value: "kmelu@hopeinternational.org", label: "Kristi Melu" },
    { value: "kvinton@hopeinternational.org", label: "Kristin Vinton" },
    { value: "kwalton@hopeinternational.org", label: "Katrina Walton" },
    { value: "lchambers@hopeinternational.org", label: "Lori Chambers" },
    { value: "LCooper@Hopeinternational.org", label: "Laura Cooper" },
    { value: "mbarnett@hopeinternational.org", label: "Megan Barnett" },
    { value: "mdebuse@hopeinternational.org", label: "Megan DeBuse" },
    { value: "mdereu@hopeinternational.org", label: "Mariah DeReu" },
    { value: "mhaugen@hopeinternational.org", label: "Mark Haugen" },
    { value: "msommers@hopeinternational.org", label: "Maya Sommers" },
    { value: "mwood@hopeinternational.org", label: "Maya Wood" },
    { value: "pcastillo@hopeinternational.org", label: "Pamela Castillo" },
    { value: "PGreer@Hopeinternational.org", label: "Peter Greer" },
    { value: "pmckee@hopeinternational.org", label: "Patrick McKee" },
    { value: "PSmith@Hopeinternational.org", label: "Phil Smith" },
    { value: "pyoon@hopeinternational.org", label: "Priscilla Yoon" },
    { value: "rwilliams@hopeinternational.org", label: "Robyn Williams" },
    { value: "srussell@hopeinternational.org", label: "Stacie Zakem Russell" }
  ]);

  const [bccOptions] = useState<Array<{value: string, label: string}>>([]);

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

  const validateFields = (): boolean => {
    let isValid = true;

    // Validate Send As (required field)
    if (!sendAs || !validateEmail(sendAs)) {
      setSendAsError('Please enter a valid email address');
      isValid = false;
    } else {
      setSendAsError('');
    }

    // Validate CC (optional field)
    if (cc && !validateEmail(cc)) {
      setCcError('Please enter a valid email address');
      isValid = false;
    } else {
      setCcError('');
    }

    // Validate BCC (optional field)
    if (bcc && !validateEmail(bcc)) {
      setBccError('Please enter a valid email address');
      isValid = false;
    } else {
      setBccError('');
    }

    return isValid;
  };

  const processCSV = async () => {
    if (isProcessing) return;
    
    try {
      setProcessError('');
      console.log('STARTING_PROCESS:', { useFullNames });
      
      // More thorough cleaning of the attachment path
      const cleanedAttachment = attachment
        .trim()
        .replace(/^["']|["']$/g, '');
      const replaceTextInQuotes = (text: string) => {
        const findTextBetweenQuotes = /"[^"]*"/g;
        return text.replace(findTextBetweenQuotes, 'bubblegum');
      };
        
      const extraCleanedAttachment = replaceTextInQuotes(cleanedAttachment);      
      
      // Validate fields before processing
      if (!validateFields()) {
        return;
      }

      setIsProcessing(true);

      if (!csvContent) {
        throw new Error('No CSV content to process');
      }

      const cleanedContent = csvContent.replace(/"[^"]*"/g, 'emptyField');

      // Your existing processing logic
      const { data, headers } = Papa.parse(cleanedContent);
      
      // First find the indices
      const accountNameIndex = headers.findIndex((h) => h === "Account Name");
      const firstNameIndex = headers.findIndex((h) => h === "First Name" || h === "First");
      const lastNameIndex = headers.findIndex((h) => h === "Last Name" || h === "Last");
      const emailIndex = headers.findIndex((h) => h === "Email");

      // Then add the debug log
      console.log('PARSED_DATA:', {
        indices: {
          accountName: accountNameIndex,
          firstName: firstNameIndex,
          lastName: lastNameIndex,
          email: emailIndex
        },
        sampleRow: data[0],
        firstNames: data.map(row => row[firstNameIndex]),
        lastNames: data.map(row => row[lastNameIndex]),
        accountNames: data.map(row => row[accountNameIndex])
      });
      
      // Validate CSV structure
      if (!Array.isArray(headers) || !Array.isArray(data)) {
        throw new Error('Invalid CSV structure');
      }

      const uniqueEmails = new Map();
      
      const accountGroups = new Map();
      data.forEach((row: string[]) => {
        const accountName = ((row[accountNameIndex] || "") as string).trim();
        
        if (!accountGroups.has(accountName)) {
          accountGroups.set(accountName, []);
        }
        accountGroups.get(accountName).push(row);
      });

      const processedRows = data.filter((row: string[], index: number) => {
        if (!Array.isArray(row) || row.length <= emailIndex) {
          return false;
        }
        
        const email = ((row[emailIndex] || "") as string).trim();
        const accountName = ((row[accountNameIndex] || "") as string).trim();
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

      // 2. Sort by the 'account name' column
      processedRows.sort((a: string[], b: string[]) => {
        const nameA = ((a[accountNameIndex] || "") as string).toLowerCase();
        const nameB = ((b[accountNameIndex] || "") as string).toLowerCase();
        return nameA.localeCompare(nameB);
      });

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

      const combinedRows = new Map();

      sortedRows.forEach((row: string[]) => {
        const originalAccountName = ((row[accountNameIndex] || "") as string).trim();
        const firstName = (row[firstNameIndex] || "").trim();
        const lastName = (row[lastNameIndex] || "").trim();
        const email = (row[emailIndex] || "").trim();

        // Check if this is a child with email
        const isChildWithEmail = !originalAccountName.toLowerCase().includes(firstName.toLowerCase()) && email !== "";
        
        if (isChildWithEmail) {
          // Handle child rows as before
          const displayName = `${firstName} ${lastName}`;
          combinedRows.set(displayName, email);
          return;
        }

        // For joint accounts
        if (originalAccountName.includes("&")) {
          const accountRows = accountGroups.get(originalAccountName) || [];
          const allEmailsBlank = accountRows.every((r: string[]) => 
            ((r[emailIndex] || "") as string).trim() === ""
          );

          if (useFullNames) {
            // When toggle is ON
            const displayName = allEmailsBlank
              ? originalAccountName  // Keep full names for blank emails
                .replace(/\s*household\s*/gi, "")  // Remove 'household'
                .replace(/\s*&\s*/g, " and ")  // Replace & with and
                .trim()
              : originalAccountName  // For accounts with emails, show first names only
                .replace(/\s*household\s*/gi, "")
                .split("&")
                .map(name => {
                  console.log('PROCESSING_NAME:', {
                    fullName: name.trim(),
                    matchingRows: accountRows.map((row: string[]) => ({
                      firstName: row[firstNameIndex],
                      lastName: row[lastNameIndex]
                    }))
                  });
                  
                  // Find the matching row where the first name appears in this part of the name
                  const matchingRow = accountRows.find((row: string[]) => {
                    const firstName = row[firstNameIndex].toLowerCase();
                    return name.trim().toLowerCase().includes(firstName.toLowerCase());
                  });
                  
                  // If we found a match, use the full first name from the data
                  if (matchingRow) {
                    return matchingRow[firstNameIndex];
                  }
                  
                  // If no match found, use the first word
                  return name.trim().split(" ")[0];
                })
                .join(" and ")
                .trim();
            
            if (!combinedRows.has(displayName)) {
              combinedRows.set(displayName, email);
            } else if (email) {
              const existingEmails = combinedRows.get(displayName) || "";
              if (!existingEmails.includes(email)) {
                combinedRows.set(
                  displayName,
                  existingEmails ? `${existingEmails};${email}` : email
                );
              }
            }
            return;
          } else {
            // When toggle is OFF - append shared last name once at the end if all emails blank
            const firstNames = accountRows
              .filter((row: string[]) => {
                const firstName = ((row[firstNameIndex] || "") as string).trim();
                const accountNameParts = originalAccountName
                  .replace(/\s*household\s*/gi, "")
                  .split(/\s*&\s*/);
                
                return accountNameParts.some(namePart => 
                  namePart.trim().toLowerCase().startsWith(firstName.toLowerCase())
                );
              })
              .map((r: string[]) => (r[firstNameIndex] || "").trim())
              .filter((name: string) => name)
              .join(" and ");
            
            // Add the last name once at the end if all emails are blank
            const lastName = allEmailsBlank ? ` ${accountRows[0][lastNameIndex]}` : '';
            const displayName = `${firstNames}${lastName}`;
            
            if (!combinedRows.has(displayName)) {
              combinedRows.set(displayName, email);
            } else if (email) {
              const existingEmails = combinedRows.get(displayName) || "";
              if (!existingEmails.includes(email)) {
                combinedRows.set(
                  displayName,
                  existingEmails ? `${existingEmails};${email}` : email
                );
              }
            }
            return;
          }
        }

        // For single contacts - use the full account name as the key
        // This ensures emails only combine within the same account
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

      const sortedData = Array.from(combinedRows.entries()).sort(
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
        ["Known As", "To", "CC", "BCC", "Subject", "Send As", "Attachment1"],
        ...sortedData.map(([accountName, email]) => {
          // Find the matching row in the original data for this person
          const matchingRow = data.find(row => {
            const firstName = ((row[firstNameIndex] || "") as string).trim().toLowerCase();
            const lastName = ((row[lastNameIndex] || "") as string).trim().toLowerCase();
            const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
            return accountName.toLowerCase().includes(fullName);
          });

          // Check if this is a child (first name not in household/account name)
          const isChild = matchingRow && !((matchingRow[accountNameIndex] || "") as string)
            .toLowerCase()
            .includes(((matchingRow[firstNameIndex] || "") as string).toLowerCase());

          let displayName = accountName
            .replace(/\s*\(\d+\)$/, '')
            .replace(/\s*household\s*/gi, '');
          
          // If it's a child, always show full name by combining first and last name from original data
          if (isChild && matchingRow) {
            const firstName = ((matchingRow[firstNameIndex] || "") as string).trim();
            const lastName = ((matchingRow[lastNameIndex] || "") as string).trim();
            displayName = `${firstName} ${lastName}`.trim();
          } else if (email && !accountName.includes(" and ")) {
            displayName = accountName
              .replace(/\s*household\s*/gi, '')
              .split(" ")[0]; // Just first name for adults with email
          }

          return [
            displayName,
            email,
            cc,
            bcc,
            subject,
            sendAs,
            cleanedAttachment,
          ];
        }),
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
    return ''; // Default return for when no specific help message is needed
  };

  useEffect(() => {
    return () => {
      setCsvContent('');
      setProcessedData([]);
      setBcc('');
      setSubject('');
      setSendAs('');
      setAttachment('');
      setCc('');
    };
  }, []);

  // Add handlers for input changes
  const handleSendAsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // If the input matches an email exactly, use it
    if (sendAsOptions.some(option => option.value === value)) {
      setSendAs(value);
      return;
    }
    // If the input matches a label exactly, use its corresponding email
    const matchByLabel = sendAsOptions.find(option => 
      option.label.toLowerCase() === value.toLowerCase()
    );
    if (matchByLabel) {
      setSendAs(matchByLabel.value);
      return;
    }
    // Otherwise, just set the raw input value
    setSendAs(value);
  };

  const handleBccChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (bccOptions.some(option => option.value === value)) {
      setBcc(value);
      return;
    }
    const matchByLabel = bccOptions.find(option => 
      option.label.toLowerCase() === value.toLowerCase()
    );
    if (matchByLabel) {
      setBcc(matchByLabel.value);
      return;
    }
    setBcc(value);
  };

  const handleCcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (sendAsOptions.some(option => option.value === value)) {
      setCc(value);
      return;
    }
    const matchByLabel = sendAsOptions.find(option => 
      option.label.toLowerCase() === value.toLowerCase()
    );
    if (matchByLabel) {
      setCc(matchByLabel.value);
      return;
    }
    setCc(value);
  };

  const getDisplayName = (
    accountName: string,
    emails: string,
    accountRows: string[][],
    firstNameIndex: number,
    lastNameIndex: number,
    accountNameIndex: number,
    matchingRow?: string[]
  ): string => {
    if (useFullNames) {
      if (accountName.includes("&")) {
        const cleanedAccountName = accountName
          .replace(/\s*household\s*/gi, "")
          .trim();

        const nameParts = cleanedAccountName.split(/\s*&\s*/);
        
        const names = nameParts.map(namePart => {
          console.log('NAME_PROCESSING:', {
            namePart,
            matchingRows: accountRows.map((row: string[]) => ({
              accountName: row[accountNameIndex],
              firstName: row[firstNameIndex],
              lastName: row[lastNameIndex],
              wouldMatch: namePart.toLowerCase().includes(row[firstNameIndex].toLowerCase())
            }))
          });

          const matchingRow = accountRows.find((row: string[]) => {
            const firstName = ((row[firstNameIndex] || "") as string).trim().toLowerCase();
            // We need to reverse the includes check - the name part should be included in the account name
            return namePart.toLowerCase().includes(firstName);
          });
          
          if (matchingRow) {
            const result = ((matchingRow[firstNameIndex] || "") as string).trim();
            console.log('MATCH_FOUND:', {
              namePart,
              matchedName: result
            });
            return result;
          }
          
          return namePart.split(" ")[0];
        });
        
        return names.join(" and ");
      }
    }

    // When toggle is OFF, keep existing logic unchanged
    if (accountName.includes("&")) {
      const parentNames = accountRows
        .filter((row: string[]) => {
          const firstName = ((row[firstNameIndex] || "") as string).trim().toLowerCase();
          return accountName.toLowerCase().includes(firstName);
        })
        .map((row: string[]) => {
          const firstName = ((row[firstNameIndex] || "") as string).trim();
          return firstName;
        });
      return parentNames.join(" and ");
    }

    // Handle single person accounts
    if (matchingRow) {
      const firstName = ((matchingRow[firstNameIndex] || "") as string).trim();
      const lastName = ((matchingRow[lastNameIndex] || "") as string).trim();
      const fullName = `${firstName} ${lastName}`.trim();
      
      // Check if this person's full name matches the account name
      if (accountName.toLowerCase().includes(fullName.toLowerCase())) {
        return emails === "" ? fullName : firstName;
      }
    }
    return accountName;
  };

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
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="name-toggle">Include both spouses</Label>
                <div className="relative group">
                  <span className="cursor-help text-gray-500 hover:text-gray-700">(?)</span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-white border border-gray-200 rounded-lg p-2 shadow-lg w-64 z-50">
                    <p className="text-sm text-gray-600">Shows both names in joint accounts, even if one spouse isn't in the data</p>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-gray-200"></div>
                  </div>
                </div>
              </div>
              <label htmlFor="name-toggle" className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="name-toggle"
                  className="sr-only peer"
                  checked={useFullNames}
                  onChange={(e) => {
                    setUseFullNames(e.target.checked);
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div>
              <Label htmlFor="csv-upload" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                Upload CSV File
              </Label>
              <div className="relative">
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer cursor-pointer h-9 file:my-auto file:absolute file:top-1/2 file:transform file:-translate-y-1/2 file:left-2 pl-24"
                />
              </div>
              {fileError && (
                <div className="text-red-500 text-sm mt-1">
                  <p>{fileError}</p>
                  <p className="text-sm mt-1">{getErrorHelp(fileError)}</p>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="sendAs" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                Send As
              </Label>
              <div className="relative">
                <input
                  list="sendAsOptions"
                  id="sendAs"
                  value={sendAs}
                  onChange={handleSendAsChange}
                  placeholder="Start typing name or email..."
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <datalist id="sendAsOptions">
                  {sendAsOptions.map((option) => (
                    <option key={option.value} value={option.value} label={option.label} />
                  ))}
                </datalist>
              </div>
              {sendAsError && (
                <p className="text-red-500 text-sm mt-2">
                  {sendAsError}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="cc">CC</Label>
              <div className="relative">
                <input
                  list="sendAsOptions"
                  id="cc"
                  value={cc}
                  onChange={handleCcChange}
                  placeholder="Start typing name or email"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <datalist id="sendAsOptions">
                  {sendAsOptions.map((option) => (
                    <option key={option.value} value={option.value} label={option.label} />
                  ))}
                </datalist>
              </div>
              {ccError && (
                <p className="text-red-500 text-sm mt-2">
                  {ccError}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="bcc">BCC</Label>
              <div className="relative">
                <input
                  list="bccOptions"
                  id="bcc"
                  value={bcc}
                  onChange={handleBccChange}
                  placeholder="Enter BCC email"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <datalist id="bccOptions">
                  {bccOptions.map((option) => (
                    <option key={option.value} value={option.value} label={option.label} />
                  ))}
                </datalist>
              </div>
              {bccError && (
                <p className="text-red-500 text-sm mt-2">
                  {bccError}
                </p>
              )}
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
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-white border border-gray-200 rounded-lg p-3 shadow-lg w-80 z-50">
                    <p className="font-semibold mb-1 text-base">How to get a file path:</p>
                    <ol className="list-decimal pl-8 space-y-1 text-sm text-gray-600">
                      <li className="pl-1">Hold Shift and right-click on your file</li>
                      <li className="pl-1">Select "Copy as path"</li>
                      <li className="pl-1">Paste the path here</li>
                    </ol>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-gray-200"></div>
                  </div>
                </div>
              </div>
              <Input
                id="attachment"
                type="text"
                placeholder="Enter file path"
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
              <p className="text-red-500 text-sm mt-1" style={{ paddingTop: '20px' }}>{processError}</p>
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
