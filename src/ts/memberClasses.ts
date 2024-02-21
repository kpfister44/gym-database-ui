export function applyMemberClassesFilter() {
    const filter: HTMLSelectElement | null = document.getElementById('filter') as HTMLSelectElement;
    if (!filter) return; // Exit if filter element is not found

    const rows: NodeListOf<HTMLTableRowElement> = document.querySelectorAll('tbody tr');

    filter.addEventListener('change', function() {
        const filterValue: string = this.value;
        rows.forEach(row => {
            const memberID: string = row.cells[0].textContent?.trim().toLowerCase() || '';
            const classID: string = row.cells[1].textContent?.trim().toLowerCase() || '';
            const regDate: string = row.cells[2].textContent?.trim().toLowerCase() || '';

            const shouldDisplay = filterValue === 'all' || memberID.includes(filterValue) || classID.includes(filterValue) || regDate.includes(filterValue);
            row.style.display = shouldDisplay ? '' : 'none';
        });
    });
    console.log("here")
}