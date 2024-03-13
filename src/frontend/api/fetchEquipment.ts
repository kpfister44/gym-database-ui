import type { Equipment } from "../types/modelTypes";

// Function to fetch equipment from the backend
export async function fetchEquipment(): Promise<Equipment[]> {
    try {
        const response = await fetch('/api/equipment');
        if (!response.ok) {
            console.error('Failed to fetch equipment');
            return [];
        }
        const equipment: Equipment[] = await response.json();
        return equipment;
    } catch (error) {
        console.error('Error fetching equipment:', error);
        return [];
    }
}

export default fetchEquipment;