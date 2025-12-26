<template>
    <AppBar title="Borrow Book" />

    <v-container fluid class="pa-6">
        <v-row>
            <!-- Left: Book selection -->
            <v-col cols="12" md="6">
                <v-card elevation="2" class="pa-4">
                    <v-row class="mb-4" align="center">
                        <v-col>
                            <h3 class="mb-0">Borrow a Book</h3>
                            <div class="text-subtitle-2 text-grey">Search or scan a book to begin.</div>
                        </v-col>
                        <v-col cols="auto">
                            <v-btn color="primary" variant="tonal" @click="openScanner('book')">
                                <v-icon left icon="fa-qrcode"></v-icon>
                                Scan Book
                            </v-btn>
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col cols="12">
                            <v-autocomplete
                                v-model="selectedBook"
                                :items="books"
                                item-title="title"
                                item-value="bookCode"
                                label="Select book (search or pick)"
                                clearable
                                return-object
                                density="comfortable"
                            >
                                <template #item="{ props, item }">
                                    <v-list-item
                                        v-bind="props"
                                        :title="item.raw.title"
                                        :subtitle="item.raw.author"
                                    />
                                </template>
                            </v-autocomplete>
                        </v-col>

                        <v-col cols="12" class="mt-4">
                            <v-card elevation="0" class="pa-4">
                                <div class="text-subtitle-1 font-weight-bold mb-2">Selected Book</div>
                                <div v-if="selectedBook">
                                    <p class="mb-1"><strong>Title:</strong> {{ selectedBook.title }}</p>
                                    <p class="mb-1"><strong>Author:</strong> {{ selectedBook.author }}</p>
                                    <p class="mb-1"><strong>Book Code:</strong> {{ selectedBook.bookCode }}</p>
                                    <p class="mb-1" v-if="selectedBook.publisher"><strong>Publisher:</strong> {{
                                        selectedBook.publisher }}</p>
                                    <p class="mb-1" v-if="selectedBook.yearOfProduction"><strong>Year:</strong> {{
                                        selectedBook.yearOfProduction
                                        }}</p>
                                    <p class="mb-1" v-if="selectedBook.edition"><strong>Edition:</strong> {{
                                        selectedBook.edition }}</p>
                                    <p class="mb-1" v-if="selectedBook.placeOfPublication"><strong>Place:</strong> {{
                                        selectedBook.placeOfPublication }}</p>
                                    <p class="mb-1" v-if="selectedBook.notes"><strong>Notes:</strong> {{
                                        selectedBook.notes }}</p>
                                </div>
                                <div v-else class="text-grey">No book selected.</div>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-card>
            </v-col>

            <!-- Right: Student field and Duration -->
            <v-col cols="12" md="6">
                <v-card elevation="2" class="pa-4">
                    <v-row class="mb-4" align="center">
                        <v-col>
                            <h3 class="mb-0">Student & Duration</h3>
                            <div class="text-subtitle-2 text-grey">Search or scan a student to assign borrower.</div>
                        </v-col>
                        <v-col cols="auto">
                            <v-btn color="primary" variant="tonal" @click="openScanner('student')">
                                <v-icon left icon="fa-user"></v-icon>
                                Scan Student
                            </v-btn>
                        </v-col>

                    </v-row>

                    <v-row>
                        <v-col cols="12">
                            <v-autocomplete
                                v-model="selectedStudent"
                                :items="students"
                                item-title="name"
                                item-value="email"
                                label="Select student (search or pick)"
                                clearable
                                return-object
                                density="comfortable"
                            >
                                <template #item="{ props, item }">
                                    <v-list-item v-bind="props">
                                        <v-list-item-title class="font-weight-bold">
                                            {{ item.raw.name }}
                                        </v-list-item-title>
                                        <v-list-item-subtitle class="text-grey">
                                            {{ item.raw.email }}
                                        </v-list-item-subtitle>
                                    </v-list-item>
                                </template>
                            </v-autocomplete>
                        </v-col>

                        <v-col cols="12" class="mt-4">
                            <v-card elevation="0" class="pa-4">
                                <div class="text-subtitle-1 font-weight-bold mb-2">Selected Student</div>
                                <div v-if="selectedStudent">
                                    <p class="mb-1"><strong>Name:</strong> {{ selectedStudent.name }}</p>
                                    <p class="mb-1"><strong>Email:</strong> {{ selectedStudent.email }}</p>
                                    <p class="mb-1" v-if="selectedStudent.studentId"><strong>Student ID:</strong> {{
                                        selectedStudent.studentId }}</p>
                                    <p class="mb-1" v-if="selectedStudent.status"><strong>Status:</strong> {{
                                        selectedStudent.status
                                        }}</p>
                                    <p class="mb-1" v-if="selectedStudent.id"><strong>Internal ID:</strong> {{
                                        selectedStudent.id }}
                                    </p>
                                </div>
                                <div v-else class="text-grey">No student selected.</div>
                            </v-card>
                        </v-col>

                        <v-col cols="12" class="mt-4">
                            <v-select v-model="borrowDuration" :items="durationOptions" label="Borrow Duration"
                                density="comfortable" />
                        </v-col>
                    </v-row>
                </v-card>
            </v-col>
        </v-row>

        <!-- Scanner dialog -->
        <v-dialog v-model="scannerOpen" width="700">
            <v-card>
                <v-toolbar flat>
                    <v-toolbar-title>QR Scanner — {{ scannerMode === 'book' ? 'Book' : 'Student' }}</v-toolbar-title>
                    <v-spacer />
                    <v-btn icon @click="scannerOpen = false"><v-icon icon="fa-times"></v-icon></v-btn>
                </v-toolbar>

                <v-card-text class="pa-0">
                    <div class="qrcode-area">
                        <QrcodeStream v-if="scannerOpen" :constraints="selectedConstraints"
                            :track-function="overlayEnabled ? trackFunctionSelected : undefined" @decode="onDecode"
                            @detect="onDetect" @init="onInit" @camera-on="onCameraOn" @camera-off="onCameraOff"
                            @error="onScannerError" />
                    </div>

                    <v-row class="pa-4" align="center">
                        <v-col cols="auto">
                            <v-switch v-model="overlayEnabled" label="Overlay" />
                        </v-col>
                        <v-col cols="auto">
                            <div class="text-caption">Camera: <strong>{{ cameraStatus }}</strong></div>
                        </v-col>
                        <v-col>
                            <div class="text-caption">Detected: <strong>{{ lastScanned || '—' }}</strong></div>
                        </v-col>
                    </v-row>

                    <v-expansion-panels class="pa-4">
                        <v-expansion-panel>
                            <v-expansion-panel-title>Detection details</v-expansion-panel-title>
                            <v-expansion-panel-text>
                                <pre
                                    style="white-space:pre-wrap;">{{ JSON.stringify(lastDetectedCodes, null, 2) }}</pre>
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>

                    <v-row class="pa-4" align="center">
                        <v-col>
                            <v-text-field v-model="simulateInput" label="Paste QR content to simulate" dense
                                clearable />
                        </v-col>
                        <v-col cols="auto">
                            <v-btn color="primary" @click="simulateScan">Simulate Scan</v-btn>
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
        </v-dialog>

        <!-- Actions and Recent Borrows (full width) -->
        <v-row class="mt-4">
            <v-col cols="12" class="d-flex justify-end mb-4">
                <v-btn color="primary" :disabled="!canBorrow" @click="confirmBorrow" size="large" :loading="isBorrowing">
                    <v-icon left icon="fa-book"></v-icon>
                    Confirm Borrow
                </v-btn>
            </v-col>

            <v-col cols="12">
                <v-card elevation="2" class="pa-4">
                    <h5 class="mb-2">Recent Borrows</h5>
                    <v-list dense>
                        <v-list-item v-for="(b, idx) in recentBorrows" :key="idx">
                            <v-list-item-content>
                                <v-list-item-title>{{ b.book.title }}</v-list-item-title>
                                <v-list-item-subtitle>{{ b.student.name }} — {{ b.date }} ({{ b.duration }} days)</v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                    </v-list>
                </v-card>
            </v-col>
        </v-row>
    </v-container>

    <!-- Error Dialog -->
    <ErrorDialog 
        :visible.sync="dialog.visible" 
        :title="dialog.title" 
        :message="dialog.message" 
        :isError="dialog.isError"
        @update:visible="dialog.visible = $event"
    />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { QrcodeStream } from 'vue-qrcode-reader'
