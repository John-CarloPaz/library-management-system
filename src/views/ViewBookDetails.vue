<template>
    <v-container>
        <v-row>
            <v-col cols="12">
                <AppBar :title="`Book Details`">
                    <template #title-actions>
                        <v-btn text @click="goBack">Back</v-btn>
                    </template>
                </AppBar>

                <v-card class="mt-4 mb-14">
                    <v-simple-table>
                        <tbody>
                            <tr v-for="(field, idx) in fields" :key="field.key || idx">
                                <th>{{ field.label }}</th>
                                <td>{{ book[field.key] ?? '' }}</td>
                            </tr>
                        </tbody>
                    </v-simple-table>
                </v-card>
                <p class="font-weight-bold mb-2">Borrower Details</p>
                <Table :headers="borrowerHeaders" :items="borrowers" :loading="loading" item-key="id">
                    <template #actions="{ item }">
                        <v-chip variant="elevated" color="warning" v-if="item.status == 'active'"><p class="text-capitalize">{{ item.status }}</p></v-chip>
                        <v-chip ariant="elevated" color="success" v-if="item.status == 'returned'"><p class="text-capitalize">{{ item.status }}</p></v-chip>
                    </template>
                </Table>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue';
import Table from '@/components/Table.vue';
import booksData from '@/data/books.test.json';
import borrowerData from '@/data/borrower.test.json';

export default {
    name: 'ViewBookDetails',
    components: { AppBar, Table },
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

            loading: false,

            borrowers: borrowerData.slice(),
            borrowerHeaders: [
                { text: 'ID', value: 'studentId' },
                { text: 'Name', value: 'name' },
                { text: 'Email', value: 'email' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
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
                { label: 'Price', key: 'price' },
                { label: 'Edition', key: 'edition' },
                { label: 'Expiration', key: 'expiration' },
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
tbody td,
th {
    padding: 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

/* remove border from last row for a cleaner look */
tbody tr:last-child td,
tbody tr:last-child th {
    border-bottom: none;
}
</style>
