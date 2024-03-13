<script lang="ts">
  import { Tabs, TabItem, Card, Button } from 'flowbite-svelte';
  import Classes from './frontend/components/Classes.svelte';
  import MemberClasses from './frontend/components/MemberClasses.svelte';
  import Equipment from './frontend/components/Equipment.svelte';
  import Members from './frontend/components/Members.svelte';
  import Instructors from './frontend/components/Instructors.svelte';
  import ClassInstructors from './frontend/components/ClassInstructors.svelte';
  import MaintenenceRequests from './frontend/components/MaintenenceRequests.svelte';

  let activeTab: string | null = null; 
  
</script>

<Tabs>
  <TabItem title="Classes" on:click={() => activeTab = 'Classes'}>
    {#if activeTab === 'Classes'}<Classes />{/if}
  </TabItem>
  <TabItem title="Member Classes" on:click={() => activeTab = 'MemberClasses'}>
    {#if activeTab === 'MemberClasses'}<MemberClasses />{/if}
  </TabItem>
  <TabItem title="Equipment" on:click={() => activeTab = 'Equipment'}>
    {#if activeTab === 'Equipment'}<Equipment />{/if}
  </TabItem>
  <TabItem title="Members" on:click={() => activeTab = 'Members'}>
    {#if activeTab === 'Members'}<Members />{/if}
  </TabItem>
  <TabItem title="Instructors" on:click={() => activeTab = 'Instructors'}>
    {#if activeTab === 'Instructors'}<Instructors />{/if}
  </TabItem>
  <TabItem title="Class Instructors" on:click={() => activeTab = 'Class Instructors'}>
    {#if activeTab === 'Class Instructors'}<ClassInstructors />{/if}
  </TabItem>
  <TabItem title="Maintenance Requests" on:click={() => activeTab = 'Maintenance Requests'}>
    {#if activeTab === 'Maintenance Requests'}<MaintenenceRequests />{/if}
  </TabItem>
</Tabs>

 <!-- Welcome message and Get Started button -->
<div class="mt-4 px-4">
  {#if activeTab === null}
    <Card class="max-w-4xl mx-auto">
      <h2 class="text-2xl font-bold text-center mb-4">Welcome to the Gym Database Management System</h2>
      <p class="mb-4 text-center">Please click on one of the tabs above to begin managing the database.</p>
    </Card>
  {/if}
</div>
<style>
  
</style>