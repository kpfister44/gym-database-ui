<script lang="ts">
    import { onMount } from 'svelte';
    import { Checkbox, Button, Input, Label, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Helper, Heading } from 'flowbite-svelte';
    import type { MaintenanceRequests } from '../types/modelTypes'; 
    import { fetchMaintenanceRequests } from '../api/fetchMaintenenceRequests';
    import { formatScheduleTime } from '../utility/timeFormatter';
    import type { Equipment } from '../types/modelTypes';
    import fetchEquipment from '../api/fetchEquipment';

    let equipmentId: number | undefined;
    let requestDate: string = '';
    let resolved: boolean = false;
    let equipment: Equipment[] = [];
    let requests: MaintenanceRequests[] = [];
    let editingState: { requestId: number | null; equipmentId: number | null; requestDate: string | null; resolved: boolean | undefined; } = { requestId: null, equipmentId: null, requestDate: null, resolved: undefined };

    onMount(async () => {
        try {
            [equipment, requests] = await Promise.all([
                fetchEquipment(),
                fetchMaintenanceRequests(),
            ]);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    });


    async function submitMaintenenceRequest() {
        // Validation: Check if all required fields are filled
        if (!equipmentId || !requestDate || !resolved) {
            console.error('All fields are required');
            return;
        }

        try {
            // Sending the POST request to the server
            const response = await fetch('/api/maintenanceRequests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    equipmentId,
                    requestDate,
                    resolved,
                }),
            });

            if (!response.ok) {
                // Handling responses that are not 2xx
                throw new Error('Network response was not ok');
            }

            // Processing the successful response
            const result = await response.json();
            console.log('Maintenance request successful:', result);

            // Resetting form fields after successful submission
            equipmentId= 0;
            requestDate = '';
            resolved = false

            // Refreshing the list of member classes to include the new registration
            requests = await fetchMaintenanceRequests();

        } catch (error) {
            // Handling any errors that occurred during the fetch operation
            console.error('Failed to submit maintenance request:', error);
        }
    }

    function handleRequestSubmit(event: SubmitEvent) {
        event.preventDefault();
        submitMaintenenceRequest();
    }

    async function deleteRequest(requestId: number) {
        const response = await fetch(`/api/maintenanceRequests/${requestId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            console.error('Failed to delete maintenance request');
            return;
        }

        requests = await fetchMaintenanceRequests();
    }

    function startEditing(requestId: number, equipmentId: number, requestDate: string, resolved: boolean) {
        editingState = { requestId, equipmentId, requestDate, resolved };
    }

    function stopEditing() {
        editingState = { requestId: null, equipmentId: null, requestDate: null, resolved: undefined };
    }

    // Function to handle editing of instructor classes
     // Function to handle editing of instructor classes
     async function updateMaintenaceRequest() {
        if (!editingState.requestId) {
            console.error('Request ID is required');
            return;
        }

        try {
            const response = await fetch(`/api/maintenanceRequests/${editingState.requestId}`, {
                method: 'PUT', 
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    equipmentId: editingState.equipmentId,
                    requestDate: editingState.requestDate,
                    resolved: editingState.resolved,
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            console.log('Maintenance request update successful');
            stopEditing(); // Reset editing state
            requests = await fetchMaintenanceRequests(); // Refresh list
        } catch (error) {
            console.error('Failed to update the maintenance request:', error);
        }
    } 
</script>

<Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">Add or edit maintenance requests</Heading>
<form id="maintenanceRequestForm" on:submit|preventDefault={handleRequestSubmit} class="bg-white dark:bg-gray-800 p-5">
    <div class="grid gap-6 mb-6 md:grid-cols-2">
        <div>
            <Label for="equipmentId" class="mb-2">Equipment:</Label>
            <select id="equipmentId" bind:value={equipmentId} required>
                <option value="" disabled>Select equipment</option>
                {#each equipment as equipmentItem}
                    <option value={equipmentItem.equipmentId}>{equipmentItem.equipmentType}</option>
                {/each}
            </select>
        </div>
        <div>
            <Label for="requestDate" class="mb-2">Request Date:</Label>
            <Input type="date" id="requestDate" bind:value={requestDate} required />
        </div>
        <div>
            <Label for="resolved" class="mb-2">Resolved:</Label>
            <Checkbox id="resolved" bind:checked={resolved}>Resolved</Checkbox>
        </div>
    </div>  
    <Button size="lg" class="w-32" type="submit" color="green">Submit</Button>  
</form>

<Table class="mt-4">
    <caption class="p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        Maintenance Requests
        <p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">Here is a list of the current maintenance requests for gym equipment.</p>
    </caption>
    <TableHead>
        <TableHeadCell>Request ID</TableHeadCell>
        <TableHeadCell>Equipment ID</TableHeadCell>
        <TableHeadCell>Request Date</TableHeadCell>
        <TableHeadCell>Resolved</TableHeadCell>
        <TableHeadCell>Actions</TableHeadCell>
    </TableHead>
    <TableBody>
        {#each requests as request}
            <TableBodyRow>
                <TableBodyCell>{request.requestId}</TableBodyCell>
                <!-- Equipment ID Cell -->
                <TableBodyCell>
                    {#if editingState.requestId === request.requestId}
                        <select bind:value={editingState.equipmentId}>
                            <option value="" disabled>Select a member</option>
                            {#each equipment as equipmentItem}
                                <option value={equipmentItem.equipmentId}>{equipmentItem.equipmentType}</option>
                            {/each}
                        </select>
                    {:else}
                        <!-- Display the equipment's name by ID, or 'Unknown Equipment' if not found, using optional chaining for safety. -->
                        {equipment.find(e => e.equipmentId === request.equipmentId)?.equipmentType || 'Unknown Member'}
                    {/if}
                </TableBodyCell>

                <!-- Request Date and Resolved Cell -->
                {#if editingState.requestId === request.requestId}
                    <TableBodyCell><Input type="datetime-local" bind:value={editingState.requestDate} /></TableBodyCell>
                    <TableBodyCell><Checkbox bind:checked={editingState.resolved}>Resolved</Checkbox></TableBodyCell>
                {:else}
                    <TableBodyCell>{formatScheduleTime(request.requestDate)}</TableBodyCell>
                    <TableBodyCell>{request.resolved ? 'Yes' : 'No'}</TableBodyCell>
                {/if}

                <!-- Actions Cell -->
                <TableBodyCell>
                    {#if editingState.requestId === request.requestId}
                        <!-- Edit Mode: Display Save and Cancel Buttons -->
                        <Button color="green" on:click={updateMaintenaceRequest}>Save</Button>
                        <Button color="light" on:click={stopEditing}>Cancel</Button>
                    {:else}
                        <!-- Default Mode: Display Edit and Delete Buttons -->
                        <Button color="blue" on:click={() => startEditing(request.requestId, request.equipmentId, request.requestDate, request.resolved)}>Edit</Button>
                        <Button color="red" on:click={() => deleteRequest(request.requestId)}>Delete</Button>
                    {/if}
                </TableBodyCell>
            </TableBodyRow>
        {/each}
    </TableBody>
</Table>