import type { ClassInstructors } from '../types/modelTypes';

// Function to fetch instructor classes from the backend
export async function fetchClassInstructors(): Promise<ClassInstructors[]> {
    try {
        const response = await fetch('/api/classInstructors');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const classInstructors: ClassInstructors[] = await response.json();
        return classInstructors;
    } catch (error) {
        console.error('There was a problem fetching the instructor classes:', error);
        throw error; // Rethrow the error so it can be handled by the caller
    }
}