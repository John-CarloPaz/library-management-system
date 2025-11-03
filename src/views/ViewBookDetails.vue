<template>
    <v-container>
        <v-row>
            <v-col cols="12">
                <AppBar :title="`Book Details`">
                    <template #title-actions>
                        <v-btn text @click="goBack">Back</v-btn>
                    </template>
                </AppBar>

                <v-card class="mt-4">
                    <v-simple-table>
                        <tbody>
                            <tr v-for="(field, idx) in fields" :key="field.key || idx">
                                <th>{{ field.label }}</th>
                                <td>{{ book[field.key] ?? '' }}</td>
                            </tr>
                        </tbody>
                    </v-simple-table>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue';
import booksData from '@/data/books.test.json';

export default {
    name: 'ViewBookDetails',
    components: { AppBar },
    props: {
        bookCode: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            book: {
                title: '',
                author: '',
                publisher: '',
                yearOfProduction: '',
                edition: '',
                placeOfPublication: '',
                bookCode: '',
                notes: '',
            },
        };
    },
    created() {
        const found = booksData.find(b => String(b.bookCode) === String(this.bookCode));
        if (found) {
            this.book = Object.assign({}, found);
        } else {
            console.warn('Book not found', this.bookCode);
            this.$router.replace({ name: 'manage-books' });
        }
    },
    computed: {
        fields() {
            return [
                { label: 'Title', key: 'title' },
                { label: 'Author', key: 'author' },
                { label: 'Publisher', key: 'publisher' },
                { label: 'Year', key: 'yearOfProduction' },
                { label: 'Edition', key: 'edition' },
                { label: 'Place of Publication', key: 'placeOfPublication' },
                { label: 'Book Code', key: 'bookCode' },
                { label: 'Notes', key: 'notes' },
            ];
        },
    },
    methods: {
        goBack() {
            this.$router.back();
        },
    },
};
</script>

<style scoped>
th {
    text-align: left;
    width: 30%;
    padding: 12px;
    vertical-align: top;
    /* slightly darker than white for subtle contrast */
    background-color: #f7f7f8;
}

/* add subtle separators between rows */
tbody td, th {
    padding: 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

/* remove border from last row for a cleaner look */
tbody tr:last-child td,
tbody tr:last-child th {
    border-bottom: none;
}
</style>
