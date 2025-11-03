<template>
    <AppBar title="Return Books"/>

    <v-row class="d-flex w-100 h-100 justify-center align-center flex-column">
        <p class="text-h3">Welcome to the SPCF LMS</p>
        <p class="mt-3 text-grey">Book Returning will be updated on the next annex version.</p>
    </v-row>

    
</template>

<script>
import AppBar from '../components/AppBar.vue'
export default {
    name: 'return-book',
    components: {
        AppBar,
    },
    }
</script>