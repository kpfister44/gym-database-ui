import type { Members } from "../types/modelTypes";

// Function to fetch members from the backend
export async function fetchMembers(): Promise<Members[]> {
    try {
        const response = await fetch('/api/members');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const members: Members[] = await response.json();
        return members;
    } catch (error) {
        console.error('There was a problem fetching the members:', error);
        throw error; // Rethrow the error so it can be handled by the caller
    }
}