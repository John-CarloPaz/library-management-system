<template>
    <v-card class="mt-4 mb-4" elevation="0">
        <p class="font-weight-bold mb-2 mt-4 ml-1">{{ title }}</p>
        <v-table>
            <tbody>
                <tr v-for="(field, idx) in fields" :key="field.key || idx">
                    <td class="field-label">{{ field.label }}</td>
                    <td>
                        <a 
                            v-if="field.isLink" 
                            href="#" 
                            class="link-text"
                            @click.prevent="field.onClick"
                        >
                            {{ formatValue(field.value) ?? '-' }}
                        </a>
                        <span
                            v-else
                            :class="{ 'null-muted': field.value === null || field.value === undefined || field.value === '' }"
                        >
                            {{ formatValue(field.value) ?? '-' }}
                        </span>
                    </td>
                </tr>
            </tbody>
        </v-table>
    </v-card>
</template>

<script>
export default {
    name: 'InfoTable',
    props: {
        title: {
            type: String,
            default: 'Information',
        },
        fields: {
            type: Array,
            required: true,
            // Expected format: [{ label: 'Field Name', value: 'field value' }, ...]
        },
        elevation: {
            type: Number,
            default: 1,
        },
    },
    methods: {
        formatValue(val) {
            // Explicitly treat null/undefined/empty-string as NULL sentinel
            if (val === null || val === undefined || val === '') return 'NULL';
            
            // Format date fields
            if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
                try {
                    const date = new Date(val);
                    return date.toLocaleString();
                } catch (e) {
                    return val;
                }
            }
            
            // Format boolean fields
            if (typeof val === 'boolean') {
                return val ? 'Yes' : 'No';
            }
            
            // Capitalize status strings with underscores
            if (typeof val === 'string' && val.includes('_')) {
                return val.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
            
            return String(val);
        },
    },
};
</script>

<style scoped>
tbody td {
    padding: 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

tbody tr:last-child td {
    border-bottom: none;
}

.field-label {
    color: #666666;
    font-weight: 500;
    background-color: #f7f7f8;
    width: 30%;
}

.link-text {
    color: #1976d2;
    text-decoration: none;
    cursor: pointer;
    font-weight: 500;
}

.link-text:hover {
    text-decoration: underline;
}

.null-muted {
    color: #9e9e9e;
    font-style: italic;
}
</style>
