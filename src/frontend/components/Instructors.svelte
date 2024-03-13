<script lang="ts">
    import { onMount } from 'svelte';
    import fetchInstructors from '../api/fetchInstructors';
    import type { Instructors } from '../types/modelTypes';
    import { Button, Input, Label, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Heading } from 'flowbite-svelte';
    
    let instructorName = '';
    let specialty = '';
    let instructors: Instructors[] = [];
    let editingInstructorId: number | null = null; 

    onMount(async () => {
        try {
            instructors = await fetchInstructors();
        } catch (error) {
            console.error('Failed to fetch instructors:', error);
        }
    });

    async function submitInstructor() {
        const response = await fetch('/api/instructors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ instructorName, specialty }),
        });

        if (!response.ok) {
            console.error('Failed to submit Instructor');
            return;
        }

        // After successfully adding an instructor, re-fetch the instructor list to update the UI
        instructors = await fetchInstructors();

        // Reset form fields
        instructorName = '';
        specialty = '';
    }

    function handleInstructorSubmit(event: SubmitEvent) {
        event.preventDefault();
        submitInstructor();
    }

    async function deleteInstructor(instructorId: number) {
        const response = await fetch(`/api/instructors/${instructorId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            console.error('Failed to delete instructor');
            return;
        }

        instructors = await fetchInstructors();
    }

    function startEditing(instructorId: number) {
        editingInstructorId = instructorId;
    }

    function stopEditing() {
        editingInstructorId = null;
    }

    async function updateInstructors(instructorId: number) {
        const instructorsToUpdate = instructors.find(e => e.instructorId === editingInstructorId);
        if (!instructorsToUpdate) return;

        const response = await fetch(`/api/instructors/${instructorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(instructorsToUpdate),
        });

        if (!response.ok) {
            console.error('Failed to update instructors');
            return;
        }

        // After successfully updating the instructors, re-fetch the instructors list to update the UI
        instructors = await fetchInstructors();

        // Exit editing mode
        stopEditing()
    }

</script>

<Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">Add or edit an instructor</Heading>
<form on:submit|preventDefault={handleInstructorSubmit} class="bg-white dark:bg-gray-800 p-5">
    <div class="grid gap-6 mb-6 md:grid-cols-2">
        <div>
            <Label for="instructorName" class="mb-2">Instructor Name:</Label>
            <Input type="text" id="instructorName" placeholder="Kayla Doe" bind:value={instructorName} required />
        </div>
        <div>
            <Label for="specialty" class="mb-2">Specialty:</Label>
            <Input type="text" id="specialty" placeholder="Cardio" bind:value={specialty} required />
        </div>
    </div>
    <Button size="lg" class="w-32" type="submit" color="green">Submit</Button>  
</form>
<Table class="mt-4">
    <caption class="p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        Gym Instructors
        <p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">Here is a list of the current instructors at the gym.</p>
    </caption>
    <TableHead>
        <TableHeadCell>Instructor ID</TableHeadCell>
        <TableHeadCell>Name</TableHeadCell>
        <TableHeadCell>Specialty</TableHeadCell>
        <TableHeadCell>Actions</TableHeadCell>
    </TableHead>
    <TableBody>
        {#each instructors as instructor}
            <TableBodyRow>
                <TableBodyCell>{instructor.instructorId}</TableBodyCell>
                {#if editingInstructorId === instructor.instructorId}
                    <TableBodyCell><Input type="text" bind:value={instructor.instructorName} /></TableBodyCell>
                    <TableBodyCell><Input type="text" bind:value={instructor.specialty} /></TableBodyCell>
                {:else}
                    <TableBodyCell>{instructor.instructorName}</TableBodyCell>
                    <TableBodyCell>{instructor.specialty}</TableBodyCell>
                {/if}
                <TableBodyCell>
                    {#if editingInstructorId === instructor.instructorId}
                        <Button color="green" on:click={() => updateInstructors(instructor.instructorId)}>Save</Button>
                        <Button color="light" on:click={stopEditing}>Cancel</Button>
                    {:else}
                        <Button color="blue" on:click={() => startEditing(instructor.instructorId)}>Edit</Button>
                        <Button color="red" on:click={() => deleteInstructor(instructor.instructorId)}>Delete</Button>
                    {/if}
                </TableBodyCell>
            </TableBodyRow>
        {/each}
    </TableBody>
</Table>