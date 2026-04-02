<template>
    <AppBar title="Dashboard" />

    <v-container class="mt-4">
        <v-row>
            <!-- Overview cards -->
            <v-col cols="12" md="3" v-for="card in overviewCards" :key="card.key">
                <v-card elevation="1" class="pa-4 dashboard-card">
                    <div class="d-flex justify-space-between align-center mb-2">
                        <span class="text-caption text-grey-darken-1 text-uppercase">{{ card.label }}</span>
                        <v-icon :color="card.color" size="20">{{ card.icon }}</v-icon>
                    </div>
                    <div class="d-flex align-end justify-space-between">
                        <span class="text-h5 font-weight-bold">{{ card.valueDisplay }}</span>
                        <span v-if="card.sublabel" class="text-caption text-grey-darken-2">{{ card.sublabel }}</span>
                    </div>
                </v-card>
            </v-col>
        </v-row>

        <v-row class="mt-2" dense>
            <!-- Top books -->
            <v-col cols="12" md="6">
                <v-card elevation="1" class="pa-4 h-100">
                    <div class="d-flex justify-space-between align-center mb-3">
                        <span class="text-subtitle-1 font-weight-medium">Most Borrowed Books</span>
                        <v-chip size="x-small" color="primary" variant="outlined">Top 10</v-chip>
                    </div>
                    <v-table density="compact">
                        <thead>
                            <tr>
                                <th class="text-left">Title</th>
                                <th class="text-left">Author</th>
                                <th class="text-right">Borrows</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loadingTopBooks">
                                <td colspan="3">
                                    <v-progress-linear indeterminate></v-progress-linear>
                                </td>
                            </tr>
                            <tr v-else-if="topBooks.length === 0">
                                <td colspan="3" class="text-center text-grey">No borrow data yet</td>
                            </tr>
                            <tr v-else v-for="book in topBooks" :key="book.book_id">
                                <td>{{ book.book?.catalogue?.title || book.book?.title || 'Unknown Title' }}</td>
                                <td>{{ book.book?.catalogue?.author || book.book?.author || 'Unknown Author' }}</td>
                                <td class="text-right font-weight-medium">{{ book.borrow_count }}</td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-card>
            </v-col>

            <!-- Top borrowers -->
            <v-col cols="12" md="6">
                <v-card elevation="1" class="pa-4 h-100">
                    <div class="d-flex justify-space-between align-center mb-3">
                        <span class="text-subtitle-1 font-weight-medium">Top Borrowers</span>
                        <v-chip size="x-small" color="primary" variant="outlined">Top 10</v-chip>
                    </div>
                    <v-table density="compact">
                        <thead>
                            <tr>
                                <th class="text-left">Student</th>
                                <th class="text-left">Email</th>
                                <th class="text-right">Borrows</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loadingTopBorrowers">
                                <td colspan="3">
                                    <v-progress-linear indeterminate></v-progress-linear>
                                </td>
                            </tr>
                            <tr v-else-if="topBorrowers.length === 0">
                                <td colspan="3" class="text-center text-grey">No borrower data yet</td>
                            </tr>
                            <tr v-else v-for="row in topBorrowers" :key="row.student_id">
                                <td>{{ row.student?.name || row.student?.full_name || `Student ${row.student_id}` }}</td>
                                <td>{{ row.student?.email || 'N/A' }}</td>
                                <td class="text-right font-weight-medium">{{ row.borrow_count }}</td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-card>
            </v-col>
        </v-row>

        <!-- Trends -->
        <v-row class="mt-2">
            <v-col cols="12">
                <v-card elevation="1" class="pa-4">
                    <div class="d-flex justify-space-between align-center mb-4">
                        <div>
                            <span class="text-subtitle-1 font-weight-medium">Borrow Trends</span>
                            <p class="text-caption text-grey-darken-1 mb-0">Overall borrowing activity over time</p>
                        </div>
                        <v-btn-toggle
                            v-model="trendsRange"
                            density="compact"
                            variant="outlined"
                            mandatory
                        >
                            <v-btn value="daily" size="small">Daily</v-btn>
                            <v-btn value="monthly" size="small">Monthly</v-btn>
                        </v-btn-toggle>
                    </div>

                    <div v-if="loadingTrends">
                        <v-progress-linear indeterminate></v-progress-linear>
                    </div>
                    <div v-else-if="trendSeries.length === 0" class="text-center text-grey">
                        No trend data available yet
                    </div>
                    <div v-else>
                        <v-sparkline
                            class="borrow-sparkline"
                            :model-value="displaySeries.map(Number)"
                            :smooth="8"
                            color="primary"
                            line-width="2"
                            height="64"
                            auto-draw
                        />
                        <div class="d-flex justify-space-between mt-2 text-caption text-grey-darken-1">
                            <span>Points: {{ trends.length }}</span>
                            <span>Total Borrows: {{ trendTotal }}</span>
                        </div>
                    </div>
                </v-card>
            </v-col>
        </v-row>

        <ErrorDialog
            :visible.sync="dialog.visible"
            :title="dialog.title"
            :message="dialog.message"
            :isError="dialog.isError"
            @update:visible="val => (dialog.visible = val)"
        />
    </v-container>
