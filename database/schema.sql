SET FOREIGN_KEY_CHECKS=0;
SET AUTOCOMMIT = 0;


-- Members Table
CREATE OR REPLACE TABLE Members (
    memberId INT AUTO_INCREMENT,
    memberName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    dateJoined DATE NOT NULL,
    membershipType VARCHAR(255) NOT NULL,
    PRIMARY KEY (memberId)
);

-- Classes Table
CREATE OR REPLACE TABLE Classes (
    classId INT AUTO_INCREMENT,
    className VARCHAR(255) NOT NULL,
    scheduleTime DATETIME NOT NULL,
    attendance INT,
    maxParticipants INT,
    PRIMARY KEY (classId)
);

-- Instructors Table
CREATE OR REPLACE TABLE Instructors (
    instructorId INT AUTO_INCREMENT,
    instructorName VARCHAR(255) NOT NULL,
    specialty VARCHAR(255),
    PRIMARY KEY (instructorId)
);

-- Equipment Table 
CREATE OR REPLACE TABLE Equipment (
    equipmentId INT AUTO_INCREMENT,
    equipmentType VARCHAR(255) NOT NULL,
    purchaseDate DATE NOT NULL,
    maintenanceSchedule VARCHAR(255),
    lifespan INT,
    PRIMARY KEY (equipmentId)
);

-- MaintenanceRequests Table
CREATE OR REPLACE TABLE MaintenanceRequests (
    requestId INT AUTO_INCREMENT,
    equipmentId INT,
    requestDate DATE NOT NULL,
    resolved BOOLEAN NOT NULL,
    PRIMARY KEY (requestId),
    FOREIGN KEY (equipmentId) REFERENCES Equipment(equipmentId) ON DELETE CASCADE
);

-- ClassInstructors Table
CREATE OR REPLACE TABLE ClassInstructors (
    classInstructorId INT AUTO_INCREMENT PRIMARY KEY,
    classId INT,
    instructorId INT,
    FOREIGN KEY (classId) REFERENCES Classes(classId) ON DELETE CASCADE,
    FOREIGN KEY (instructorId) REFERENCES Instructors(instructorId) ON DELETE CASCADE,
    UNIQUE (classId, instructorId)
);

-- MemberClasses Table
CREATE OR REPLACE TABLE MemberClasses (
    memberClassId INT AUTO_INCREMENT PRIMARY KEY,
    memberId INT,
    classId INT,
    registrationDate DATE NOT NULL,
    FOREIGN KEY (memberId) REFERENCES Members(memberId) ON DELETE CASCADE,
    FOREIGN KEY (classId) REFERENCES Classes(classId) ON DELETE CASCADE,
    UNIQUE (memberId, classId, registrationDate)
);
