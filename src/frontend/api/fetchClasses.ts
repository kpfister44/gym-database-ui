import type { Class } from "../types/modelTypes";

// Function to fetch classes from the backend
export async function fetchClasses(): Promise<Class[]> {
    try {
        const response = await fetch('/api/classes');
        if (!response.ok) {
            console.error('Failed to fetch classes');
            return [];
        }
        const classes: Class[] = await response.json();
        return classes;
    } catch (error) {
        console.error('Error fetching classes:', error);
        return [];
    }
}

export default fetchClasses;