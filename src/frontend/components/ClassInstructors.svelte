<script lang="ts">
    import { onMount } from 'svelte';
    import { Button, Input, Label, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Heading } from 'flowbite-svelte';
    import type { Class, Instructors, ClassInstructors } from '../types/modelTypes';
    import { fetchClasses } from '../api/fetchClasses';
    import { fetchInstructors } from '../api/fetchInstructors';
    import { fetchClassInstructors } from '../api/fetchClassInstrcutors'; 

    let classes: Class[] = [];
    let instructors: Instructors[] = [];
    let classId: number = 0;
    let instructorId: number = 0;
    let classInstructors: ClassInstructors[] = []; 
    let editingState: { classInstructorId: number | null; classId: number | null; instructorId: number | null; } = { classInstructorId: null, classId: null, instructorId: null };

    onMount(async () => {
        try {
            [instructors, classes, classInstructors] = await Promise.all([
                fetchInstructors(),
                fetchClasses(),
                fetchClassInstructors()
            ]);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    });

    async function submitClassInstructors() {
        // Validation: Check if all required fields are filled
        if (!instructorId || !classId) {
            console.error('All fields are required');
            return;
        }

        try {
            // Sending the POST request to the server
            const response = await fetch('/api/classInstructors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    classId,
                    instructorId,
                }),
            });

            if (!response.ok) {
                // Handling responses that are not 2xx
                throw new Error('Network response was not ok');
            }

            // Processing the successful response
            const result = await response.json();
            console.log('Class Instructor registration successful:', result);

            // Resetting form fields after successful submission
            classId = 0;
            instructorId = 0;

            // Refreshing the list of member classes to include the new registration
            classInstructors = await fetchClassInstructors();

        } catch (error) {
            // Handling any errors that occurred during the fetch operation
            console.error('Failed to submit member class:', error);
        }
    }

    function handleClassInstructorSubmit(event: SubmitEvent) {
        event.preventDefault();
        submitClassInstructors();
    }

    // Function to handle editing of instructor classes
    async function updateMemberClass() {
        if (!editingState.classInstructorId) {
            console.error('Class Instructor ID is required');
            return;
        }

        try {
            const response = await fetch(`/api/classInstructors/${editingState.classInstructorId}`, {
                method: 'PUT', 
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    classId: editingState.classId,
                    instructorId: editingState.instructorId,
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            console.log('Instructor class update successful');
            stopEditing(); // Reset editing state
            classInstructors = await fetchClassInstructors(); // Refresh list
        } catch (error) {
            console.error('Failed to update member class:', error);
        }
    }  

    function startEditing(classInstructorId: number, classId: number, instructorId: number) {
        editingState = { classInstructorId, classId, instructorId };
    }

    // Function to stop editing
    function stopEditing() {
        editingState = { classInstructorId: null, classId: null, instructorId: null };
    }

    // Function to delete a class instructor registration
    async function deleteClassInstructor(classInstructorId: number) {
        try {
            const response = await fetch(`/api/classInstructors/${classInstructorId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Network response was not ok');
            }

            console.log('Cass Instructor deleted successfully');
            classInstructors = await fetchClassInstructors(); // Refresh list
        } catch (error) {
            console.error('Failed to delete class instructors:', error);
        }
    }

</script>

<Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">Assign an instructor to a class</Heading>
<form id="classInstructorForm" class="bg-white dark:bg-gray-800 p-5" on:submit|preventDefault={handleClassInstructorSubmit}>
    <div class="grid gap-6 mb-6 md:grid-cols-2">
        <div>
            <Label for="classId">Class:</Label>
            <select id="classId" bind:value={classId} required>
                <option value="" disabled>Select a class</option>
                {#each classes as classItem}
                    <option value={classItem.classId}>{classItem.className}</option>
                {/each}
            </select>
        </div>
        <div>
            <Label for="instructorId">Instructor:</Label>
            <select id="instructorId" bind:value={instructorId} required>
                <option value="" disabled>Select an instructor</option>
                {#each instructors as instructor}
                    <option value={instructor.instructorId}>{instructor.instructorName}</option>
                {/each}
            </select>
        </div>
        <Button size="lg" class="w-32" type="submit" color="green">Register</Button>  
    </div>
</form>

<Table class="mt-4">
    <caption class="p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        Current Class Instructors
        <p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">List of current classes offered and the instructors leading them.</p>
    </caption>
    <TableHead>
        <TableHeadCell>Class Name</TableHeadCell>
        <TableHeadCell>Instructor Name</TableHeadCell>
        <TableHeadCell>Actions</TableHeadCell>
    </TableHead>
    <TableBody>
        {#each classInstructors as classInstructor}
            <TableBodyRow>
                <!-- Class ID Cell -->
                <TableBodyCell>
                    {#if editingState.classInstructorId === classInstructor.classInstructorId}
                        <select bind:value={editingState.classId}>
                            <option value="" disabled>Select a class</option>
                            {#each classes as classItem}
                                <option value={classItem.classId}>{classItem.className}</option>
                            {/each}
                        </select>
                    {:else}
                        <!-- Display the class's name by ID, or 'Unknown Class' if not found, using optional chaining for safety. -->
                        {classes.find(c => c.classId === classInstructor.classId)?.className || 'Unknown Class'}
                    {/if}
                </TableBodyCell>

                <!-- Instructor ID Cell -->
                <TableBodyCell>
                    {#if editingState.classInstructorId === classInstructor.classInstructorId}
                        <select bind:value={editingState.instructorId}>
                            <option value="" disabled>Select a class</option>
                            {#each instructors as instructor}
                                <option value={instructor.instructorId}>{instructor.instructorName}</option>
                            {/each}
                        </select>
                    {:else}
                        <!-- Display the instructor's name by ID, or 'Unknown Instructor' if not found, using optional chaining for safety. -->
                        {instructors.find(i => i.instructorId === classInstructor.instructorId)?.instructorName || 'Unknown Instructor'}
                    {/if}
                </TableBodyCell>

                <!-- Actions Cell -->
                <TableBodyCell>
                    {#if editingState.classInstructorId === classInstructor.classInstructorId}
                        <!-- Edit Mode: Display Save and Cancel Buttons -->
                        <Button color="green" on:click={updateMemberClass}>Save</Button>
                        <Button color="light" on:click={stopEditing}>Cancel</Button>
                    {:else}
                        <!-- Default Mode: Display Edit and Delete Buttons -->
                        <Button color="blue" on:click={() => startEditing(classInstructor.classInstructorId, classInstructor.classId, classInstructor.instructorId)}>Edit</Button>
                        <Button color="red" on:click={() => deleteClassInstructor(classInstructor.classInstructorId)}>Delete</Button>                    
                    {/if}
                </TableBodyCell>
            </TableBodyRow>
        {/each}
    </TableBody>
</Table>