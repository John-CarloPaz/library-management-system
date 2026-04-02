<template>
    <AppBar title="Return Book" />

    <v-container fluid class="pa-6">
        <v-row>
            <!-- Left: Book selection -->
            <v-col cols="12" md="6">
                <v-card elevation="2" class="pa-4">
                    <v-row class="mb-4" align="center">
                        <v-col>
                            <h3 class="mb-0">Return a Book</h3>
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
                            <v-text-field
                                v-model="referenceInput"
                                label="Reference number"
                                clearable
                                density="compact"
                                variant="solo-filled"
                                hide-details="auto"
                                placeholder="Enter reference number or paste from QR"
                                @keyup.enter="searchByReference"
                            >
                                <template #append>
                                    <v-btn size="small" color="primary" @click="searchByReference">Search</v-btn>
                                </template>
                            </v-text-field>
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
                                <div class="mt-4">
                                    <v-row>
                                        <v-col cols="12" md="6">
                                            <div v-if="currentBorrow">
                                                <div v-if="currentBorrow.penalty_amount" class="d-flex align-center">
                                                    <div class="text-caption text-grey mr-3">Penalty</div>
                                                    <div class="text-subtitle-2 font-weight-medium text-error">${{ currentBorrow.penalty_amount }}</div>
                                                </div>
                                                <div v-if="currentBorrow.status === 'overdue'" class="mt-2">
                                                    <v-chip size="small" color="error" variant="tonal" class="ma-0" elevation="0">Overdue</v-chip>
                                                </div>
                                            </div>
                                        </v-col>
                                        <v-col cols="12" md="6" class="d-flex align-center">
                                            <v-switch v-if="currentBorrow && currentBorrow.status === 'overdue'" v-model="finePaid" label="Fine Paid" />
                                        </v-col>
                                        <v-col cols="12" class="mt-2">
                                            <v-btn v-if="currentBorrow" variant="outlined" color="error" @click="openMarkLostConfirm">
                                                Mark Lost
                                            </v-btn>
                                        </v-col>
                                    </v-row>
                                </div>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-card>
            </v-col>

            <!-- Right: Student field and Scanner -->
            <v-col cols="12" md="6">
                <v-card elevation="2" class="pa-4">
                    <v-row class="mb-4" align="center">
                        <v-col>
                            <h3 class="mb-0">Student</h3>
                            <div class="text-subtitle-2 text-grey">Search or scan a student to return a book.</div>
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
                            <v-autocomplete v-model="selectedStudent" :items="students" item-title="name"
                                item-value="email" label="Select student (search or pick)" clearable return-object
                                density="comfortable">
                                <template #item="{ item }">
                                    <div>
                                        <div class="font-weight-bold">{{ item.name }}</div>
                                        <small class="text-grey">{{ item.email }}</small>
                                    </div>
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
        <!-- Return flags moved into Selected Book details -->

        <!-- Actions and Recent Returns (full width) -->
        <v-row class="mt-4">
            <v-col cols="12" class="d-flex justify-end mb-4">
                <v-btn color="primary" :disabled="!canReturn" @click="confirmReturn" size="large" :loading="isReturning">
                    <v-icon left icon="fa-book"></v-icon>
                    Confirm Return
                </v-btn>
            </v-col>

            <v-col cols="12">
                <v-card elevation="2" class="pa-4">
                    <h5 class="mb-2">Recent Returns</h5>
                    <v-list dense>
                        <v-list-item v-for="(b, idx) in recentReturns" :key="idx">
                            <v-list-item-content>
                                <v-list-item-title>{{ b.book.title }}</v-list-item-title>
                                <v-list-item-subtitle>{{ b.student.name }} — {{ b.date }} <span v-if="b.penalty" class="text-error">(Penalty: ₱{{ b.penalty }})</span></v-list-item-subtitle>
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

    <!-- Confirm Dialog -->
    <v-dialog v-model="confirmDialog.visible" max-width="480px">
        <v-card>
            <v-card-title class="text-h6">{{ confirmDialog.title }}</v-card-title>
            <v-card-text>
                <div>{{ confirmDialog.message }}</div>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="confirmDialog.visible = false">Cancel</v-btn>
                <v-btn color="error" @click="confirmDialogConfirmed">Confirm</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { QrcodeStream } from 'vue-qrcode-reader'
