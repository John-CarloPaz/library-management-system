<template>
    <AppBar title="Dashboard"/>

    <v-row class="mx-1 my-2">
        <v-col>
            <v-card class="h-100" rounded="lg">
                <div class="bg-gradient pa-4">
                    <p class="text-subtitle-1 text-white">Enrolled Subjects</p>
                </div>
                <div class="w-100 ml-5 d-flex justify-start">
                    <v-row class="d-flex my-0 justify-center">
                        <v-col cols="12" class="ma-0 pb-0 d-flex justify-start align-center">
                            <div class="line-height-1 ma-5">
                                <p class="text-subtitle-2 text-grey-darken-1">Program</p>
                                <p class="font-weight-medium text-grey-darken-4">Bachelor of Science in Information Technology with Specialization in Mobile Development</p>
                            </div>
                        </v-col>
                        <v-col cols="12" class="ma-0 py-0 d-flex justify-start align-center">
                            <div class="line-height-1 ma-5">
                                <p class="text-subtitle-2 text-grey-darken-1">Year Level & Semester</p>
                                <p class="font-weight-medium text-grey-darken-4">2nd Semester, S.Y. 2024-2025</p>
                            </div>
                        </v-col>
                        <v-col>
                            <v-data-table :items="items" hide-default-footer></v-data-table>
                        </v-col>
                    </v-row>
                </div>
            </v-card>
        </v-col>
    </v-row>
</template>

<script>
import AppBar from '../components/AppBar.vue'

export default {
    name: 'Dashboard',
    components: {
        AppBar,
    },

    data() {
        return {
            items: [
                {
                    Code: 'BSIT_101',
                    description: 'Bachelor of Science in Information Technology',
                    Units: '3',
                    Professor: 'Dr. Andrew E',
                },
                {
                    Code: 'BSIT_101',
                    description: 'Bachelor of Science in Information Technology',
                    Units: '3',
                    Professor: 'Dr. Andrew E',
                },
                {
                    Code: 'BSIT_101',
                    description: 'Bachelor of Science in Information Technology',
                    Units: '3',
                    Professor: 'Dr. Andrew E',
                },
                {
                    Code: 'BSIT_101',
                    description: 'Bachelor of Science in Information Technology',
                    Units: '3',
                    Professor: 'Dr. Andrew E',
                },
                {
                    Code: 'BSIT_101',
                    description: 'Bachelor of Science in Information Technology',
                    Units: '3',
                    Professor: 'Dr. Andrew E',
                },
                {
                    Code: 'BSIT_101',
                    description: 'Bachelor of Science in Information Technology',
                    Units: '3',
                    Professor: 'Dr. Andrew E',
                },
                {
                    Code: 'BSIT_101',
                    description: 'Bachelor of Science in Information Technology',
                    Units: '3',
                    Professor: 'Dr. Andrew E',
                },
                {
                    Code: 'BSIT_101',
                    description: 'Bachelor of Science in Information Technology',
                    Units: '3',
                    Professor: 'Dr. Andrew E',
                },

            ],
        }
    }
}
</script>