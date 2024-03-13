import type { Instructors } from "../types/modelTypes";

export async function fetchInstructors(): Promise<Instructors[]> {
    try {
        const response = await fetch('/api/instructors');
        if (!response.ok) {
            console.error('Failed to fetch instructors');
            return [];
        }
        const instructors: Instructors[] = await response.json();
        return instructors;
    } catch (error) {
        console.error('Error fetching instructors:', error);
        return [];
    }
}

export default fetchInstructors;