import AppBar from '../components/AppBar.vue'
import ErrorDialog from '../components/ErrorDialog.vue'
import { borrowBook } from '../services/borrow.js'
import { listBooks } from '@/services/book'
import { listActiveStudents, getStudentByNumber } from '@/services/student'

const router = useRouter()

// Book and student lists (loaded from backend)
const books = ref([])
const students = ref([])

// Dialog state for error handling
const dialog = ref({
    visible: false,
    title: '',
    message: '',
    isError: false
})

// Loading state for borrow button
const isBorrowing = ref(false)

// Duration options for borrowing (must match backend: 3, 7, 14, 30)
const borrowDuration = ref(14)
const durationOptions = ref([
    { title: '3 days', value: 3 },
    { title: '7 days', value: 7 },
    { title: '14 days', value: 14 },
    { title: '30 days', value: 30 }
])

// Load available books from backend (using Book service)
async function loadBooksFromApi() {
    try {
        const apiBooks = await listBooks()
        books.value = (Array.isArray(apiBooks) ? apiBooks : []).map(b => ({
            // keep original ID
            id: b.id,
            // catalogue-level fields (already flattened by service)
            title: b.title,
            author: b.author,
            publisher: b.publisher,
            yearOfProduction: b.year_of_publication,
            edition: b.edition,
            placeOfPublication: b.place_of_publication,
            // use reference_number as the logical "book code" used in QR
            bookCode: b.reference_number,
            notes: b.catalogue?.notes || '',
        }))
        console.log('BorrowBooks loaded books from API:', books.value.length)
    } catch (error) {
        console.error('Failed to load books for borrowing:', error)
        showDialog('Load Error', error.message || 'Failed to load books for borrowing.', true)
    }
}

