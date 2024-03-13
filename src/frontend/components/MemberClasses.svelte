<script lang="ts">
    import { onMount } from 'svelte';
    import { Heading, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Input, Helper, Button, Label } from 'flowbite-svelte';
    import type { MemberClasses, Class, Members } from '../types/modelTypes'; 
    import { fetchMemberClasses } from '../api/fetchMemberClasses';
    import fetchClasses from '../api/fetchClasses';
    import { fetchMembers } from '../api/fetchMembers';
    import { formatScheduleTime } from '../utility/timeFormatter';

    let members: Members[] = [];
    let classes: Class[] = [];
    let memberId: number = 0;
    let classId: number = 0;
    let registrationDate: string = '';
    let memberClasses: MemberClasses[] = []; 
    let editingState: { memberClassId: number | null; classId: number | null; memberId: number | null; registrationDate: string | null } = { memberClassId: null, classId: null, memberId: null, registrationDate: null };
    // Fetch member classes on component mount
    onMount(async () => {
        try {
            [members, classes, memberClasses] = await Promise.all([
                fetchMembers(),
                fetchClasses(),
                fetchMemberClasses()
            ]);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    });

    async function submitMemberClass() {
        // Validation: Check if all required fields are filled
        if (!memberId || !classId || !registrationDate) {
            console.error('All fields are required');
            return;
        }

        try {
            // Sending the POST request to the server
            const response = await fetch('/api/memberClasses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    memberId,
                    classId,
                    registrationDate,
                }),
            });

            if (!response.ok) {
                // Handling responses that are not 2xx
                throw new Error('Network response was not ok');
            }

            // Processing the successful response
            const result = await response.json();
            console.log('Member class registration successful:', result);

            // Resetting form fields after successful submission
            memberId = 0;
            classId = 0;
            registrationDate = '';

            // Refreshing the list of member classes to include the new registration
            memberClasses = await fetchMemberClasses();

        } catch (error) {
            // Handling any errors that occurred during the fetch operation
            console.error('Failed to submit member class:', error);
        }
    }

    // Function to handle editing of member classes
    async function updateMemberClass() {
        if (!editingState.memberClassId) {
            console.error('Member class ID is required');
            return;
        }

        try {
            const response = await fetch(`/api/memberClasses/${editingState.memberClassId}`, {
                method: 'PUT', 
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    memberId: editingState.memberId,
                    classId: editingState.classId,
                    registrationDate: editingState.registrationDate,
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            console.log('Member class update successful');
            stopEditing(); // Reset editing state
            memberClasses = await fetchMemberClasses(); // Refresh list
        } catch (error) {
            console.error('Failed to update member class:', error);
        }
    }

    function handleMemberClassesSubmit(event: SubmitEvent) {
        event.preventDefault();
        submitMemberClass();
    }

    function startEditing(memberClassId: number, classId: number, memberId: number, registrationDate: string) {
        editingState = { memberClassId, classId, memberId, registrationDate };
    }

    // Function to stop editing
    function stopEditing() {
        editingState = { memberClassId: null, classId: null, memberId: null, registrationDate: null };
    }


    // Function to delete a member class registration
    async function deleteMemberClass(memberClassId: number) {
        try {
            const response = await fetch(`/api/memberClasses/${memberClassId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Network response was not ok');
            }

            console.log('Member class deleted successfully');
            memberClasses = await fetchMemberClasses(); // Refresh list
        } catch (error) {
            console.error('Failed to delete member class:', error);
        }
    }
</script>

<Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">Register for a class</Heading>
<form id="memberClassForm" class="bg-white dark:bg-gray-800 p-5" on:submit|preventDefault={handleMemberClassesSubmit}>
    <div class="grid gap-6 mb-6 md:grid-cols-2">
        <div>
            <Label for="memberId" class="mb-2">Member:</Label>
            <select id="memberId" bind:value={memberId} required>
                <option value="" disabled>Select a member</option>
                {#each members as member}
                    <option value={member.memberId}>{member.memberName}</option>
                {/each}
            </select>
        </div>
        <div>
            <Label for="classId" class="mb-2">Class:</Label>
            <select id="classId" bind:value={classId} required>
                <option value="" disabled>Select a class</option>
                {#each classes as classItem}
                    <option value={classItem.classId}>{classItem.className}</option>
                {/each}
            </select>
        </div>
        <div>
            <Label for="registrationDate" class="mb-2">Registration Date:</Label>
            <Input type="date" id="registrationDate" bind:value={registrationDate} required />
        </div>
    </div>  
    <Button size="lg" class="w-32" type="submit" color="green">Register</Button>  
</form>

<Table class="mt-4">
    <caption class="p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        Current Registrations
        <p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">List of current member class registrations.</p>
    </caption>
    <TableHead>
        <TableHeadCell>Member ID</TableHeadCell>
        <TableHeadCell>Class ID</TableHeadCell>
        <TableHeadCell>Registration Date</TableHeadCell>
        <TableHeadCell>Actions</TableHeadCell>
    </TableHead>
    <TableBody>
        {#each memberClasses as memberClass}
            <TableBodyRow>
                <!-- Member ID Cell -->
                <TableBodyCell>
                    {#if editingState.memberClassId === memberClass.memberClassId}
                        <select bind:value={editingState.memberId}>
                            <option value="" disabled>Select a member</option>
                            {#each members as member}
                                <option value={member.memberId}>{member.memberName}</option>
                            {/each}
                        </select>
                    {:else}
                        <!-- Display the member's name by ID, or 'Unknown Member' if not found, using optional chaining for safety. -->
                        {members.find(m => m.memberId === memberClass.memberId)?.memberName || 'Unknown Member'}
                    {/if}
                </TableBodyCell>

                <!-- Class ID Cell -->
                <TableBodyCell>
                    {#if editingState.memberClassId === memberClass.memberClassId}
                        <select bind:value={editingState.classId}>
                            <option value="" disabled>Select a class</option>
                            {#each classes as classItem}
                                <option value={classItem.classId}>{classItem.className}</option>
                            {/each}
                        </select>
                    {:else}
                        <!-- Display the class's name by ID, or 'Unknown Class' if not found, using optional chaining for safety. -->
                        {classes.find(c => c.classId === memberClass.classId)?.className || 'Unknown Class'}
                    {/if}
                </TableBodyCell>

                <!-- Registration Date Cell -->
                <TableBodyCell>{formatScheduleTime(memberClass.registrationDate)}</TableBodyCell>

                <!-- Actions Cell -->
                <TableBodyCell>
                    {#if editingState.memberClassId === memberClass.memberClassId}
                        <!-- Edit Mode: Display Save and Cancel Buttons -->
                        <Button color="green" on:click={updateMemberClass}>Save</Button>
                        <Button color="light" on:click={stopEditing}>Cancel</Button>
                    {:else}
                        <!-- Default Mode: Display Edit and Delete Buttons -->
                        <Button color="blue" on:click={() => startEditing(memberClass.memberClassId, memberClass.classId, memberClass.memberId, memberClass.registrationDate)}>Edit</Button>
                        <Button color="red" on:click={() => deleteMemberClass(memberClass.memberClassId)}>Delete</Button>                    
                    {/if}
                </TableBodyCell>
            </TableBodyRow>
        {/each}
    </TableBody>
</Table>