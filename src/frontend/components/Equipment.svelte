
<script lang="ts">
    import { onMount } from 'svelte';
    import { Button, Input, Label, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Helper, Heading } from 'flowbite-svelte';
    import type { Equipment } from '../types/modelTypes';
    import fetchEquipment from '../api/fetchEquipment';
    import { formatScheduleTime } from '../utility/timeFormatter';

    let equipmentType: string = '';
    let purchaseDate: string = '';
    let maintenanceSchedule: string = '';
    let lifespan: number | undefined;
    let equipment: Equipment[] = [];
    let editingEquipmentId: number | null = null;

    onMount(async () => {
        try {
            equipment = await fetchEquipment();
        } catch (error) {
            console.error('Failed to fetch equipment:', error);
        }
    });

    async function submitEquipment() {
        const response = await fetch('/api/equipment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ equipmentType, purchaseDate, maintenanceSchedule, lifespan }),
        });

        if (!response.ok) {
            console.error('Failed to submit equipment');
            return;
        }

        // After successfully adding equipment, re-fetch the equipment list to update the UI
        equipment = await fetchEquipment();

        // Reset form fields
        equipmentType = '';
        purchaseDate = '';
        maintenanceSchedule = '';
        lifespan = undefined;
    }

    function handleEquipmentSubmit(event: SubmitEvent) {
        event.preventDefault();
        submitEquipment();
    }

    async function deleteEquipment(equipmentId: number) {
        const response = await fetch(`/api/equipment/${equipmentId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            console.error('Failed to delete equipment');
            return;
        }

        // Re-fetch the equipment to update the list after deletion
        equipment = await fetchEquipment();
    }

    function startEditing(equipmentId: number) {
        editingEquipmentId = equipmentId;
    }

    function stopEditing() {
        editingEquipmentId = null;
    }

    async function updateEquipment(equipmentId: number) {
        const equipmentToUpdate = equipment.find(e => e.equipmentId === editingEquipmentId);
        if (!equipmentToUpdate) return;

        const response = await fetch(`/api/equipment/${equipmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(equipmentToUpdate),
        });

        if (!response.ok) {
            console.error('Failed to update equipment');
            return;
        }

        // After successfully updating the equipment, re-fetch the equipment list to update the UI
        equipment = await fetchEquipment();

        // Exit editing mode
        stopEditing()
    }
</script>

<Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">Add or edit equipemnt</Heading>
<form id="equipmentForm" on:submit|preventDefault={handleEquipmentSubmit} class="bg-white dark:bg-gray-800 p-5">
    <div class="grid gap-6 mb-6 md:grid-cols-2">
        <div>
            <Label for="equipmentType" class="mb-2">Equipment Type:</Label>
            <Input type="text" id="equipmentType" placeholder="i.e. Treadmill" bind:value={equipmentType} required />
        </div>
        <div>
            <Label for="purchaseDate" class="mb-2">Purchase Date:</Label>
            <Input type="date" id="purchaseDate" bind:value={purchaseDate} required />
        </div>
        <div>
            <Label for="maintenanceSchedule" class="mb-2">Maintenance Schedule:</Label>
            <Input type="text" id="maintenanceSchedule" placeholder="i.e. Monthly" bind:value={maintenanceSchedule} />
            <Helper class="text-sm mt-2">
                Optional. Specify if there's a regular maintenance schedule.
            </Helper>
        </div>
        <div>
            <Label for="lifespan" class="mb-2">Lifespan (Years):</Label>
            <Input type="number" id="lifespan" placeholder='5' bind:value={lifespan} />
            <Helper class="text-sm mt-2">
                Optional. Expected number of years the equipment will be in service.
            </Helper>
        </div>
    </div>  
    <Button size="lg" class="w-32" type="submit" color="green">Submit</Button>  
</form>

<Table class="mt-4">
    <caption class="p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        Gym Equipment
        <p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">Here is a list of the current equipment in the gym.</p>
    </caption>
    <TableHead>
            <TableHeadCell>Equipment ID</TableHeadCell>
            <TableHeadCell>Equipment Name</TableHeadCell>
            <TableHeadCell>Purchase Date</TableHeadCell>
            <TableHeadCell>Maintenance Schedule</TableHeadCell>
            <TableHeadCell>Lifespan</TableHeadCell>
    </TableHead>
    <TableBody>
        {#each equipment as item}
            <TableBodyRow>
                <TableBodyCell>{item.equipmentId}</TableBodyCell>
                {#if editingEquipmentId === item.equipmentId}
                    <TableBodyCell><Input type="text" bind:value={item.equipmentType} /></TableBodyCell>
                    <TableBodyCell><Input type="date" bind:value={item.purchaseDate} /></TableBodyCell>
                    <TableBodyCell><Input type="text" bind:value={item.maintenanceSchedule} /></TableBodyCell>
                    <TableBodyCell><Input type="number" bind:value={item.lifespan} /></TableBodyCell>
                {:else}
                    <TableBodyCell>{item.equipmentType}</TableBodyCell>
                    <TableBodyCell>{formatScheduleTime(item.purchaseDate)}</TableBodyCell>
                    <TableBodyCell>{item.maintenanceSchedule}</TableBodyCell>
                    <TableBodyCell>{item.lifespan}</TableBodyCell>
                {/if}
                <TableBodyCell>
                    {#if editingEquipmentId === item.equipmentId}
                        <Button color="green" on:click={() => updateEquipment(item.equipmentId)}>Save</Button>
                        <Button color="light" on:click={stopEditing}>Cancel</Button>
                    {:else}
                        <Button color="blue" on:click={() => startEditing(item.equipmentId)}>Edit</Button>
                        <Button color="red" on:click={() => deleteEquipment(item.equipmentId)}>Delete</Button>
                    {/if}
                </TableBodyCell>
            </TableBodyRow>
        {/each}
    </TableBody>
</Table>