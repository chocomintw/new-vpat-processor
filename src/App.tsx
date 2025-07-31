import { useState } from 'react';
import { TextInput, Textarea, Button, CopyButton, MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css'; // Ensure Mantine styles are imported

// Define the Mantine theme
const theme = createTheme({
    fontFamily: 'Montserrat, sans-serif',
});

// The removeApplicants function with timestamp sorting and filtering logic
function removeApplicants(chatlog: string, searchParameter: string): string {
    // 1. Split the chatlog into individual lines
    const lines = chatlog.split('\n');
    // Create a regular expression to filter lines that DO contain the searchParameter
    // 'i' flag for case-insensitive matching
    const includesRegex = new RegExp(`${searchParameter}`, 'i');
    // Regex to extract the timestamp [hh:mm:ss] and the rest of the line content.
    // Group 1: hh, Group 2: mm, Group 3: ss, Group 4: rest of the line.
    const timestampRegex = /^\[(\d{2}):(\d{2}):(\d{2})\]\s*(.*)/;

    // Use a Map to store unique lines based on their content (excluding timestamp).
    // The key will be the line content, and the value will be an object
    // containing the full original line and its parsed timestamp.
    const uniqueLinesMap = new Map<string, { fullLine: string; timestamp: Date }>();

    let lastParsedFullTimestamp: Date | null = null; // Stores the *fully resolved* timestamp of the previous line
    let dayOffset = 0; // Tracks the inferred day progression (in days)

    // Process each line for filtering and deduplication by content
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
            continue; // Skip empty lines
        }

        // Apply the search parameter filter: ONLY process lines that CONTAIN the searchParameter
        if (!includesRegex.test(trimmedLine)) {
            continue; // Skip lines that do NOT contain the searchParameter
        }

        // Attempt to extract timestamp and line content
        const match = trimmedLine.match(timestampRegex);
        let currentLineTimestamp: Date; // The timestamp for the current line
        let lineContentForDeduplication: string; // This will be the key for the map

        if (match && match[1] && match[2] && match[3]) {
            // Extract hours, minutes, seconds
            const hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);

            // Create a temporary Date object for the current line's time on a base day
            // This 'baseDateWithTime' only holds the time of day from the current line.
            let baseDateWithTime = new Date('2000-01-01T00:00:00'); 
            baseDateWithTime.setHours(hours, minutes, seconds, 0);

            // Logic to infer day progression:
            // If there was a previous timestamp, compare the current line's time-of-day
            // with the previous line's time-of-day. If the current time is earlier,
            // it implies a new day has started.
            if (lastParsedFullTimestamp) {
                const lastTimeOnly = new Date('2000-01-01T00:00:00');
                lastTimeOnly.setHours(
                    lastParsedFullTimestamp.getHours(),
                    lastParsedFullTimestamp.getMinutes(),
                    lastParsedFullTimestamp.getSeconds(),
                    0
                );

                if (baseDateWithTime.getTime() < lastTimeOnly.getTime()) {
                    dayOffset++;
                }
            }

            // Apply the accumulated day offset to the current line's base time
            currentLineTimestamp = new Date(baseDateWithTime.getTime() + (dayOffset * 24 * 60 * 60 * 1000));
            
            // Update lastParsedFullTimestamp with the current, fully resolved timestamp
            lastParsedFullTimestamp = currentLineTimestamp;

            // The content for deduplication is the part after the timestamp
            lineContentForDeduplication = match[4].trim();
        } else {
            // If a line doesn't have the expected timestamp format,
            // assign it a very early date (epoch) so it appears at the beginning of the sorted list.
            currentLineTimestamp = new Date(0); // January 1, 1970 UTC
            lastParsedFullTimestamp = null; // Reset lastParsedFullTimestamp if no timestamp found
            // The entire trimmed line is the content for deduplication if no timestamp is found
            lineContentForDeduplication = trimmedLine;
        }

        // Deduplication logic: If the content is already in the map,
        // we keep the entry with the *earlier* timestamp.
        if (!uniqueLinesMap.has(lineContentForDeduplication) ||
            (currentLineTimestamp && uniqueLinesMap.get(lineContentForDeduplication)!.timestamp > currentLineTimestamp)) {
            
            uniqueLinesMap.set(lineContentForDeduplication, { 
                fullLine: trimmedLine, // Store the original full line (with timestamp)
                timestamp: currentLineTimestamp
            });
        }
    }

    // Convert the Map values to an array for sorting
    let sortableItems = Array.from(uniqueLinesMap.values());

    // Sort the items by their timestamp
    // The .getTime() method returns the number of milliseconds since the epoch,
    // allowing for a direct numerical comparison.
    sortableItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Map back to the original line strings and join them with newline characters
    return sortableItems.map(item => item.fullLine).join('\n');
}

