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

    // Intermediate structure to hold parsed data before final processing
    interface ParsedLine {
        fullLine: string;
        contentForDeduplication: string;
        timestampParts: { hours: number; minutes: number; seconds: number } | null;
        originalIndex: number; // To maintain original relative order for non-timestamped lines
    }

    const parsedLines: ParsedLine[] = [];

    // --- Pass 1: Parse and Filter Lines ---
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        if (!trimmedLine) {
            continue; // Skip empty lines
        }

        if (!includesRegex.test(trimmedLine)) {
            continue; // Skip lines that do NOT contain the searchParameter
        }

        const match = trimmedLine.match(timestampRegex);
        let timestampParts: { hours: number; minutes: number; seconds: number } | null = null;
        let contentForDeduplication: string;

        if (match && match[1] && match[2] && match[3]) {
            timestampParts = {
                hours: parseInt(match[1], 10),
                minutes: parseInt(match[2], 10),
                seconds: parseInt(match[3], 10),
            };
            contentForDeduplication = match[4].trim();
        } else {
            contentForDeduplication = trimmedLine;
        }

        parsedLines.push({
            fullLine: trimmedLine,
            contentForDeduplication,
            timestampParts,
            originalIndex: i,
        });
    }

    // Sort parsedLines primarily by timestamp parts (time of day),
    // and secondarily by original index for stable sort of lines without timestamps or same time.
    parsedLines.sort((a, b) => {
        // Handle lines without timestamps first (they should appear earliest)
        if (!a.timestampParts && !b.timestampParts) {
            return a.originalIndex - b.originalIndex; // Maintain original order
        }
        if (!a.timestampParts) return -1; // a comes first
        if (!b.timestampParts) return 1;  // b comes first

        // Compare by hours, then minutes, then seconds
        if (a.timestampParts.hours !== b.timestampParts.hours) {
            return a.timestampParts.hours - b.timestampParts.hours;
        }
        if (a.timestampParts.minutes !== b.timestampParts.minutes) {
            return a.timestampParts.minutes - b.timestampParts.minutes;
        }
        if (a.timestampParts.seconds !== b.timestampParts.seconds) {
            return a.timestampParts.seconds - b.timestampParts.seconds;
        }
        return a.originalIndex - b.originalIndex; // Stable sort for identical timestamps
    });

    // --- Pass 2: Infer Day Offsets and Populate Unique Lines Map ---
    const uniqueLinesMap = new Map<string, { fullLine: string; timestamp: Date }>();
    let currentDayOffset = 0;
    let lastTimeOfDayValue: number | null = null; // Stored as milliseconds from start of a base day

    for (const item of parsedLines) {
        let finalTimestamp: Date;

        if (item.timestampParts) {
            const { hours, minutes, seconds } = item.timestampParts;
            const currentTimeOfDay = new Date('2000-01-01T00:00:00'); // Base date for time only
            currentTimeOfDay.setHours(hours, minutes, seconds, 0);
            const currentTimeOfDayValue = currentTimeOfDay.getTime();

            // Check for day rollover based on the sorted time-of-day values
            if (lastTimeOfDayValue !== null && currentTimeOfDayValue < lastTimeOfDayValue) {
                currentDayOffset++; // Time has gone backward, so it's a new day
            }
            lastTimeOfDayValue = currentTimeOfDayValue;

            // Construct the final timestamp by adding the inferred day offset
            finalTimestamp = new Date(currentTimeOfDayValue + (currentDayOffset * 24 * 60 * 60 * 1000));
        } else {
            // For lines without timestamps, assign epoch and reset day tracking
            finalTimestamp = new Date(0); // Jan 1, 1970 UTC
            lastTimeOfDayValue = null; // Reset day inference
            currentDayOffset = 0; // Reset day offset
        }

        // Deduplication logic: Keep the entry with the *earlier* timestamp if content is identical
        if (!uniqueLinesMap.has(item.contentForDeduplication) ||
            (finalTimestamp && uniqueLinesMap.get(item.contentForDeduplication)!.timestamp > finalTimestamp)) {

            uniqueLinesMap.set(item.contentForDeduplication, {
                fullLine: item.fullLine,
                timestamp: finalTimestamp,
            });
        }
    }

    // --- Pass 3: Final Sorting and Join ---
    let sortableItems = Array.from(uniqueLinesMap.values());

    sortableItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return sortableItems.map(item => item.fullLine).join('\n');
}

function App() {
    const [applicantValue, setApplicantValue] = useState<string>('');
    const [chatlogValue, setChatlogValue] = useState<string>('');
    const [applicantError, setApplicantError] = useState<string | null>(null);
    const [chatlogError, setChatlogError] = useState<string | null>(null);

    // Calculate the processed chatlog. Memoize this for performance if chatlogValue changes frequently
    // and removeApplicants is expensive, but for typical chatlog sizes, direct calculation is fine.
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