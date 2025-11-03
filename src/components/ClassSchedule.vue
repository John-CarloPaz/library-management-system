<template>
    <v-card class="w-100" rounded="lg">
        <div class="bg-gradient pa-4">
            <p class="text-subtitle-1 text-white">Class Schedule</p>
        </div>
        <v-row class="mx-5 my-2"> 
            <v-col cols="6" class="" v-for="(schedule, index) in schedules" :key="index">
                <p class="text-h6 font-weight-medium mb-2">{{ schedule.day }}</p>
                <v-card :class="`bg-blue-accent-${(index % 5) + 1} text-black mb-4 w-100 pa-5 d-flex justify-space-between align-center`" v-for="(detail, index) in schedule.details" :key="index">
                    <div class="line-height-1 text-white">
                        <p class="text-h6">{{ detail.subject }}</p>
                        <p class="text-subtitle-1">{{ detail.professor }}</p>
                    </div>
                    <p class="text-white">
                        {{ detail.time }}
                    </p>
                </v-card>
            </v-col>
        </v-row>
    </v-card> 
</template>

<script>
    export default {
        name: 'ClassSchedule',
        data() {
        return {
            schedules: [
                {
                    day: 'Monday',
                    details: [
                        {
                            subject: 'Subject 1',
                            time: '8:00 AM - 9:30 AM',
                            professor: 'Dr. Andrew E',
                        },
                        {
                            subject: 'Subject 2',
                            time: '8:00 AM - 9:30 AM',
                            professor: 'Dr. Andrew E',
                        },
                        {
                            subject: 'Subject 3',
                            time: '8:00 AM - 9:30 AM',
                            professor: 'Dr. Andrew E',
                        },
                    ],
                },
                {
                    day: 'Tuesday',
                    details: [
                        {
                            subject: 'Subject 4',
                            time: '10:00 AM - 11:30 AM',
                            professor: 'Dr. Andrew E',
                        },
                        {
                            subject: 'Subject 5',
                            time: '10:00 AM - 11:30 AM',
                            professor: 'Dr. Andrew E',
                        },
                        {
                            subject: 'Subject 6',
                            time: '10:00 AM - 11:30 AM',
                            professor: 'Dr. Andrew E',
                        },
                    ],
                },
                {
                    day: 'Wednesday',
                    details: [
                        {
                            subject: 'Subject 7',
                            time: '1:00 PM - 2:30 PM',
                            professor: 'Dr. Andrew E',
                        },
                        {
                            subject: 'Subject 8',
                            time: '1:00 PM - 2:30 PM',
                            professor: 'Dr. Andrew E',
                        },
                    ],
                },
                {
                    day: 'Thursday',
                    details: [
                        {
                            subject: 'Subject 9',
                            time: '3:00 PM - 4:30 PM',
                            professor: 'Dr. Andrew E',
                        },
                        {
                            subject: 'Subject 10',
                            time: '3:00 PM - 4:30 PM',
                            professor: 'Dr. Andrew E',
                        },
                        {
                            subject: 'Subject 11',
                            time: '3:00 PM - 4:30 PM',
                            professor: 'Dr. Andrew E',
                        },
                    ],
                },
                {
                    day: 'Friday',
                    details: [
                        {
                            subject: 'Subject 12',
                            time: '8:00 AM - 9:30 AM',
                            professor: 'Dr. Andrew E',
                        },
                        {
                            subject: 'Subject 13',
                            time: '8:00 AM - 9:30 AM',
                            professor: 'Dr. Andrew E',
                        },
                        {
                            subject: 'Subject 14',
                            time: '10:00 AM - 11:30 AM',
                            professor: 'Dr. Andrew E',
                        },
                        {
                            subject: 'Subject 15',
                            time: '10:00 AM - 11:30 AM',
                            professor: 'Dr. Andrew E',
                        },
                    ],
                },
            ],
        }
        },
    }
</script>