// Load students from dedicated Students backend (unarchived/active)
async function loadStudentsFromApi() {
    try {
        const apiStudents = await listActiveStudents()
        students.value = (Array.isArray(apiStudents) ? apiStudents : []).map(s => ({
            id: s.id,
            name: [s.first_name, s.middle_name, s.last_name, s.suffix].filter(Boolean).join(' '),
            email: s.email,
            // Use the public student identifier from backend
            studentId: s.student_id,
            student_id: s.student_id,
            status: s.status,
        }))
        console.log('BorrowBooks loaded students from Students API:', students.value.length)
    } catch (error) {
        console.error('Failed to load students for borrowing:', error)
        // Keep list empty on failure; QR with embedded student data can still work.
    }
}

const selectedBook = ref(null)
const selectedStudent = ref(null)
const lastScanned = ref('')
const recentBorrows = ref([])

const scannerOpen = ref(false)
const scannerMode = ref('book')

// diagnostics & overlay toggle
const overlayEnabled = ref(true)
const lastDetectedCodes = ref([])
const cameraStatus = ref('idle')
// guard value to avoid repeated auto-decodes from rapid detect events
const lastAutoDecoded = ref('')
const autoDecodeCooldownMs = 1200
let autoDecodeTimer = null

// camera / detection helpers
const selectedConstraints = ref({ facingMode: 'environment' })

// track function (used to draw overlays on the canvas). Set a function or undefined.
function paintOutline(detectedCodes, ctx) {
    if (!detectedCodes || !ctx) return
    for (const detectedCode of detectedCodes) {
        const [firstPoint, ...otherPoints] = detectedCode.cornerPoints || []
        if (!firstPoint) continue
        ctx.strokeStyle = 'rgba(220,20,60,0.9)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(firstPoint.x, firstPoint.y)
        for (const { x, y } of otherPoints) {
            ctx.lineTo(x, y)
        }
        ctx.lineTo(firstPoint.x, firstPoint.y)
        ctx.closePath()
        ctx.stroke()
    }
}

const trackFunctionSelected = paintOutline

