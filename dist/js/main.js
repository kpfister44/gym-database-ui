"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        form.addEventListener('submit', function (event) {
            event.preventDefault(); // Prevent the default form submission
            const classId = document.getElementById('classId').value;
            const instructorId = document.getElementById('instructorId').value;
            createClassInstructor(classId, instructorId);
        });
    }
    else {
        console.error('Form not found');
    }
    // Listen for delete button clicks in the table
    const table = document.querySelector('table');
    if (table) {
        table.addEventListener('click', function (event) {
            const target = event.target;
            if (target.tagName === 'BUTTON' && target.classList.contains('delete')) {
                const row = target.closest('tr');
                if (row) { // Check if row is not null
                    const classId = row.getAttribute('data-class-id');
                    const instructorId = row.getAttribute('data-instructor-id');
                    if (classId && instructorId) {
                        deleteClassInstructor(classId, instructorId);
                        row.remove(); // Remove the row from the table
                    }
                }
                else {
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
                        }
                        else {
                            console.error('Class ID is null');
                        }
                    }
                    else {
                        console.log('Update cancelled by user');
                    }
                }
            }
        });
    }
    else {
        console.error('Table not found');
    }
});
// Object to keep track of the sort state of each column
const sortState = {};
function sortTableByColumn(columnIndex) {
    const tableBody = document.querySelector('tbody');
    if (!tableBody)
        return;
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    // Determine the current sort order for the column, default to ascending
    const currentSortOrder = sortState[columnIndex] || 'ascending';
    const sortedRows = rows.sort((a, b) => {
        var _a, _b;
        const aCell = a.cells[columnIndex];
        const bCell = b.cells[columnIndex];
        if (!aCell || !bCell)
            return 0;
        const aValue = ((_a = aCell.textContent) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || '';
        const bValue = ((_b = bCell.textContent) === null || _b === void 0 ? void 0 : _b.trim().toLowerCase()) || '';
        // Compare values based on the current sort order
        if (currentSortOrder === 'ascending') {
            return aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
        }
        else {
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
    const searchInput = document.getElementById('searchInput');
    const filterText = searchInput.value.toLowerCase();
    const tableBody = document.querySelector('tbody');
    if (!tableBody)
        return;
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        var _a, _b, _c, _d;
        const cells = row.querySelectorAll('td');
        const memberId = ((_b = (_a = cells[0]) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
        const classId = ((_d = (_c = cells[1]) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.toLowerCase()) || '';
        // Check if either Member ID or Class ID matches the search input
        if (memberId.indexOf(filterText) > -1 || classId.indexOf(filterText) > -1) {
            row.style.display = ""; // Show row
        }
        else {
            row.style.display = "none"; // Hide row
        }
    });
}
function createClassInstructor(classId, instructorId) {
    // Fetch the selected options to get the names
    const classSelect = document.getElementById('classId');
    const instructorSelect = document.getElementById('instructorId');
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
        const tableBody = document.querySelector('table tbody');
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
function deleteClassInstructor(classId, instructorId) {
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
function updateClassInstructor(classId, newInstructorId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`/api/classInstructors/${classId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ instructorId: newInstructorId }),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = yield response.json();
            console.log('Update successful', data);
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
function populateClassIds() {
    fetch('/api/classes')
        .then(response => response.json())
        .then((data) => {
        const classIdSelect = document.getElementById('classId');
        data.forEach((classItem) => {
            const option = document.createElement('option');
            option.value = classItem.classId.toString();
            option.textContent = classItem.className;
            ;
            classIdSelect.appendChild(option);
        });
    })
        .catch(error => console.error('Error fetching class IDs:', error));
}
function populateInstructorIds() {
    fetch('/api/instructors')
        .then(response => response.json())
        .then((data) => {
        const instructorIdSelect = document.getElementById('instructorId');
        data.forEach((instructorItem) => {
            const option = document.createElement('option');
            option.value = instructorItem.instructorId.toString();
            option.textContent = instructorItem.instructorName;
            instructorIdSelect.appendChild(option);
        });
    })
        .catch(error => console.error('Error fetching instructor IDs:', error));
}
