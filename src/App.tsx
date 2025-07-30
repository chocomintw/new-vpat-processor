import { useState } from 'react';
import { TextInput, Textarea, Button, CopyButton, MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css'; // Import Mantine styles

// Define the Mantine theme
const theme = createTheme({
  /** Put your Mantine theme override here */
  fontFamily: 'Montserrat, sans-serif', // Use Inter font
  // You can customize colors, spacing, etc. here
});

// The removeApplicants function (copied from your selection)
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
        let parsedTimestamp: Date;
        let lineContentForDeduplication: string; // This will be the key for the map

        if (match && match[1] && match[2] && match[3]) {
            // Extract hours, minutes, seconds
            const hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);

            // Create a Date object for comparison. Use a fixed arbitrary date.
            parsedTimestamp = new Date('2000-01-01T00:00:00');
            parsedTimestamp.setHours(hours, minutes, seconds, 0); // Set milliseconds to 0

            // The content for deduplication is the part after the timestamp
            lineContentForDeduplication = match[4].trim();
        } else {
            // If a line doesn't have the expected timestamp format,
            // assign it a very early date (epoch) so it appears at the beginning of the sorted list.
            parsedTimestamp = new Date(0); // January 1, 1970 UTC
            // The entire trimmed line is the content for deduplication if no timestamp is found
            lineContentForDeduplication = trimmedLine;
        }

        // Deduplication logic: If the content is already in the map,
        // we keep the entry with the *earlier* timestamp.
        if (!uniqueLinesMap.has(lineContentForDeduplication) ||
            (parsedTimestamp && uniqueLinesMap.get(lineContentForDeduplication)!.timestamp > parsedTimestamp)) {
            
            uniqueLinesMap.set(lineContentForDeduplication, { 
                fullLine: trimmedLine, // Store the original full line (with timestamp)
                timestamp: parsedTimestamp
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

  // Calculate the processed chatlog
  const processedChatlog = removeApplicants(chatlogValue, applicantValue);

  return (
    // Main container for the application, centered and with a nice background
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-gray-700">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-blue-400 mb-6">
            Chatlog Filter & Sort
          </h1>

          {/* Input for Applicant Name */}
          <TextInput
            placeholder='Name of the Applicant (e.g., "Applicant A")'
            value={applicantValue}
            onChange={(event) => setApplicantValue(event.currentTarget.value)}
            className="w-full"
            size="md"
            radius="md"
            styles={{ input: { borderColor: '#4A5568' } }} // Custom border color for dark theme
          />

          {/* Textarea for Session Chatlog */}
          <Textarea
            placeholder='Paste your session chatlog here...'
            value={chatlogValue}
            onChange={(event) => setChatlogValue(event.currentTarget.value)}
            autosize
            minRows={8}
            maxRows={15}
            className="w-full font-mono text-sm" // Monospaced font for chatlog
            size="md"
            radius="md"
            styles={{ input: { borderColor: '#4A5568' } }}
          />

          {/* Copy Button */}
          <CopyButton value={processedChatlog}>
            {({ copied, copy }) => (
              <Button
                color={copied ? 'teal' : 'blue'}
                onClick={copy}
                fullWidth
                size="lg"
                radius="md"
                className="transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95"
                style={{
                  background: copied ? 'linear-gradient(45deg, #38B2AC 30%, #4FD1C5 90%)' : 'linear-gradient(45deg, #4299E1 30%, #63B3ED 90%)',
                  boxShadow: copied ? '0 4px 15px rgba(56, 178, 172, 0.4)' : '0 4px 15px rgba(66, 153, 225, 0.4)',
                }}
              >
                {copied ? 'Copied Processed Chatlog!' : 'Copy Processed Chatlog'}
              </Button>
            )}
          </CopyButton>

          {/* Display Area for Processed Chatlog */}
          {processedChatlog && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg shadow-inner border border-gray-600">
              <h2 className="text-xl font-semibold text-blue-300 mb-3">Processed Chatlog:</h2>
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
