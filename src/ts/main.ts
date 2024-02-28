document.addEventListener('DOMContentLoaded', () => {
    const tableHeaders = document.querySelectorAll('thead th');
    tableHeaders.forEach((header, index) => {
        header.addEventListener('click', () => {
            sortTableByColumn(index);
        });
    });
    // Add event listener for the search input
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', filterTableBySearch);
    }
});

// Object to keep track of the sort state of each column
const sortState: { [key: number]: 'ascending' | 'descending' } = {};

function sortTableByColumn(columnIndex: number) {
    const tableBody = document.querySelector('tbody');
    if (!tableBody) return;
    const rows = Array.from(tableBody.querySelectorAll('tr'));

    // Determine the current sort order for the column, default to 'ascending'
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