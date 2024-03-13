<script lang="ts">
    import { onMount } from 'svelte';
    import type { Members } from '../types/modelTypes'; 
    import { fetchMembers } from '../api/fetchMembers';
    import { Button, Input, Label, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Heading } from 'flowbite-svelte';
    import { formatScheduleTime } from '../utility/timeFormatter';

    let memberName: string = '';
    let email: string = '';
    let dateJoined: string = '';
    let membershipType: string = 'Standard';
    let members: Members[] = [];
    let editingMemberId: number | null = null;

    onMount(async () => {
        try {
            members = await fetchMembers();
        } catch (error) {
            console.error('Failed to fetch equipment:', error);
        }
    });

    async function submitMember() {
        const response = await fetch('/api/members', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ memberName, email, dateJoined, membershipType }),
        });

        if (!response.ok) {
            console.error('Failed to submit equipment');
            return;
        }

        // After successfully adding a member, re-fetch the member list to update the UI
        members = await fetchMembers();

        // Reset form fields
        memberName = '';
        email = '';
        dateJoined = '';
        membershipType = '';
    }

    function handleMemberSubmit(event: SubmitEvent) {
        event.preventDefault();
        submitMember();
    }

    async function deleteMember(memberId: number) {
        const response = await fetch(`/api/members/${memberId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            console.error('Failed to delete member');
            return;
        }

        // Re-fetch the members to update the list after deletion
        members = await fetchMembers();
    }

    function startEditing(memberId: number) {
        editingMemberId = memberId;
    }

    function stopEditing() {
        editingMemberId = null;
    }

    async function updateMembers(memberId: number) {
        const membersToUpdate = members.find(e => e.memberId === editingMemberId);
        if (!membersToUpdate) return;

        const response = await fetch(`/api/members/${memberId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(membersToUpdate),
        });

        if (!response.ok) {
            console.error('Failed to update equipment');
            return;
        }

        // After successfully updating the equipment, re-fetch the equipment list to update the UI
        members = await fetchMembers();

        // Exit editing mode
        stopEditing()
    }
</script>

<Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">Add or edit a member</Heading>
<form id="memberForm" on:submit|preventDefault={handleMemberSubmit} class="bg-white dark:bg-gray-800 p-5">
    <div class="grid gap-6 mb-6 md:grid-cols-2">
        <div>
            <Label for="memberName" class="mb-2">Member Name:</Label>
            <Input type="text" id="memberName" placeholder="John Doe" bind:value={memberName} required />
        </div>
        <div>
            <Label for="email" class="mb-2">Email:</Label>
            <Input type="email" id="email" placeholder="john.doe@example.com" bind:value={email} required />
        </div>
        <div>
            <Label for="dateJoined" class="mb-2">Date Joined:</Label>
            <Input type="date" id="dateJoined" bind:value={dateJoined} required />
        </div>
        <div>
            <Label for="membershipType" class="mb-2">Membership Type:</Label>
            <Input type="text" id="membershipType" placeholder="Standard" bind:value={membershipType} />
        </div>
    </div>  
    <Button size="lg" class="w-32" type="submit" color="green">Submit</Button>  
</form>
<Table class="mt-4">
    <caption class="p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        Gym Members
        <p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">Here is a list of the current members at the gym.</p>
    </caption>
    <TableHead>
        <TableHeadCell>Member ID</TableHeadCell>
        <TableHeadCell>Name</TableHeadCell>
        <TableHeadCell>Email</TableHeadCell>
        <TableHeadCell>Date Joined</TableHeadCell>
        <TableHeadCell>Membership Type</TableHeadCell>
        <TableHeadCell>Actions</TableHeadCell>
    </TableHead>
    <TableBody>
        {#each members as member}
            <TableBodyRow>
                <TableBodyCell>{member.memberId}</TableBodyCell>
                {#if editingMemberId === member.memberId}
                    <TableBodyCell><Input type="text" bind:value={member.memberName} /></TableBodyCell>
                    <TableBodyCell><Input type="email" bind:value={member.email} /></TableBodyCell>
                    <TableBodyCell><Input type="date" bind:value={member.dateJoined} /></TableBodyCell>
                    <TableBodyCell><Input type="text" bind:value={member.membershipType} /></TableBodyCell>
                {:else}
                    <TableBodyCell>{member.memberName}</TableBodyCell>
                    <TableBodyCell>{member.email}</TableBodyCell>
                    <TableBodyCell>{formatScheduleTime(member.dateJoined)}</TableBodyCell>
                    <TableBodyCell>{member.membershipType}</TableBodyCell>
                {/if}
                <TableBodyCell>
                    {#if editingMemberId === member.memberId}
                        <Button color="green" on:click={() => updateMembers(member.memberId)}>Save</Button>
                        <Button color="light" on:click={stopEditing}>Cancel</Button>
                    {:else}
                        <Button color="blue" on:click={() => startEditing(member.memberId)}>Edit</Button>
                        <Button color="red" on:click={() => deleteMember(member.memberId)}>Delete</Button>
                    {/if}
                </TableBodyCell>
            </TableBodyRow>
        {/each}
    </TableBody>
</Table>