// detect event: receives an array of detected codes with geometry and rawValue
function onDetect(detectedCodes) {
    try {
        lastDetectedCodes.value = detectedCodes || []
        if (Array.isArray(detectedCodes) && detectedCodes.length) {
            // join for diagnostics
            lastScanned.value = detectedCodes.map(c => c.rawValue).join(', ')

            // Auto-decode: if the first detected code has a rawValue and it's different from
            // the last auto-decoded value, call onDecode automatically. Use a short cooldown
            // so rapid repeated detect events don't repeatedly call onDecode.
            const first = detectedCodes[0]
            const raw = first && (first.rawValue || first.rawValue === 0) ? String(first.rawValue) : null
            if (raw) {
                if (raw !== lastAutoDecoded.value) {
                    lastAutoDecoded.value = raw
                    try {
                        onDecode(raw)
                    } catch (err) {
                        console.warn('auto onDecode failed', err)
                    }
                    // reset guard after cooldown so same code can be scanned again later
                    if (autoDecodeTimer) clearTimeout(autoDecodeTimer)
                    autoDecodeTimer = setTimeout(() => { lastAutoDecoded.value = ''; autoDecodeTimer = null }, autoDecodeCooldownMs)
                }
            }
        }
        // console.debug('detect', detectedCodes)
    } catch (e) {
        console.warn('onDetect error', e)
    }
}

function onCameraOn() {
    cameraStatus.value = 'on'
    console.log('camera on')
}

function onCameraOff() {
    cameraStatus.value = 'off'
    console.log('camera off')
}

function openScanner(mode = 'book') {
    scannerMode.value = mode
    scannerOpen.value = true
}

function onInit(promise) {
    // camera init success handler
    console.log('scanner init:', promise)
    if (promise && typeof promise.then === 'function') {
        promise.then(() => {
            console.log('camera stream initialized')
            cameraStatus.value = 'initialized'
        }).catch(err => {
            console.warn('camera init failed', err)
            cameraStatus.value = 'error'
        })
    }
}

function onScannerError(err) {
    console.error('Scanner error', err)
    // show more helpful message in console and update camera status
    try {
        const msg = err && err.name ? `${err.name}: ${err.message || ''}` : String(err)
        console.warn('Scanner reported:', msg)
    } catch (e) { }
    cameraStatus.value = 'error'
}

function onDecode(content) {
    lastScanned.value = content && content.toString ? content.toString() : String(content)
    const mode = scannerMode.value

    // Try to parse JSON payload first (some QR codes may encode a JSON object)
    let parsed = null
    let text = (content && content.toString) ? content.toString().trim() : String(content || '').trim()
    try {
        parsed = JSON.parse(content)
    } catch (e) {
        parsed = null
    }

    // Handle book mode only
    if (mode === 'book') {
        const candidates = []
        if (parsed) {
            if (parsed.bookCode) candidates.push(String(parsed.bookCode))
            if (parsed.code) candidates.push(String(parsed.code))
            if (parsed.book && (parsed.book.bookCode || parsed.book.code)) {
                if (parsed.book.bookCode) candidates.push(String(parsed.book.bookCode))
                if (parsed.book.code) candidates.push(String(parsed.book.code))
            }
        }
        candidates.push(text)

        let fb = null
        for (const c of candidates) {
            const cc = (c || '').toString().trim()
            if (!cc) continue
            fb = books.value.find(b => String(b.bookCode) === cc)
            if (fb) break
        }

        // fallback: check if the scanned text contains any known bookCode / reference_number substring
        if (!fb && text) {
            fb = books.value.find(b => text.includes(String(b.bookCode)))
        }

        if (fb) {
            selectedBook.value = fb
            // close scanner and update camera status
            scannerOpen.value = false
            cameraStatus.value = 'stopped'
            return
        }

        // nothing matched for book
        return
    }

    // Handle student mode only
    if (mode === 'student') {
        const candidates = []
        if (parsed) {
            if (parsed.email) candidates.push(String(parsed.email))
            if (parsed.studentId) candidates.push(String(parsed.studentId))
            if (parsed.student_id) candidates.push(String(parsed.student_id))
            if (parsed.student_number) candidates.push(String(parsed.student_number)) // legacy support
            if (parsed.id) candidates.push(String(parsed.id))
        }
        candidates.push(text)

        let fs = null
        for (const c of candidates) {
            const cc = (c || '').toString().trim()
            if (!cc) continue
            fs = students.value.find(s =>
                (s.email && String(s.email).toLowerCase() === cc.toLowerCase()) ||
                String(s.id) === cc ||
                String(s.studentId) === cc
            )
            if (fs) break
        }

        // fallback: substring search in text within known students
        if (!fs && text) {
            for (const s of students.value) {
                if (s.studentId && text.includes(String(s.studentId))) { fs = s; break }
                if (s.email && text.toLowerCase().includes(String(s.email).toLowerCase())) { fs = s; break }
            }
        }

        // If still not found but QR encoded a full student object, use that directly
        if (!fs && parsed && (parsed.name || parsed.email)) {
            fs = {
                id: parsed.id || null,
                name: parsed.name || '',
                email: parsed.email || '',
                studentId: parsed.studentId || parsed.student_id || null,
                status: parsed.status || '',
            }
        }

        if (fs) {
            selectedStudent.value = fs
            scannerOpen.value = false
            cameraStatus.value = 'stopped'
            return
        }

        // nothing matched for student
        return
    }
}

