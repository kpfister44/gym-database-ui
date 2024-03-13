import type { MemberClasses } from '../types/modelTypes';

// Function to fetch member classes from the backend
export async function fetchMemberClasses(): Promise<MemberClasses[]> {
    try {
        const response = await fetch('/api/memberClasses');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const memberClasses: MemberClasses[] = await response.json();
        return memberClasses;
    } catch (error) {
        console.error('There was a problem fetching the member classes:', error);
        throw error; // Rethrow the error so it can be handled by the caller
    }
}