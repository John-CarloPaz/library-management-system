<template>
    <v-card 
        v-if="show" 
        :elevation="1" 
        class="mb-4"
        :class="bannerClass"
    >
        <v-card-text class="d-flex align-center justify-space-between pa-3">
            <div class="d-flex align-center">
                <v-icon :icon="icon" class="mr-2"></v-icon>
                <span class="font-weight-medium">{{ message }}</span>
            </div>
            <v-btn 
                icon="fa-xmark" 
                size="x-small" 
                variant="plain"
                @click="close"
            ></v-btn>
        </v-card-text>
    </v-card>
</template>

<script>
export default {
    name: 'status-banner',
    props: {
        type: {
            type: String,
            default: 'success',
            validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
        },
        message: {
            type: String,
            required: true
        },
        duration: {
            type: Number,
            default: 5000,
            description: 'Auto-hide duration in milliseconds. Set to 0 to disable auto-hide'
        }
    },
    data() {
        return {
            show: true,
            timeout: null
        }
    },
    computed: {
        icon() {
            const icons = {
                success: 'fa-circle-check',
                error: 'fa-circle-xmark',
                warning: 'fa-triangle-exclamation',
                info: 'fa-circle-info'
            }
            return icons[this.type] || 'fa-circle-info'
        },
        bannerClass() {
            const classes = {
                success: 'bg-success text-white',
                error: 'bg-error text-white',
                warning: 'bg-warning text-white',
                info: 'bg-info text-white'
            }
            return classes[this.type] || 'bg-info text-white'
        }
    },
    watch: {
        message() {
            this.show = true
            this.resetTimer()
        }
    },
    mounted() {
        this.resetTimer()
    },
    beforeUnmount() {
        if (this.timeout) {
            clearTimeout(this.timeout)
        }
    },
    methods: {
        close() {
            this.show = false
            if (this.timeout) {
                clearTimeout(this.timeout)
            }
        },
        resetTimer() {
            if (this.timeout) {
                clearTimeout(this.timeout)
            }

            // Only auto-hide if duration > 0 and type is 'success'
            if (this.duration > 0 && this.type === 'success') {
                this.timeout = setTimeout(() => {
                    this.show = false
                }, this.duration)
            }
        }
    }
}
</script>
