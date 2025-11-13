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
            <!-- Row 1: Title & Author -->
            <v-col cols="12" md="6">
              <v-text-field v-model="book.title" label="Title" required variant="solo" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="book.author" label="Author" variant="solo" />
            </v-col>

            <!-- Row 2: Publisher & Place of Publication -->
            <v-col cols="12" md="6">
              <v-text-field v-model="book.publisher" label="Publisher" variant="solo" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="book.placeOfPublication" label="Place of Publication" variant="solo" />
            </v-col>

            <!-- Row 3: Year, Edition, Book Code, Price, Expiration -->
            <v-col cols="12" md="2">
              <v-text-field v-model="book.yearOfProduction" label="Year" type="number" variant="solo" />
            </v-col>
            <v-col cols="12" md="2">
              <v-text-field v-model="book.edition" label="Edition" variant="solo" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="book.bookCode" label="Book Code" placeholder="e.g. BK-001" variant="solo" />
            </v-col>
            <v-col cols="12" md="2">
              <v-text-field v-model="book.price" label="Price" type="number" step="0.01" variant="solo" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="book.expiration" label="Expiration (auto)" readonly variant="solo" />
            </v-col>

            <!-- Notes -->
            <v-col cols="12">
              <v-textarea v-model="book.notes" label="Notes" rows="4" variant="solo" />
            </v-col>

            <!-- QR preview -->
            <v-col cols="12" md="4">
              <div v-if="qrDataUrl">
                <img :src="qrDataUrl" alt="QR code" style="max-width:300px;" />
              </div>
            </v-col>

            <!-- Buttons aligned to the right -->
            <v-col cols="12" class="d-flex justify-end">
              <v-btn color="primary" class="mr-3" @click="generateAndShow">Generate QR</v-btn>
              <v-btn color="primary" class="mr-3" @click="save">Save & Upload</v-btn>
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
        price: null,
        expiration: null,
      },
      qrDataUrl: '',
    };
  },
  mounted() {
    // Auto-generate expiration date 5 years from today
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 5);
    this.book.expiration = exp.toISOString().split('T')[0];
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
      // Ensure expiration is set (5 years from now) in case it was cleared
      if (!this.book.expiration) {
        const exp = new Date();
        exp.setFullYear(exp.getFullYear() + 5);
        this.book.expiration = exp.toISOString().split('T')[0];
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
