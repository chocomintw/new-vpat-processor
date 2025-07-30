import { useState } from 'react'
import '@mantine/core/styles.css';
import './App.css'
import { Button, CopyButton, createTheme, MantineProvider, Textarea, TextInput } from '@mantine/core';

const theme = createTheme({
  fontFamily: 'Montserrat',
  primaryColor: 'cyan',
  defaultRadius: 'lg',
});

function App() {
  const [applicantValue, setApplicantValue] = useState('');
  const [chatlogValue, setChatlogValue] = useState('')

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

  /** function removeApplicants(chatlog: string, searchParameter: string) {
    // let search = `/^(?!.*${searchParameter}).*/; //` 
  /*  let regularExpressionNames = new RegExp(search, "i");
    let result = regularExpressionNames.exec(chatlog)?.toString();
    console.log(result)
    console.log(searchParameter)

    return result;
  } */

  return (
    <>
      <MantineProvider theme={theme} defaultColorScheme="dark">
      <TextInput placeholder='Name of the Applicant' value={applicantValue} onChange={(event) => setApplicantValue(event.currentTarget.value)} />
      <Textarea placeholder='Session chatlog' value={chatlogValue} onChange={(event) => setChatlogValue(event.currentTarget.value)} />
      <CopyButton value={removeApplicants(chatlogValue, applicantValue)!}>
      {({ copied, copy }) => (
        <Button color={copied ? 'teal' : 'blue'} onClick={copy}>
          {copied ? 'Copied chatlog' : 'Copy chatlog'}
        </Button>
        )}
      </CopyButton>
      </MantineProvider>
    </>
  )
}

export default App
