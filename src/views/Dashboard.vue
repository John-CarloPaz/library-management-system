<template>
    <AppBar title="Dashboard"/>

    <v-row class="d-flex w-100 h-100 justify-center align-center flex-column">
        <p class="text-h3">Welcome to the SPCF LMS</p>
        <p class="mt-3 text-grey">Dashboard will be updated on the next annex version.</p>
    </v-row>

    
</template>

<script>
import AppBar from '../components/AppBar.vue'
import ClassSchedule from '../components/ClassSchedule.vue'
import ProfileID from '../components/ProfileID.vue'
export default {
    name: 'Dashboard',
    components: {
        AppBar,
        ClassSchedule,
        ProfileID,
    },
    }
</script>

<style>
    .line-height-1 p {
        line-height: 1.2;
    }
    .c-49 {
        height: 48%;
    }
    .c-2 {
        height: 4%;
    }
    .bg-gradient {
        background: linear-gradient(90deg,rgba(66, 165, 245, 1) 0%, rgba(20, 91, 199, 1) 100%);
    }
</style>