function App() {
  const [applicantValue, setApplicantValue] = useState<string>('');
  const [chatlogValue, setChatlogValue] = useState<string>('');
  // New state variables for error messages
  const [applicantError, setApplicantError] = useState<string | null>(null);
  const [chatlogError, setChatlogError] = useState<string | null>(null);

  // Calculate the processed chatlog
  const processedChatlog = removeApplicants(chatlogValue, applicantValue);

  // Custom click handler for the Copy button to include validation
  const handleCopyClick = (copyFunction: () => void) => {
    let hasError = false;

    if (!applicantValue.trim()) {
      setApplicantError('Applicant name cannot be empty.');
      hasError = true;
    } else {
      setApplicantError(null);
    }

    if (!chatlogValue.trim()) {
      setChatlogError('Chatlog cannot be empty.');
      hasError = true;
    } else {
      setChatlogError(null);
    }

    if (!hasError) {
      copyFunction(); // Only call the copy function if no errors
    }
  };

  return (
    // Main container for the application, centered and with a nice background
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl space-y-6 border border-gray-700">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-green-400 mb-6">
            VPAT Processor
          </h1>

          {/* Input for Applicant Name */}
          <TextInput
            placeholder='Name of the Applicant (e.g., "Applicant A")'
            value={applicantValue}
            onChange={(event) => {
              setApplicantValue(event.currentTarget.value);
              setApplicantError(null); // Clear error when typing
            }}
            className="w-full"
            size="md"
            radius="md"
            error={applicantError} // Pass error message to Mantine TextInput
            styles={{ 
              input: { 
                borderColor: '#4A5568',
                backgroundColor: '#2D3748',
                color: '#F7FAFC'
              } 
            }}
          />

          {/* Textarea for Session Chatlog */}
          <Textarea
            placeholder='Paste your session chatlog here...'
            value={chatlogValue}
            onChange={(event) => {
              setChatlogValue(event.currentTarget.value);
              setChatlogError(null); // Clear error when typing
            }}
            autosize
            minRows={8}
            maxRows={15}
            className="w-full font-mono text-sm"
            size="md"
            radius="md"
            error={chatlogError} // Pass error message to Mantine Textarea
            styles={{ 
              input: { 
                borderColor: '#4A5568',
                backgroundColor: '#2D3748',
                color: '#F7FAFC'
              } 
            }}
          />

          {/* Copy Button */}
          <CopyButton value={processedChatlog}>
            {({ copied, copy }) => (
              <Button
                // Use the custom handleCopyClick function
                onClick={() => handleCopyClick(copy)}
                color={copied ? 'emerald' : 'green'} // Mantine color prop
                fullWidth
                size="lg"
                radius="md"
                className="transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95"
                style={{
                  background: copied ? 'linear-gradient(45deg, #059669 30%, #10B981 90%)' : 'linear-gradient(45deg, #16A34A 30%, #22C55E 90%)',
                  boxShadow: copied ? '0 4px 15px rgba(5, 150, 105, 0.4)' : '0 4px 15px rgba(22, 163, 74, 0.4)',
                }}
              >
                {copied ? 'Copied Processed Chatlog!' : 'Copy Processed Chatlog'}
              </Button>
            )}
          </CopyButton>

          {processedChatlog && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg shadow-inner border border-gray-600">
              <h2 className="text-xl font-semibold text-green-300 mb-3">Processed Chatlog:</h2>
              <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-200 bg-gray-900 p-3 rounded-md overflow-auto max-h-60">
                {processedChatlog}
              </pre>
            </div>
          )}
        </div>
      </div>
    </MantineProvider>
  );
}

export default App;