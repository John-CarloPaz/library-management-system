<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <AppBar title="Create Book">
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
              <v-text-field v-model="book.bookCode" label="Book Code" placeholder="e.g. BK-001" />
            </v-col>

            <v-col cols="12">
              <v-textarea v-model="book.notes" label="Notes" rows="4" />
            </v-col>

            <v-col cols="12" md="4">
              <div v-if="qrDataUrl">
                <img :src="qrDataUrl" alt="QR code" style="max-width:300px;" />
              </div>
            </v-col>

            <v-col cols="12" class="d-flex" style="gap:12px;">
              <v-btn color="primary" @click="generateAndShow">Generate QR</v-btn>
              <v-btn color="primary" @click="save">Save & Upload</v-btn>
              <v-btn text @click="cancel">Cancel</v-btn>
            </v-col>
          </v-row>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import QRCode from 'qrcode';
import AppBar from '@/components/AppBar.vue';
import booksData from '@/data/books.test.json';

export default {
  name: 'CreateBooks',
  components: { AppBar },
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
      qrDataUrl: '',
    };
  },
  methods: {
    async generateQr() {
      const payload = `${this.book.bookCode || ''}|${this.book.title || ''}`;
      try {
        // generate a data URL using the installed `qrcode` package
        this.qrDataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 0 });
      } catch (err) {
        console.error('QR generation failed, falling back to external API', err);
        this.qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payload)}`;
      }
      return this.qrDataUrl;
    },

    async uploadQrImage(filename) {
      if (!this.qrDataUrl) return null;
      let blob = null;
      try {
        if (this.qrDataUrl.startsWith('data:')) {
          const res = await fetch(this.qrDataUrl);
          blob = await res.blob();
        } else {
          const res = await fetch(this.qrDataUrl);
          blob = await res.blob();
        }
        
        const form = new FormData();
        form.append('file', blob, filename);
        const resp = await fetch('/api/upload', { method: 'POST', body: form });
        if (!resp.ok) {
          console.warn('Upload failed', await resp.text());
          return null;
        }
        const data = await resp.json();
        return data;
      } catch (err) {
        console.error('Failed to upload QR image', err);
        return null;
      }
    },

    // generate the QR and display it in-page for validation
    async generateAndShow() {
      if (!this.book.bookCode) {
        alert('Please enter a book code before generating QR.');
        return;
      }
      await this.generateQr();
      // qrDataUrl is now set and the <img> preview will appear
    },

    // upload the generated QR (or generate it first) and save
    async save() {
      if (!this.book.bookCode) {
        alert('Please enter a book code before saving.');
        return;
      }
      if (!this.qrDataUrl) {
        await this.generateQr();
      }
      const filename = `${this.book.bookCode}.png`;
      const uploadResult = await this.uploadQrImage(filename);
      console.log('Upload result', uploadResult);
      console.log('Created book', this.book);
      this.$router.push({ name: 'manage-books' });
    },

    cancel() {
      this.$router.back();
    },
  },
};
</script>

<style scoped>
.qr-preview img { max-width: 300px; }
</style>
