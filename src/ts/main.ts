interface ClassItem {
    classId: number;
    className: string;
    scheduleTime: string; 
    attendance: number | null; 
    maxParticipants: number;
}

interface InstructorItem {
    instructorId: number;
    instructorName: string;
    specialty: string | null; 
}

document.addEventListener('DOMContentLoaded', () => {
    const tableHeaders = document.querySelectorAll('thead th');
    tableHeaders.forEach((header, index) => {
        header.addEventListener('click', () => {
            sortTableByColumn(index);
        });
    });

    // Populate classId and instructorId selects
    populateClassIds();
    populateInstructorIds();

    const form = document.getElementById('classInstructorForm');
    if (form) { 
        form.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent the default form submission

            const classId = (document.getElementById('classId') as HTMLInputElement).value;
            const instructorId = (document.getElementById('instructorId') as HTMLInputElement).value;

            createClassInstructor(classId, instructorId);
        });
    } else {
        console.error('Form not found');
    }

    // Listen for delete button clicks in the table
    const table = document.querySelector('table');
    if (table) {
        table.addEventListener('click', function(event) {
            const target = event.target as HTMLElement;
            if (target.tagName === 'BUTTON' && target.classList.contains('delete')) {
                const row = target.closest('tr');
                if (row) { // Check if row is not null
                    const classId = row.getAttribute('data-class-id');
                    const instructorId = row.getAttribute('data-instructor-id');
                    if (classId && instructorId) {
                        deleteClassInstructor(classId, instructorId);
                        row.remove(); // Remove the row from the table
                    }
                } else {
                    console.error('Row not found');
                }
            }
            // Handle edit button clicks
            if (target.tagName === 'BUTTON' && target.classList.contains('edit')) {
                const row = target.closest('tr');
                if (row) {
                    const classId = row.getAttribute('data-class-id');
                    // This is not used directly for updating, so it's okay if it's null here.
                    const instructorId = row.getAttribute('data-instructor-id'); 
                    const newInstructorId = prompt("Enter new Instructor ID:", instructorId || ""); // Default to empty string if instructorId is null
                    if (newInstructorId !== null) { // Check if the prompt was not cancelled
                        if (classId !== null) { 
                            updateClassInstructor(classId, newInstructorId).then(() => {
                            }).catch((error) => {
                                console.error('Error updating class instructor:', error);
                            });
                        } else {
                            console.error('Class ID is null');
                        }
                    } else {
                        console.log('Update cancelled by user');
                    }
                }
            }
        });
    } else {
        console.error('Table not found');
    }


});

// Object to keep track of the sort state of each column
const sortState: { [key: number]: 'ascending' | 'descending' } = {};

function sortTableByColumn(columnIndex: number) {
    const tableBody = document.querySelector('tbody');
    if (!tableBody) return;
    const rows = Array.from(tableBody.querySelectorAll('tr'));

    // Determine the current sort order for the column, default to ascending
    const currentSortOrder = sortState[columnIndex] || 'ascending';

    const sortedRows = rows.sort((a, b) => {
        const aCell = a.cells[columnIndex];
        const bCell = b.cells[columnIndex];
        if (!aCell || !bCell) return 0;

        const aValue = aCell.textContent?.trim().toLowerCase() || '';
        const bValue = bCell.textContent?.trim().toLowerCase() || '';

        // Compare values based on the current sort order
        if (currentSortOrder === 'ascending') {
            return aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
        } else {
            return bValue.localeCompare(aValue, undefined, { numeric: true, sensitivity: 'base' });
        }
    });

    // Append sorted rows back to the table body
    sortedRows.forEach(row => {
        tableBody.appendChild(row);
    });

    // Toggle the sort state for the next click
    sortState[columnIndex] = currentSortOrder === 'ascending' ? 'descending' : 'ascending';
}

function filterTableBySearch() {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const filterText = searchInput.value.toLowerCase();
    const tableBody = document.querySelector('tbody');
    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const memberId = cells[0]?.textContent?.toLowerCase() || '';
        const classId = cells[1]?.textContent?.toLowerCase() || '';

        // Check if either Member ID or Class ID matches the search input
        if (memberId.indexOf(filterText) > -1 || classId.indexOf(filterText) > -1) {
            row.style.display = ""; // Show row
        } else {
            row.style.display = "none"; // Hide row
        }
    });
}

function createClassInstructor(classId: string, instructorId: string) {
    // Fetch the selected options to get the names
    const classSelect = document.getElementById('classId') as HTMLSelectElement;
    const instructorSelect = document.getElementById('instructorId') as HTMLSelectElement;
    const className = classSelect.options[classSelect.selectedIndex].text; 
    const instructorName = instructorSelect.options[instructorSelect.selectedIndex].text;

    fetch('/api/classInstructors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            classId,
            instructorId,
        }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        // Add a new row to the table with class name and instructor name
        const tableBody = document.querySelector('table tbody') as HTMLTableSectionElement;
        if (tableBody) {
            const row = tableBody.insertRow();
            row.innerHTML = `<td>${className}</td><td>${instructorName}</td><td><button class="edit">Edit</button> <button class="delete">Remove</button></td>`;
            row.setAttribute('data-class-id', classId);
            row.setAttribute('data-instructor-id', instructorId);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function deleteClassInstructor(classId: string, instructorId: string) {
    fetch(`/api/classInstructors/${classId}/${instructorId}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        console.log('Delete successful', data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

async function updateClassInstructor(classId: string, newInstructorId: string) {
    try {
        const response = await fetch(`/api/classInstructors/${classId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ instructorId: newInstructorId }),
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log('Update successful', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

function populateClassIds() {
    fetch('/api/classes')
        .then(response => response.json())
        .then((data: ClassItem[]) => {
            const classIdSelect = document.getElementById('classId') as HTMLSelectElement;
            data.forEach((classItem: ClassItem) => {
                const option = document.createElement('option');
                option.value = classItem.classId.toString();
                option.textContent = classItem.className; ;
                classIdSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching class IDs:', error));
}

function populateInstructorIds() {
    fetch('/api/instructors')
        .then(response => response.json())
        .then((data: InstructorItem[]) => {
            const instructorIdSelect = document.getElementById('instructorId') as HTMLSelectElement;
            data.forEach((instructorItem: InstructorItem) => {
                const option = document.createElement('option');
                option.value = instructorItem.instructorId.toString();
                option.textContent = instructorItem.instructorName; 
                instructorIdSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching instructor IDs:', error));
}