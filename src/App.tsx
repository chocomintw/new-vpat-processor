import { useState } from 'react';
import { TextInput, Textarea, Button, CopyButton, MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css'; // Ensure Mantine styles are imported

// Define the Mantine theme
const theme = createTheme({
    fontFamily: 'Montserrat, sans-serif',
});

// The removeApplicants function with timestamp sorting and filtering logic
function removeApplicants(chatlog: string, searchParameter: string): string {
    const lines = chatlog.split('\n');
    const includesRegex = new RegExp(`${searchParameter}`, 'i');
    const timestampRegex = /^\[(\d{2}):(\d{2}):(\d{2})\]\s*(.*)/;

    // Use a Map to store unique lines based on their content (excluding timestamp).
    const uniqueLinesMap = new Map<string, { fullLine: string; timestamp: Date }>();

    let lastParsedFullTimestamp: Date | null = null; // Stores the *fully resolved* timestamp of the previous line
    let currentDayOffset = 0; // Tracks the inferred day progression (in days)

    // A base date to build our timestamps upon. We can pick any date, say, today's date
    // or a fixed historical date. Let's use current date to ensure valid year context,
    // but we will override only its time.
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to beginning of today

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
            continue; // Skip empty lines
        }

        if (!includesRegex.test(trimmedLine)) {
            continue; // Skip lines that do NOT contain the searchParameter
        }

        const match = trimmedLine.match(timestampRegex);
        let currentLineTimestamp: Date; // The timestamp for the current line
        let lineContentForDeduplication: string;

        if (match && match[1] && match[2] && match[3]) {
            const hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);

            // Create a temporary Date object representing the time of day on our base day
            // We use 'today' as the base to keep calendar arithmetic consistent
            const tempDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            tempDate.setHours(hours, minutes, seconds, 0);

            // Infer day progression:
            // If there's a last timestamp and the current time (on its base day) is *earlier* than the
            // *last fully processed timestamp's time-of-day*, then a new day has likely started.
            if (lastParsedFullTimestamp) {
                // Get just the time-of-day part of the last full timestamp
                const lastTimeOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                lastTimeOfDay.setHours(
                    lastParsedFullTimestamp.getHours(),
                    lastParsedFullTimestamp.getMinutes(),
                    lastParsedFullTimestamp.getSeconds(),
                    0
                );

                // If current time-of-day is less than previous time-of-day, increment day offset
                if (tempDate.getTime() < lastTimeOfDay.getTime()) {
                    currentDayOffset++;
                }
            }
            
            // Apply the accumulated day offset to get the full timestamp for this line
            currentLineTimestamp = new Date(tempDate.getTime() + (currentDayOffset * 24 * 60 * 60 * 1000));
            
            // Update lastParsedFullTimestamp with the current, fully resolved timestamp
            lastParsedFullTimestamp = currentLineTimestamp;

            lineContentForDeduplication = match[4].trim();
        } else {
            // For lines without timestamps, assign epoch and reset day tracking
            currentLineTimestamp = new Date(0); // January 1, 1970 UTC
            lastParsedFullTimestamp = null; // Reset day inference
            currentDayOffset = 0; // Reset day offset
            lineContentForDeduplication = trimmedLine;
        }

        // Deduplication logic: If the content is already in the map,
        // we keep the entry with the *earlier* timestamp.
        if (!uniqueLinesMap.has(lineContentForDeduplication) ||
            (currentLineTimestamp && uniqueLinesMap.get(lineContentForDeduplication)!.timestamp > currentLineTimestamp)) {
            
            uniqueLinesMap.set(lineContentForDeduplication, { 
                fullLine: trimmedLine, 
                timestamp: currentLineTimestamp
            });
        }
    }

    let sortableItems = Array.from(uniqueLinesMap.values());

    // Final sort based on the fully calculated timestamps
    sortableItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return sortableItems.map(item => item.fullLine).join('\n');
}

function App() {
    const [applicantValue, setApplicantValue] = useState<string>('');
    const [chatlogValue, setChatlogValue] = useState<string>('');
    const [applicantError, setApplicantError] = useState<string | null>(null);
    const [chatlogError, setChatlogError] = useState<string | null>(null);

    const processedChatlog = removeApplicants(chatlogValue, applicantValue);

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
            copyFunction();
        }
    };

    return (
        <MantineProvider theme={theme} defaultColorScheme="dark">
            <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl space-y-6 border border-gray-700">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-green-400 mb-6">
                        VPAT Processor
                    </h1>

                    <TextInput
                        placeholder='Name of the Applicant (e.g., "Applicant A")'
                        value={applicantValue}
                        onChange={(event) => {
                            setApplicantValue(event.currentTarget.value);
                            setApplicantError(null);
                        }}
                        className="w-full"
                        size="md"
                        radius="md"
                        error={applicantError}
                        styles={{
                            input: {
                                borderColor: '#4A5568',
                                backgroundColor: '#2D3748',
                                color: '#F7FAFC'
                            }
                        }}
                    />

                    <Textarea
                        placeholder='Paste your session chatlog here...'
                        value={chatlogValue}
                        onChange={(event) => {
                            setChatlogValue(event.currentTarget.value);
                            setChatlogError(null);
                        }}
                        autosize
                        minRows={8}
                        maxRows={15}
                        className="w-full font-mono text-sm"
                        size="md"
                        radius="md"
                        error={chatlogError}
                        styles={{
                            input: {
                                borderColor: '#4A5568',
                                backgroundColor: '#2D3748',
                                color: '#F7FAFC'
                            }
                        }}
                    />

                    <CopyButton value={processedChatlog}>
                        {({ copied, copy }) => (
                            <Button
                                onClick={() => handleCopyClick(copy)}
                                color={copied ? 'emerald' : 'green'}
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