export interface Class {
    classId: number;
    className: string;
    scheduleTime: string; 
    attendance: number;
    maxParticipants: number;
}

export interface Instructors {
    instructorId: number;
    instructorName: string;
    specialty: string;
}

export type ClassInstructors = {
    classInstructorId: number;
    classId: number;
    instructorId: number;
}

export type MemberClasses = {
    memberClassId: number;
    memberId: number;
    classId: number;
    registrationDate: string;
};

export interface Members {
    memberId: number;
    memberName: string;
    email: string;
    dateJoined: string;
    membershipType: string;
}

export interface Equipment {
    equipmentId: number;
    equipmentType: string;
    purchaseDate: string; 
    maintenanceSchedule?: string; 
    lifespan?: number; 
};

export interface MaintenanceRequests {
    requestId: number;
    equipmentId: number;
    requestDate: string; 
    resolved: boolean;
}