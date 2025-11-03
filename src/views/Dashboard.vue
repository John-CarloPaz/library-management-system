<template>
    <AppBar title="Dashboard"/>

    <v-row class="mx-1 my-2">
        <v-col cols="7" class="d-flex">
            <ProfileID/>
        </v-col>

        <v-col cols="5">
            <v-card class="c-49" rounded="lg">
                <div class="bg-blue-darken-1 pa-4">
                    <p class="text-subtitle-1 text-white">Course Count</p>
                </div>
                <v-card-title class="text-h5 pa-5">10/20</v-card-title>
            </v-card> 
            <div class="c-2"></div>
            <v-card class="c-49" rounded="lg">
                <div class="bg-blue-darken-1 pa-4">
                    <p class="text-subtitle-1 text-white">Outstanding Balance</p>
                </div>
                <v-card-title class="text-h5 pa-5">20,000</v-card-title>
            </v-card> 
        </v-col>

        <v-col cols="12">
            <ClassSchedule/>
        </v-col>
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