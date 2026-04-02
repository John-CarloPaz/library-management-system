<template>
    <div class="table-top">
        <slot name="top"></slot>
    </div>

    <v-data-table-server
        v-model:items-per-page="internalItemsPerPage"
        :headers="tableHeaders"
        :items="items"
        :items-length="itemsLength"
        :item-key="itemKey"
        :loading="loading"
        sort-desc-icon="fas fa-arrow-down"
        sort-asc-icon="fas fa-arrow-up"
        next-icon="fas fa-chevron-right"
        prev-icon="fas fa-chevron-left"
        first-icon="fas fa-angles-left"
        last-icon="fas fa-angles-right"
        expand-icon="fas fa-circle-info"
        class="elevation-2 table--reusable"
        @update:options="onUpdateOptions"
    >

        <template #item.actions="{ item }">
            <slot name="actions" :item="item"></slot>
        </template>

        <!-- Generic per-column cell slot bridge.
             Parent components can provide a slot named "cell-<columnValue>" to override
             how a specific column is rendered for each row. If no slot is provided,
             we fall back to displaying the raw value (item[columnValue]). -->
        <template
            v-for="header in tableHeaders.filter(h => h.value !== 'actions')"
            v-slot:[`item.${header.value}`]="{ item }"
        >
            <slot :name="`cell-${header.value}`" :item="item">
                {{ item[header.value] }}
            </slot>
        </template>

        <template #no-data>
            <slot name="no-data">
                <v-alert type="info" text>
                    No records found.
                </v-alert>
            </slot>
        </template>
    </v-data-table-server>
</template>

<script>
export default {
    name: 'Table',
    props: {
        headers: {
            type: Array,
            required: false,
            default: () => [],
        },
        columns: {
            type: Array,
            required: false,
            default: () => [],
        },
        items: {
            type: Array,
            default: () => [],
        },
        // Total number of items available on the server (for server-side pagination)
        itemsLength: {
            type: Number,
            default: 0,
        },
        loading: {
            type: Boolean,
            default: false,
        },
        itemKey: {
            type: String,
            default: 'id',
        },
        // Expose items-per-page so parent views can control it via v-model
        itemsPerPage: {
            type: Number,
            default: 10,
        },
    },
    emits: ['row-click', 'update:options', 'update:itemsPerPage'],
    data() {
        return {
            internalItemsPerPage: this.itemsPerPage,
        }
    },
    computed: {
        tableHeaders() {
            const src = (this.headers && this.headers.length) ? this.headers : (this.columns && this.columns.length ? this.columns : []);
            return src.map(h => {
                if (typeof h === 'string') {
                    return { text: h, value: h, title: h, key: h };
                }
                const out = Object.assign({}, h);
                if (!out.text) {
                    out.text = out.title || out.label || out.value || out.key || '';
                }
                if (!out.value) {
                    out.value = out.key || out.field || out.value || out.text || '';
                }
                if (!out.title) {
                    out.title = out.text || out.value || '';
                }
                if (!out.key) {
                    out.key = out.value || out.text || '';
                }
                return out;
            });
        },
    },
    methods: {
        onUpdateOptions(options) {
            this.$emit('update:options', options)
        },
    },
    watch: {
        itemsPerPage(newVal) {
            if (newVal !== this.internalItemsPerPage) {
                this.internalItemsPerPage = newVal
            }
        },
        internalItemsPerPage(newVal) {
            if (newVal !== this.itemsPerPage) {
                this.$emit('update:itemsPerPage', newVal)
            }
        },
    },
    mounted() {
        // Ensure the initial options event is emitted so parents can load data
        this.$emit('update:options', {
            page: 1,
            itemsPerPage: this.internalItemsPerPage,
            sortBy: [],
        })
        // Vuetify emits click:row with signature (event, item) in some versions.
        // Normalize the args so we always emit the item as the payload.
    },
};
</script>

<style scoped>
.table--reusable tbody tr {
    cursor: pointer;
}
</style>