const dateFormatter = new Intl.DateTimeFormat('en-US', { 
    month: 'long', 
    day: '2-digit', 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
});

// Function to format date, adding "at" between date and time
export function formatScheduleTime(scheduleTime: string): string {
    const formattedDate = dateFormatter.format(new Date(scheduleTime));
    return formattedDate.replace(',', ' at'); // Replace the first comma with ' at'
}