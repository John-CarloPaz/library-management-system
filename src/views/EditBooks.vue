<template>
	<v-container fluid>
		<v-row>
			<v-col cols="12">
				<AppBar :title="`Edit Book`">
					<template #title-actions>
						<v-btn text @click="cancel">Back</v-btn>
					</template>
				</AppBar>

				<v-form ref="form" lazy-validation>
					<v-row>
						<v-col cols="12" md="8">
							<v-text-field v-model="book.title" label="Title" required />
						</v-col>
						<v-col cols="12" md="4">
							<v-text-field v-model="book.author" label="Author" />
						</v-col>

						<v-col cols="12" md="6">
							<v-text-field v-model="book.publisher" label="Publisher" />
						</v-col>
						<v-col cols="6" md="2">
							<v-text-field v-model="book.yearOfProduction" label="Year" type="number" />
						</v-col>
						<v-col cols="6" md="2">
							<v-text-field v-model="book.edition" label="Edition" />
						</v-col>
						<v-col cols="12" md="4">
							<v-text-field v-model="book.placeOfPublication" label="Place of Publication" />
						</v-col>
						<v-col cols="12" md="4">
							<v-text-field v-model="book.bookCode" label="Book Code" disabled />
						</v-col>

						<v-col cols="12">
							<v-textarea v-model="book.notes" label="Notes" rows="4" />
						</v-col>

						<v-col cols="12" class="d-flex" style="gap:12px;">
							<v-btn color="primary" @click="save">Save</v-btn>
							<v-btn text @click="cancel">Cancel</v-btn>
						</v-col>
					</v-row>
				</v-form>
			</v-col>
		</v-row>
	</v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue';
import booksData from '@/data/books.test.json';

export default {
	name: 'EditBooks',
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
	methods: {
		save() {
			// for demo: log the updated book and navigate back
			console.log('Saved book', this.book);
			// TODO: persist changes to backend or shared store
			this.$router.push({ name: 'manage-books' });
		},
		cancel() {
			this.$router.back();
		},
	},
};
</script>