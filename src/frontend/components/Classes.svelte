<script lang="ts">
    // Import onMount from 'svelte'
    import { onMount } from 'svelte';
    import fetchClasses from '../api/fetchClasses';
    import type { Class } from '../types/modelTypes';
    import { formatScheduleTime } from '../utility/timeFormatter';
    import { Heading, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Input, Helper, Button, Label } from 'flowbite-svelte';

    let className: string = '';
    let scheduleTime: string = '';
    let attendance: number = 0;
    let maxParticipants: number = 0;
    let classes: Class[] = [];
    let editingClassId: number | null = null;

    // Call fetchClasses on component mount
    onMount(async () => {
        try {
            classes = await fetchClasses();
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    });

    // Function to submit class information
    async function submitClass() {
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ className, scheduleTime, attendance, maxParticipants }),
        });

        if (!response.ok) {
            console.error('Failed to submit class');
            return;
        }

        // After successfully adding a class, re-fetch the classes to update the list
        classes = await fetchClasses(); 

        // Reset form fields
        className = '';
        scheduleTime = '';
        attendance = 0;
        maxParticipants = 0;
    }

    // Function to handle form submission
    function handleClassesSubmit(event: SubmitEvent) {
        event.preventDefault();
        submitClass();
    }

    // Function to delete a class
    async function deleteClass(classId: number) {
        const response = await fetch(`/api/classes/${classId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            console.error('Failed to delete class');
            return;
        }

        // Re-fetch the classes to update the list after deletion
        classes = await fetchClasses();
    }

    function startEditing(classId: number) {
        editingClassId = classId;
    }

    function stopEditing() {
        editingClassId = null;
    }
    async function updateClass(classId: number) {
        const classToUpdate = classes.find(c => c.classId === classId);
        if (!classToUpdate) return;

        const response = await fetch(`/api/classes/${classId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(classToUpdate),
        });

        if (!response.ok) {
            console.error('Failed to update class');
            return;
        }

        classes = await fetchClasses(); // Refresh the class list
        stopEditing(); // Exit edit mode
    }
</script>
    <Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">Add a class</Heading>
    <form id="classForm" class="bg-white dark:bg-gray-800 p-5" on:submit|preventDefault={handleClassesSubmit}>
        <div class="grid gap-6 mb-6 md:grid-cols-2">
            <div>
                <Label for="className" class="mb-2">Class Name:</Label>
                <Input type="text" id="className" placeholder="i.e. Yoga" bind:value={className} required />
            </div>
            <div>
                <Label for="scheduleTime" class="mb-2">Schedule Time:</Label>
                <Input type="datetime-local" id="scheduleTime"  bind:value={scheduleTime} required />
            </div>
            <div>
                <Label for="attendance" class="mb-2">Attendance:</Label>
                <Input type="number" id="attendance" bind:value={attendance} required />
            </div>
            <div>
                <Label for="maxParticipants" class="mb-2">Max Participants:</Label>
                <Input type="number" id="maxParticipants" placeholder='12' bind:value={maxParticipants} required />
                <Helper class="text-sm mt-2">
                    This is the maximum amount of participants that can be in the class each time it runs.
                </Helper>
            </div>
        </div>  
        <Button size="lg" class="w-32" type="submit" color="green">Submit</Button>  
    </form>
<Table class="mt-4">
    <caption class="p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        Fitness Classes
        <p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">Here are a list of the current fitness classes offered at the gym.</p>
    </caption>
    <TableHead>
            <TableHeadCell>Class ID</TableHeadCell>
            <TableHeadCell>Class Name</TableHeadCell>
            <TableHeadCell>Schedule Time</TableHeadCell>
            <TableHeadCell>Attendance</TableHeadCell>
            <TableHeadCell>Max Participants</TableHeadCell>
            <TableHeadCell>Actions</TableHeadCell>
    </TableHead>
    <TableBody>
        {#each classes as classItem}
    <TableBodyRow>
        <TableBodyCell>{classItem.classId}</TableBodyCell>
        {#if editingClassId === classItem.classId}
            <TableBodyCell><Input type="text" bind:value={classItem.className} /></TableBodyCell>
            <TableBodyCell><Input type="datetime-local" bind:value={classItem.scheduleTime} /></TableBodyCell>
            <TableBodyCell><Input type="number" bind:value={classItem.attendance} /></TableBodyCell>
            <TableBodyCell><Input type="number" bind:value={classItem.maxParticipants} /></TableBodyCell>
        {:else}
            <TableBodyCell>{classItem.className}</TableBodyCell>
            <TableBodyCell>{formatScheduleTime(classItem.scheduleTime)}</TableBodyCell>
            <TableBodyCell>{classItem.attendance}</TableBodyCell>
            <TableBodyCell>{classItem.maxParticipants}</TableBodyCell>
        {/if}
        <TableBodyCell>
            {#if editingClassId === classItem.classId}
                <Button color="green" on:click={() => updateClass(classItem.classId)}>Save</Button>
                <Button color="light" on:click={stopEditing}>Cancel</Button>
            {:else}
                <Button color="blue" on:click={() => startEditing(classItem.classId)}>Edit</Button>
                <Button color="red" on:click={() => deleteClass(classItem.classId)}>Delete</Button>
            {/if}
        </TableBodyCell>
    </TableBodyRow>
{/each}
    </TableBody>
</Table>
<style>

</style>