import AppBar from '../components/AppBar.vue'
import ErrorDialog from '../components/ErrorDialog.vue'
import { returnBook, getBorrowRecords, updateBorrowRecord, getReturnDetails } from '../services/borrow.js'

const router = useRouter()

// Derived from backend borrow records
const books = ref([])
const students = ref([])
const borrowRecords = ref([])
const currentBorrowId = ref(null)

// Dialog state for error handling
const dialog = ref({
    visible: false,
    title: '',
    message: '',
    isError: false
})

// Generic confirm dialog state
const confirmDialog = ref({
    visible: false,
    title: '',
    message: '',
    action: null,
    payload: null
})

// Loading state
const isReturning = ref(false)

// Return-specific flags moved to book details
const finePaid = ref(false)
const returnRemarks = ref('')
const recentReturns = ref([])

const selectedBook = ref(null)
const selectedStudent = ref(null)
const lastScanned = ref('')
const referenceInput = ref('')

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

async function searchByReference() {
    const refVal = (referenceInput.value || '').toString().trim()
    if (!refVal) return showDialog('Input required', 'Please enter a reference number to search.', true)
    try {
        const details = await getReturnDetails(refVal)
        console.log('Search by reference result', details)
        const borrowRec = details?.borrow || details?.data || (details && (details.id || details.student || details.book) ? details : null)
        if (borrowRec) {
            const mapped = {
                id: borrowRec.id,
                book: {
                    title: borrowRec.book?.catalogue?.title || borrowRec.book?.title || borrowRec.book_title || '',
                    author: borrowRec.book?.catalogue?.author || borrowRec.book?.author || borrowRec.book_author || '',
                    bookCode: borrowRec.book?.reference_number || borrowRec.reference_number || ''
                },
                student: {
                    id: borrowRec.student?.id || borrowRec.student_id || null,
                    name: (borrowRec.student?.first_name || borrowRec.student?.name || '') + (borrowRec.student?.middle_name ? ' ' + borrowRec.student.middle_name : '') + (borrowRec.student?.last_name ? ' ' + borrowRec.student.last_name : ''),
                    email: borrowRec.student?.email || '' ,
                    studentId: borrowRec.student?.student_id || borrowRec.student_id || null
                },
                dueDate: borrowRec.due_date || borrowRec.dueDate || null,
                status: borrowRec.status || 'borrowed',
                is_fine_paid: !!borrowRec.is_fine_paid,
                penalty_amount: borrowRec.penalty_amount || 0
            }

            const idx = borrowRecords.value.findIndex(r => r.id === mapped.id)
            if (idx >= 0) {
                borrowRecords.value.splice(idx, 1, mapped)
            } else {
                borrowRecords.value.unshift(mapped)
            }

            selectedStudent.value = mapped.student
            selectedBook.value = mapped.book
            currentBorrowId.value = mapped.id
            finePaid.value = !!mapped.is_fine_paid
            // clear input after successful lookup
            referenceInput.value = ''
        } else {
            const msg = details?.message || 'No active borrow record found for this reference.'
            showDialog('Return Info', msg, false)
        }
    } catch (err) {
        console.warn('searchByReference failed', err)
        const serverMsg = err?.response?.data?.message || err?.message || 'Failed to fetch return details.'
        showDialog('Return Error', serverMsg, true)
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

async function onDecode(content) {
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

    // Log raw incoming scan for debugging
    try {
        console.log('QR scan decoded', { raw: content, text, parsed, mode: scannerMode.value })
    } catch (e) { console.warn('Failed to log QR scan', e) }

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

        // fallback: check if the scanned text contains any known bookCode
        if (!fb && text) {
            fb = books.value.find(b => text.includes(String(b.bookCode)))
        }

        // If not found locally, try backend lookup by reference/text
        if (!fb) {
            const searchKey = parsed?.reference_number || parsed?.book?.reference_number || parsed?.bookCode || parsed?.code || text
            try {
                const details = await getReturnDetails(searchKey)
                console.log('Return details response (lookup by text)', details)
                const borrowRec = details?.borrow || details?.data || (details && (details.id || details.student || details.book) ? details : null)
                if (borrowRec) {
                    // Map backend borrow record into frontend shape and upsert into borrowRecords
                    const mapped = {
                        id: borrowRec.id,
                        book: {
                            title: borrowRec.book?.catalogue?.title || borrowRec.book?.title || borrowRec.book_title || '',
                            author: borrowRec.book?.catalogue?.author || borrowRec.book?.author || borrowRec.book_author || '',
                            bookCode: borrowRec.book?.reference_number || borrowRec.reference_number || ''
                        },
                        student: {
                            id: borrowRec.student?.id || borrowRec.student_id || null,
                            name: (borrowRec.student?.first_name || borrowRec.student?.name || '') + (borrowRec.student?.middle_name ? ' ' + borrowRec.student.middle_name : '') + (borrowRec.student?.last_name ? ' ' + borrowRec.student.last_name : ''),
                            email: borrowRec.student?.email || '' ,
                            studentId: borrowRec.student?.student_id || borrowRec.student_id || null
                        },
                        dueDate: borrowRec.due_date || borrowRec.dueDate || null,
                        status: borrowRec.status || 'borrowed',
                        is_fine_paid: !!borrowRec.is_fine_paid,
                        penalty_amount: borrowRec.penalty_amount || 0
                    }

                    const idx = borrowRecords.value.findIndex(r => r.id === mapped.id)
                    if (idx >= 0) {
                        borrowRecords.value.splice(idx, 1, mapped)
                    } else {
                        borrowRecords.value.unshift(mapped)
                    }

                    selectedStudent.value = mapped.student
                    selectedBook.value = mapped.book
                    currentBorrowId.value = mapped.id
                    finePaid.value = !!mapped.is_fine_paid
                    // close scanner
                    scannerOpen.value = false
                    cameraStatus.value = 'stopped'
                    return
                }

                // no borrow record returned
                scannerOpen.value = false
                cameraStatus.value = 'stopped'
                const msg = details?.message || 'No active borrow record found for this book.'
                showDialog('Return Info', msg, false)
                return
            } catch (err) {
                scannerOpen.value = false
                cameraStatus.value = 'stopped'
                const serverMsg = err?.response?.data?.message || err?.message || 'Failed to fetch return details.'
                showDialog('Return Error', serverMsg, true)
                return
            }
        }

        if (fb) {
            selectedBook.value = fb
            // Prefer fetching fresh return details from the dedicated endpoint
            try {
                const details = await getReturnDetails(fb.bookCode)
                console.log('Return details response', details)
                // backend may return an object with the borrow record or nested fields
                const borrowRec = details?.borrow || details?.data || (details && (details.id || details.student || details.book) ? details : null)
                if (borrowRec) {
                    // Map backend borrow record into frontend shape and upsert into borrowRecords
                    const mapped = {
                        id: borrowRec.id,
                        book: {
                            title: borrowRec.book?.catalogue?.title || borrowRec.book?.title || borrowRec.book_title || fb.title || '',
                            author: borrowRec.book?.catalogue?.author || borrowRec.book?.author || borrowRec.book_author || fb.author || '',
                            bookCode: borrowRec.book?.reference_number || borrowRec.book?.reference_number || borrowRec.reference_number || fb.bookCode || fb.bookCode
                        },
                        student: {
                            id: borrowRec.student?.id || borrowRec.student_id || null,
                            name: (borrowRec.student?.first_name || borrowRec.student?.name || '') + (borrowRec.student?.middle_name ? ' ' + borrowRec.student.middle_name : '') + (borrowRec.student?.last_name ? ' ' + borrowRec.student.last_name : ''),
                            email: borrowRec.student?.email || '' ,
                            studentId: borrowRec.student?.student_id || borrowRec.student_id || null
                        },
                        dueDate: borrowRec.due_date || borrowRec.dueDate || null,
                        status: borrowRec.status || 'borrowed',
                        is_fine_paid: !!borrowRec.is_fine_paid,
                        penalty_amount: borrowRec.penalty_amount || 0
                    }

                    const idx = borrowRecords.value.findIndex(r => r.id === mapped.id)
                    if (idx >= 0) {
                        borrowRecords.value.splice(idx, 1, mapped)
                    } else {
                        borrowRecords.value.unshift(mapped)
                    }

                    selectedStudent.value = mapped.student
                    selectedBook.value = mapped.book
                    currentBorrowId.value = mapped.id
                    finePaid.value = !!mapped.is_fine_paid
                } else {
                    // No borrow record returned — close scanner and show API message
                    scannerOpen.value = false
                    cameraStatus.value = 'stopped'
                    const msg = details?.message || 'No active borrow record found for this book.'
                    showDialog('Return Info', msg, false)
                    return
                }
            } catch (err) {
                // On error, close scanner and show API error message
                console.warn('getReturnDetails failed', err)
                scannerOpen.value = false
                cameraStatus.value = 'stopped'
                const serverMsg = err?.response?.data?.message || err?.message || 'Failed to fetch return details.'
                showDialog('Return Error', serverMsg, true)
                return
            }
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
            if (parsed.id) candidates.push(String(parsed.id))
        }
        candidates.push(text)

        let fs = null
        for (const c of candidates) {
            const cc = (c || '').toString().trim()
            if (!cc) continue
            fs = students.value.find(s => (s.email && String(s.email).toLowerCase() === cc.toLowerCase()) || String(s.id) === cc || String(s.studentId) === cc)
            if (fs) break
        }

        // fallback: substring search in text
        if (!fs && text) {
            for (const s of students.value) {
                if (s.studentId && text.includes(String(s.studentId))) { fs = s; break }
                if (s.email && text.toLowerCase().includes(String(s.email).toLowerCase())) { fs = s; break }
            }
        }

        if (fs) {
            console.log('QR decoded - student', { raw: content, text, parsed, candidates, matched: fs })
            // also log if we can find a matching borrow record for this student
            const matchedRec = borrowRecords.value.find(r => r.student && (String(r.student.id) === String(fs.id) || (r.student.email && fs.email && r.student.email.toLowerCase() === fs.email.toLowerCase()) || (r.student.studentId && fs.studentId && String(r.student.studentId) === String(fs.studentId))))
            if (matchedRec) {
                console.log('Matched borrow record for scanned student', matchedRec)
                currentBorrowId.value = matchedRec.id
            }
            selectedStudent.value = fs
            scannerOpen.value = false
            cameraStatus.value = 'stopped'
            return
        }

        // nothing matched for student
        return
    }
}

const canReturn = computed(() => !!selectedBook.value && !!selectedStudent.value)

const currentBorrow = computed(() => borrowRecords.value.find(r => r.id === currentBorrowId.value) || null)

function showDialog(title, message, isError = false) {
    dialog.value = {
        visible: true,
        title,
        message,
        isError
    }
}

async function confirmReturn() {
    if (!canReturn.value) return

    isReturning.value = true

    try {
        if (!currentBorrowId.value) {
            showDialog('Return Error', 'No matching borrow record found for this book and borrower.', true)
            return
        }

        const current = currentBorrow.value
        const payload = {
            return_date: new Date().toISOString().split('T')[0],
            remarks: returnRemarks.value
        }

        // Ensure we send the fine flag to the backend when the borrow is overdue
        if (current && current.status === 'overdue') {
            payload.is_fine_paid = !!finePaid.value
        }

        console.log('Returning borrow id', currentBorrowId.value, 'with payload', payload)
        const result = await returnBook(currentBorrowId.value, payload)

        // Add to recent returns display
        const record = {
            book: selectedBook.value,
            student: selectedStudent.value,
            date: new Date().toLocaleString(),
            penalty: null
        }
        recentReturns.value.unshift(record)

        // Reset form
        selectedBook.value = null
        selectedStudent.value = null
        currentBorrowId.value = null
        finePaid.value = false
        returnRemarks.value = ''

        console.log('Return successful:', result)
    } catch (error) {
        console.error('Return failed:', error)
        const serverMsg = error?.response?.data?.message || error?.response?.data || error?.message || 'Failed to return book'
        showDialog('Return Error', serverMsg, true)
    } finally {
        isReturning.value = false
    }
}

function confirmBorrow() {
    if (!canBorrow.value) return
    const record = {
        book: selectedBook.value,
        student: selectedStudent.value,
        date: new Date().toLocaleString(),
    }
    // recentBorrows.value.unshift(record)
    // reset selection
    selectedBook.value = null
    selectedStudent.value = null
}

// simulate input for testing without a physical QR
const simulateInput = ref('')
function simulateScan() {
    if (!simulateInput.value) return
    // call the same decode handler as the scanner
    onDecode(simulateInput.value)
}

// Load current borrow records and derive selectable books/students
async function loadBorrowData() {
    try {
        const data = await getBorrowRecords()
        const raw = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])

        // Keep only records that are currently borrowed (including overdue)
        borrowRecords.value = raw
            .filter(r => {
                const status = (r.status || '').toString().toLowerCase()
                return status === 'borrowed' || status === 'overdue'
            })
            .map(record => ({
                        id: record.id,
                book: {
                    title: record.book?.title || record.book_title || '',
                    author: record.book?.author || record.book_author || '',
                    bookCode: record.reference_id || record.book_code || record.book?.reference_number || '',
                },
                student: {
                    id: record.student?.id || record.student_id || null,
                    name: record.student?.name || record.student_name || '',
                    email: record.student?.email || record.student_email || '',
                    studentId: record.student?.student_id || record.student_id_number || null,
                },
                dueDate: record.due_date,
                        status: record.status || 'borrowed',
                        is_fine_paid: !!record.is_fine_paid,
                        penalty_amount: record.penalty_amount || 0,
            }))

        // Derive unique books and students for dropdowns
        const bookMap = new Map()
        const studentMap = new Map()
        for (const r of borrowRecords.value) {
            if (r.book && r.book.bookCode && !bookMap.has(r.book.bookCode)) {
                bookMap.set(r.book.bookCode, r.book)
            }
            const skey = r.student.id || r.student.email || r.student.studentId
            if (skey && !studentMap.has(skey)) {
                studentMap.set(skey, r.student)
            }
        }
        books.value = Array.from(bookMap.values())
        students.value = Array.from(studentMap.values())

        console.log('ReturnBooks loaded borrow records:', borrowRecords.value.length)
    } catch (error) {
        console.error('Failed to load borrow records for return:', error)
        showDialog('Load Error', error.message || 'Failed to load borrow records.', true)
    }
}