</template>

<script>
import AppBar from '../components/AppBar.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { getBorrowOverview, getMostBorrowedBooks, getTopBorrowers, getBorrowTrends, getAverageBorrowDuration } from '@/services/borrowAnalytics'
import { waitForEchoConnection, subscribeToActions } from '@/services/realtime'

export default {
    name: 'Dashboard',
    components: {
        AppBar,
        ErrorDialog,
    },
    data() {
        return {
            overview: null,
            averageDuration: null,
            topBooks: [],
            topBorrowers: [],
            trends: [],
            trendsRange: 'daily',
            loadingOverview: false,
            loadingTopBooks: false,
            loadingTopBorrowers: false,
            loadingTrends: false,
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: true,
            },
            reloadTimeout: null,
        }
    },
    computed: {
        overviewCards() {
            const o = this.overview || {}
            const avgDays = this.averageDuration && this.averageDuration.average_borrow_days
                ? Number(this.averageDuration.average_borrow_days).toFixed(2)
                : '0.00'

            return [
                {
                    key: 'total_borrows',
                    label: 'Total Borrows',
                    value: o.total_borrows || 0,
                    valueDisplay: o.total_borrows?.toLocaleString?.() || (o.total_borrows || 0),
                    icon: 'fa-book-open',
                    color: 'primary',
                },
                {
                    key: 'active_borrows',
                    label: 'Active Borrows',
                    value: o.active_borrows || 0,
                    valueDisplay: o.active_borrows?.toLocaleString?.() || (o.active_borrows || 0),
                    icon: 'fa-arrow-right-arrow-left',
                    color: 'indigo',
                },
                {
                    key: 'overdue_borrows',
                    label: 'Overdue',
                    value: o.overdue_borrows || 0,
                    valueDisplay: o.overdue_borrows?.toLocaleString?.() || (o.overdue_borrows || 0),
                    icon: 'fa-clock-rotate-left',
                    color: 'warning',
                    sublabel: `${o.overdue_rate_percent || 0}% of all borrows`,
                },
                {
                    key: 'average_duration',
                    label: 'Avg. Duration (days)',
                    value: avgDays,
                    valueDisplay: avgDays,
                    icon: 'fa-calendar-day',
                    color: 'success',
                },
            ]
        },
        trendSeries() {
            return this.trends.map(t => Number(t.total) || 0)
        },
        // Sparkline visuals require at least two points to draw a line.
        // When backend returns a single point, pad for display only.
        displaySeries() {
            const s = this.trendSeries
            if (!s || s.length === 0) return []
            // For a single datapoint, create a small peak so the sparkline is visible
            if (s.length === 1) return [0, s[0], 0]
            return s
        },
        useSvgFallback() {
            // Use SVG fallback for very small series where sparkline may not render visibly
            const s = this.displaySeries || []
            return s.length > 0 && s.length <= 3
        },
        svgPointsAttr() {
            const s = (this.displaySeries || []).map(v => Number(v) || 0)
            if (!s || s.length === 0) return ''
            const n = s.length
            const max = Math.max(...s, 1)
            // Map to viewBox 0..100 (x) and 0..64 (y). invert y for SVG coordinate system
            return s.map((v, i) => {
                const x = n === 1 ? 50 : (i * 100) / (n - 1)
                const y = 64 - (v / (max || 1)) * 64
                return `${x},${y}`
            }).join(' ')
        },
        // Return array of point strings for contiguous rising segments (slope > 0)
        svgRisingSegments() {
            const s = (this.displaySeries || []).map(v => Number(v) || 0)
            if (!s || s.length < 2) return []
            const n = s.length
            const max = Math.max(...s, 1)
            const points = s.map((v, i) => {
                const x = n === 1 ? 50 : (i * 100) / (n - 1)
                const y = 64 - (v / (max || 1)) * 64
                return { x, y }
            })

            const segments = []
            let current = null
            for (let i = 0; i < points.length - 1; i++) {
                const a = points[i]
                const b = points[i + 1]
                if (b.y < a.y) {
                    // rising (since y is inverted)
                    if (!current) current = [a]
                    current.push(b)
                } else {
                    if (current) {
                        segments.push(current.map(p => `${p.x},${p.y}`).join(' '))
                        current = null
                    }
                }
            }
            if (current) segments.push(current.map(p => `${p.x},${p.y}`).join(' '))
            return segments
        },
        svgStrokeColor() {
            // Fallback color; Vuetify primary hex. Adjust if your theme differs.
            return '#1976d2'
        },
        trendTotal() {
            return this.trendSeries.reduce((sum, v) => sum + v, 0)
        },
    },
    watch: {
        trendsRange: {
            handler() {
                this.loadTrends()
            },
        },
    },
    mounted() {
        console.log('Dashboard mounted')
        this.loadAll()

        // Real-time refresh when borrow-related actions occur
        waitForEchoConnection().then(() => {
            subscribeToActions((data) => {
                const type = data && data.resource_type
                if (type === 'borrow' || type === 'borrows' || type === 'borrow_record') {
                    this.scheduleReload()
                }
            })
        })
    },
    beforeUnmount() {
        if (this.reloadTimeout) {
            clearTimeout(this.reloadTimeout)
        }
    },
    methods: {
        async loadAll() {
            console.log('Dashboard: loadAll() starting')
            await Promise.all([
                this.loadOverview(),
                this.loadTopBooks(),
                this.loadTopBorrowers(),
                this.loadTrends(),
                this.loadAverageDuration(),
            ])
        },
        async loadOverview() {
            this.loadingOverview = true
            try {
                this.overview = await getBorrowOverview()
            } catch (error) {
                console.error('Failed to load overview:', error)
                this.showError('Load Failed', 'Failed to load borrow overview.')
            } finally {
                this.loadingOverview = false
            }
        },
        async loadTopBooks() {
            this.loadingTopBooks = true
            try {
                this.topBooks = await getMostBorrowedBooks()
            } catch (error) {
                console.error('Failed to load most borrowed books:', error)
                this.showError('Load Failed', 'Failed to load most borrowed books.')
            } finally {
                this.loadingTopBooks = false
            }
        },
        async loadTopBorrowers() {
            this.loadingTopBorrowers = true
            try {
                this.topBorrowers = await getTopBorrowers()
            } catch (error) {
                console.error('Failed to load top borrowers:', error)
                this.showError('Load Failed', 'Failed to load top borrowers.')
            } finally {
                this.loadingTopBorrowers = false
            }
        },
        async loadTrends() {
            this.loadingTrends = true
            try {
                console.log('Dashboard: loading trends, range=', this.trendsRange)
                const raw = await getBorrowTrends(this.trendsRange)
                this.trends = raw
                // Visible logs for debugging
                try {
                    console.log('BorrowTrends raw:', raw)
                    console.log('trendSeries:', this.trendSeries)
                    console.log('displaySeries:', this.displaySeries)
                } catch (e) {
                    // ignore logging errors
                }
            } catch (error) {
                console.error('Failed to load borrow trends:', error)
                this.showError('Load Failed', 'Failed to load borrow trends.')
            } finally {
                this.loadingTrends = false
            }
        },
        async loadAverageDuration() {
            try {
                this.averageDuration = await getAverageBorrowDuration()
            } catch (error) {
                console.error('Failed to load average borrow duration:', error)
            }
        },
        scheduleReload() {
            if (this.reloadTimeout) {
                clearTimeout(this.reloadTimeout)
            }
            this.reloadTimeout = setTimeout(() => {
                this.loadAll()
            }, 500)
        },
        showError(title, message) {
            this.dialog = {
                visible: true,
                title,
                message,
                isError: true,
            }
        },
    },
}
</script>

<style scoped>
.dashboard-card {
    border-radius: 12px;
}
.borrow-sparkline .v-sparkline__line {
    stroke-width: 1px !important;
}
</style>
