<template>
    <v-app-bar flat class="border-b" elevation="0">
        <v-row class="d-flex align-center justify-space-around">
            <v-col class="ml-4">
                <v-app-bar-title>{{ title }}</v-app-bar-title>
                <BreadCrumbs />
            </v-col>

            <v-col>
                <div>
                    <slot name="search-actions"></slot>
                </div>
            </v-col>

            <v-col class="d-flex justify-end mr-4">
                <div>
                    <slot name="button-actions"></slot>
                    <v-btn v-if="canNotif" icon="fa-earth-asia" size="x-small" variant="tonal" class="ml-8 mr-2" />
                    <v-btn v-if="!canNotif" icon="fa-bell" size="x-small" variant="tonal" class="ml-8 mr-2"/>
                    <v-btn v-if="canNotif" icon="fa-bell" size="x-small" variant="tonal" class="mr-2"/>
                    <v-btn icon="fa-message" size="x-small" variant="tonal"  />
                </div>
            </v-col>

        </v-row>

    </v-app-bar>
</template>

<script>
import BreadCrumbs from './BreadCrumbs.vue';
import { ACTIONS, can as canCheck, requirePermission } from '@/services/permission';

export default {
    name: 'AppBar',
    components: { BreadCrumbs },
    props: {
        title: {
            type: String,
            required: true,
        }
    },
    data() {
        return {
            canArchive: canCheck(ACTIONS.ARCHIVE),
            canEdit: canCheck(ACTIONS.EDIT),
            canCreate: canCheck(ACTIONS.CREATE),
            canNotif: canCheck(ACTIONS.NOTIF),
        }
    },
    methods: {
        updatePermissions() {
            this.canArchive = canCheck(ACTIONS.ARCHIVE)
            this.canEdit = canCheck(ACTIONS.EDIT)
            this.canCreate = canCheck(ACTIONS.CREATE)
            this.canNotif = canCheck(ACTIONS.NOTIF)
        },
    }
};
</script>