onMounted(() => {
    loadBorrowData()
})

// react to book selection to populate flags and current borrow id
watch(selectedBook, (val) => {
    if (!val) {
        finePaid.value = false
        currentBorrowId.value = null
        return
    }
    const rec = borrowRecords.value.find(r => r.book.bookCode === val.bookCode)
    if (rec) {
        finePaid.value = !!rec.is_fine_paid
        currentBorrowId.value = rec.id
        // also set student if not set
        if (!selectedStudent.value) selectedStudent.value = rec.student
    } else {
        finePaid.value = false
        currentBorrowId.value = null
    }
})

async function markLost() {
    // Deprecated: use confirm flow via openMarkLostConfirm -> confirmDialogConfirmed
    if (!currentBorrowId.value) return showDialog('Error', 'No active borrow selected to mark lost.', true)
    // fallback direct action if called programmatically
    try {
        await updateBorrowRecord(currentBorrowId.value, { status: 'lost', is_fine_paid: !!finePaid.value })
        showDialog('Success', 'Borrow marked as lost.')
        // refresh data
        await loadBorrowData()
        // clear selection
        selectedBook.value = null
        selectedStudent.value = null
        finePaid.value = false
    } catch (err) {
        console.error('Failed to mark lost:', err)
        showDialog('Error', err.message || 'Failed to mark as lost.', true)
    }
}

function openMarkLostConfirm() {
    if (!currentBorrowId.value) return showDialog('Error', 'No active borrow selected to mark lost.', true)
    confirmDialog.value = {
        visible: true,
        title: 'Confirm Mark Lost',
        message: 'Are you sure you want to mark this borrow record as LOST? This action cannot be easily undone.',
        action: 'mark_lost',
        payload: { borrowId: currentBorrowId.value }
    }
}

async function confirmDialogConfirmed() {
    const { action, payload } = confirmDialog.value || {}
    confirmDialog.value.visible = false
    if (!action) return
    if (action === 'mark_lost') {
        const id = payload?.borrowId || currentBorrowId.value
        if (!id) return showDialog('Error', 'No active borrow selected to mark lost.', true)
        try {
            await updateBorrowRecord(id, { status: 'lost', is_fine_paid: !!finePaid.value })
            showDialog('Success', 'Borrow marked as lost.')
            await loadBorrowData()
            selectedBook.value = null
            selectedStudent.value = null
            finePaid.value = false
        } catch (err) {
            console.error('Failed to mark lost:', err)
            showDialog('Error', err.message || 'Failed to mark as lost.', true)
        }
    }
}
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