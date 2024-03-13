import type { MaintenanceRequests } from '../types/modelTypes'; 

/**
 * Fetches all maintenance requests from the backend.
 * @returns A promise that resolves to an array of MaintenanceRequest objects.
 */
export async function fetchMaintenanceRequests(): Promise<MaintenanceRequests[]> {
    try {
        const response = await fetch('/api/maintenanceRequests');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const maintenanceRequests: MaintenanceRequests[] = await response.json();
        return maintenanceRequests;
    } catch (error) {
        console.error('Failed to fetch maintenance requests:', error);
        throw error;
    }
}