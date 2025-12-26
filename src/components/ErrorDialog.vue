<template>
    <v-dialog v-model="isVisible" width="400" persistent @update:modelValue="handleClose">
        <v-card>
            <v-card-title class="d-flex align-center gap-2">
                <v-icon :color="isError ? 'error' : 'success'">
                    {{ isError ? 'fa-circle-exclamation' : 'fa-circle-check' }}
                </v-icon>
                {{ title }}
            </v-card-title>
            <v-card-text>{{ message }}</v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="handleClose" variant="tonal">Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
export default {
    name: 'ErrorDialog',
    props: {
        visible: {
            type: Boolean,
            default: false,
        },
        title: {
            type: String,
            default: '',
        },
        message: {
            type: String,
            default: '',
        },
        isError: {
            type: Boolean,
            default: true,
        },
    },
    emits: ['update:visible'],
    computed: {
        isVisible: {
            get() {
                return this.visible
            },
            set(value) {
                this.$emit('update:visible', value)
            },
        },
    },
    methods: {
        handleClose() {
            this.isVisible = false
        },
    },
}
</script>
