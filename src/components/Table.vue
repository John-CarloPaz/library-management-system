<template>
    <div class="table-top">
        <slot name="top"></slot>
    </div>

    <v-data-table
        :headers="tableHeaders"
        :columns="tableHeaders"
        :items="items"
        :item-key="itemKey"
        :loading="loading"
        class="elevation-2 table--reusable"
    >

        <template #item.actions="{ item }">
            <slot name="actions" :item="item"></slot>
        </template>

        <!-- Generic per-column cell slot bridge.
             Parent components can provide a slot named "cell-<columnValue>" to override
             how a specific column is rendered for each row. If no slot is provided,
             we fall back to displaying the raw value (item[columnValue]). -->
        <template v-for="header in tableHeaders.filter(h => h.value !== 'actions')" v-slot:[`item.${header.value}`]="{ item }">
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
    </v-data-table>
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
        loading: {
            type: Boolean,
            default: false,
        },
        itemKey: {
            type: String,
            default: 'id',
        },
    },
    emits: ['row-click'],
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