const canBorrow = computed(() => !!selectedBook.value && !!selectedStudent.value)

function showDialog(title, message, isError = false) {
    dialog.value = {
        visible: true,
        title,
        message,
        isError
    }
}

async function confirmBorrow() {
    if (!canBorrow.value) return
    
    isBorrowing.value = true
    
    try {
        // Ensure we have a valid internal student ID.
        // If the student was selected from the dropdown, `id` should already be set.
        // If the student came from a QR that didn't include `id`, try to resolve it
        // via the Students backend using the student number.
        let studentId = selectedStudent.value && selectedStudent.value.id

        if (!studentId) {
            const studentNumber = selectedStudent.value && (selectedStudent.value.studentId || selectedStudent.value.student_id)
            if (!studentNumber) {
                throw new Error('Selected student has no internal ID or student number. Please re-select the student from the list.')
            }

            const apiStudent = await getStudentByNumber(studentNumber)
            if (!apiStudent || !apiStudent.id) {
                throw new Error('Failed to resolve student from server. Please try again.')
            }

            studentId = apiStudent.id

            // Optionally update the selected student with the resolved ID so future borrows work without extra lookups
            selectedStudent.value = {
                ...selectedStudent.value,
                id: apiStudent.id,
                email: apiStudent.email || selectedStudent.value.email,
                name: [apiStudent.first_name, apiStudent.middle_name, apiStudent.last_name, apiStudent.suffix]
                    .filter(Boolean)
                    .join(' ') || selectedStudent.value.name,
            }
        }

        const payload = {
            student_id: studentId,
            reference_number: selectedBook.value.bookCode,
            duration: borrowDuration.value,
        }

        // Debug: inspect exactly what we send to backend
        console.log('BorrowBooks – sending payload to backend:', payload, {
            selectedStudent: selectedStudent.value,
            selectedBook: selectedBook.value,
        })

        const result = await borrowBook(payload)
        
        // Add to recent borrows display
        const record = {
            book: selectedBook.value,
            student: selectedStudent.value,
            date: new Date().toLocaleString(),
            duration: borrowDuration.value
        }
        recentBorrows.value.unshift(record)
        
        // Reset form
        selectedBook.value = null
        selectedStudent.value = null
        borrowDuration.value = 14
        
        console.log('Borrow successful:', result)
    } catch (error) {
        console.error('Borrow failed:', error)
        showDialog('Borrow Error', error.message || 'Failed to borrow book', true)
    } finally {
        isBorrowing.value = false
    }
}

// simulate input for testing without a physical QR
const simulateInput = ref('')
function simulateScan() {
    if (!simulateInput.value) return
    // call the same decode handler as the scanner
    onDecode(simulateInput.value)
}

// Initial load
onMounted(async () => {
    await loadBooksFromApi()
    await loadStudentsFromApi()
})
</script>

<style scoped>
.scanner-placeholder {
    min-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.qrcode-area {
    height: 480px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fa;
}
</style>