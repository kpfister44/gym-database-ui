"use strict";
document.addEventListener('DOMContentLoaded', () => {
    const tableHeaders = document.querySelectorAll('thead th');
    tableHeaders.forEach((header, index) => {
        header.addEventListener('click', () => {
            sortTableByColumn(index);
        });
    });
    // Add event listener for the search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterTableBySearch);
    }
});
// Object to keep track of the sort state of each column
const sortState = {};
function sortTableByColumn(columnIndex) {
    const tableBody = document.querySelector('tbody');
    if (!tableBody)
        return;
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    // Determine the current sort order for the column, default to 'ascending'
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
