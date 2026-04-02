<template>
    <v-dialog v-model="isVisible" width="400" persistent @update:modelValue="handleClose">
        <v-card>
            <v-card-title class="d-flex align-center gap-2">
                <v-icon :color="isError ? 'error' : 'success'">
                    {{ isError ? 'fa-circle-exclamation' : 'fa-circle-check' }}
                </v-icon>
                {{ title }}
            </v-card-title>
            <v-card-text>{{ displayMessage }}</v-card-text>
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
            type: [String, Object],
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
        displayMessage() {
            return this.normalizeMessage(this.message)
        },
    },
    methods: {
        normalizeMessage(input) {
            const fallback = 'Something went wrong. Please try again.'

            if (input === null || input === undefined) return fallback

            // Handle object-shaped errors or server payloads
            if (typeof input === 'object') {
                const extracted = this.extractMessageFromObject(input)
                return this.normalizeMessage(extracted)
            }

            let msg = String(input || '').trim()
            if (!msg) return fallback

            // Strip common wrappers/prefixes
            msg = msg.replace(/^AxiosError\s*:\s*/i, '')
            msg = msg.replace(/^Error\s*:\s*/i, '')

            // Remove HTTP status code noise
            msg = msg.replace(/Request failed with status code\s*\d{3}/gi, 'Request failed')
            msg = msg.replace(/\bstatus code\s*\d{3}\b/gi, '')
            msg = msg.replace(/\bHTTP\s*\d{3}\b/gi, '')
            msg = msg.replace(/^\s*\d{3}\s*[:\-]\s*/g, '')
            msg = msg.replace(/\(\s*(?:status\s*)?\d{3}\s*\)/g, '')

            // Network-ish messages can be shown more cleanly
            msg = msg.replace(/^Network Error$/i, 'Network error. Please check your connection and try again.')

            // Clean up dangling separators/extra whitespace
            msg = msg.replace(/\s{2,}/g, ' ').trim()
            msg = msg.replace(/[\s:;\-]+$/g, '').trim()

            return msg || fallback
        },
        extractMessageFromObject(obj) {
            // Common API payload shapes
            if (!obj || typeof obj !== 'object') return ''

            // Axios error shape
            if (obj.response && obj.response.data) {
                const data = obj.response.data
                // Prefer server-provided message
                if (typeof data === 'string') return data
                if (data && typeof data === 'object') {
                    if (data.message) return data.message
                    if (data.error) return data.error
                    if (data.errors) {
                        const first = this.extractFirstValidationError(data.errors)
                        if (first) return first
                    }
                }
            }

            if (obj.message) return obj.message
            if (obj.error) return obj.error
            if (obj.errors) {
                const first = this.extractFirstValidationError(obj.errors)
                if (first) return first
            }

            try {
                return JSON.stringify(obj)
            } catch (e) {
                return ''
            }
        },
        extractFirstValidationError(errors) {
            // Laravel validation: { field: ['msg1', ...], ... }
            if (!errors) return ''
            if (Array.isArray(errors)) {
                return errors.find(Boolean) || ''
            }
            if (typeof errors === 'object') {
                const keys = Object.keys(errors)
                for (const key of keys) {
                    const v = errors[key]
                    if (Array.isArray(v) && v.length) return v[0]
                    if (typeof v === 'string' && v.trim()) return v
                }
            }
            return ''
        },
        handleClose() {
            this.isVisible = false
        },
    },
}
</script>
