<template>
    <v-tabs v-model="currentValue" @update:model-value="onTabChange">
        <v-tab
            v-for="scope in normalizedScopes"
            :key="scope.value"
            :value="scope.value"
        >
            {{ scope.label }}
            <span v-if="scope.count != null"> ({{ scope.count }})</span>
        </v-tab>
    </v-tabs>
</template>

<script>
export default {
    name: 'scope-tab',
    props: {
        modelValue: {
            type: String,
            default: 'active',
        },
        /**
         * New, flexible API: array of scopes
         * [{ value: 'active', label: 'Active', count: 10 }, ...]
         */
        scopes: {
            type: Array,
            default: null,
        },
        /**
         * Backward-compatible props for legacy 2-tab usage
         */
        activeCount: {
            type: Number,
            default: null,
        },
        archivedCount: {
            type: Number,
            default: null,
        },
    },
    emits: ['update:modelValue'],
    data() {
        return {
            currentValue: this.modelValue,
        }
    },
    computed: {
        normalizedScopes() {
            if (Array.isArray(this.scopes) && this.scopes.length > 0) {
                return this.scopes.map(scope => ({
                    value: scope.value,
                    label: scope.label || String(scope.value),
                    count: typeof scope.count === 'number' ? scope.count : null,
                }))
            }

            // Fallback to legacy Active / Archived
            return [
                {
                    value: 'active',
                    label: 'Active',
                    count: typeof this.activeCount === 'number' ? this.activeCount : null,
                },
                {
                    value: 'archived',
                    label: 'Archived',
                    count: typeof this.archivedCount === 'number' ? this.archivedCount : null,
                },
            ]
        },
    },
    watch: {
        modelValue(newVal) {
            this.currentValue = newVal
        },
    },
    methods: {
        onTabChange(value) {
            this.$emit('update:modelValue', value)
        },
    },
}
</script>