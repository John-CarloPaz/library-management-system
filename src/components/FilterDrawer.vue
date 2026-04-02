<template>
    <!-- Edge-Connected Filter Button -->
    <div
        class="filter-btn-container"
        :style="{ top: buttonPosition.y + 'px' }"
        @mousedown="startDrag"
        @touchstart="startDrag"
    >
        <v-btn
            icon="fa-filter"
            class="filter-toggle-btn"
            :class="{ active: isOpen }"
            @click="toggleDrawer"
            title="Open Filters - Drag to move"
            elevation="4"
            color="white"
        />
    </div>

    <!-- Filter Drawer -->
    <v-navigation-drawer
        v-model="isOpen"
        :permanent="false"
        temporary
        location="right"
        width="380"
        class="filter-drawer"
    >
        <div class="filter-drawer-content">
            <!-- Header -->
            <div class="filter-header">
                <h3 class="filter-title">Filters</h3>
                <v-btn
                    icon="fa-times"
                    size="small"
                    variant="text"
                    @click="toggleDrawer"
                />
            </div>

            <!-- Divider -->
            <v-divider class="my-0"></v-divider>

            <!-- Filter Content -->
            <div class="filter-body">
                <!-- Text Search Filter -->
                <template v-if="hasFilter('search')">
                    <div class="filter-section">
                        <label class="filter-label">Search {{ searchLabel }}</label>
                        <v-text-field
                            v-model="localFilters.search"
                            :placeholder="`Search ${searchLabel}...`"
                            variant="solo"
                            density="compact"
                            clearable
                            prepend-inner-icon="fa-search"
                        />
                    </div>
                </template>

                <!-- Status Filter (Select) -->
                <template v-if="hasFilter('status')">
                    <div class="filter-section">
                        <label class="filter-label">Status</label>
                        <v-select
                            v-model="localFilters.status"
                            :items="statusOptions"
                            label="All Status"
                            variant="solo"
                            density="compact"
                            clearable
                            multiple
                            chips
                        >
                            <template #item="{ props, item }">
                                <v-list-item v-bind="props" :prepend-icon="null">
                                    <template #prepend></template>
                                </v-list-item>
                            </template>
                        </v-select>
                    </div>
                </template>

                <!-- Method Filter (Select) -->
                <template v-if="hasFilter('method')">
                    <div class="filter-section">
                        <label class="filter-label">Method</label>
                        <v-select
                            v-model="localFilters.method"
                            :items="methodOptions"
                            label="All Methods"
                            variant="solo"
                            density="compact"
                            clearable
                            multiple
                            chips
                        >
                            <template #item="{ props, item }">
                                <v-list-item v-bind="props" :prepend-icon="null">
                                    <template #prepend></template>
                                </v-list-item>
                            </template>
                        </v-select>
                    </div>
                </template>

                <!-- Branch Filter (Select) -->
                <template v-if="hasFilter('branch')">
                    <div class="filter-section">
                        <label class="filter-label">Branch</label>
                        <v-select
                            v-model="localFilters.branch"
                            :items="branchOptions"
                            item-title="name"
                            item-value="id"
                            label="All Branches"
                            variant="solo"
                            density="compact"
                            clearable
                            multiple
                            chips
                        />
                    </div>
                </template>

                <!-- Single Date Filter -->
                <template v-if="hasFilter('dateAcquired')">
                    <div class="filter-section">
                        <label class="filter-label">Date Acquired</label>
                        <v-text-field
                            v-model="localFilters.dateAcquired"
                            type="date"
                            variant="solo"
                            density="compact"
                            append-inner-icon="fa-calendar"
                            clearable
                        />
                    </div>
                </template>

                <!-- Date Range Filter -->
                <template v-if="hasFilter('dateAddedRange')">
                    <div class="filter-section">
                        <label class="filter-label">Date Added Between</label>
                        <div class="date-range-group">
                            <v-text-field
                                v-model="localFilters.dateAddedFrom"
                                type="date"
                                label="From"
                                variant="solo"
                                density="compact"
                                append-inner-icon="fa-calendar"
                            />
                            <div class="range-divider">to</div>
                            <v-text-field
                                v-model="localFilters.dateAddedTo"
                                type="date"
                                label="To"
                                variant="solo"
                                density="compact"
                                append-inner-icon="fa-calendar"
                            />
                        </div>
                    </div>
                </template>

                <!-- Custom Filter Slot -->
                <slot name="additional-filters"></slot>
            </div>

            <!-- Divider -->
            <v-divider class="my-2"></v-divider>

            <!-- Action Buttons -->
            <div class="filter-footer">
                <v-btn
                    text
                    size="small"
                    @click="resetFilters"
                    block
                    class="mb-2"
                >
                    Reset Filters
                </v-btn>
                <v-btn
                    color="primary"
                    size="small"
                    @click="applyAndClose"
                    block
                >
                    Apply Filters
                </v-btn>
            </div>
        </div>
    </v-navigation-drawer>
</template>

<script>
export default {
    name: 'FilterDrawer',
    props: {
        /**
         * Active filters configuration
         * Array of filter names to enable: ['search', 'status', 'method', 'branch', 'dateAcquired', 'dateAddedRange']
         */
        filters: {
            type: Array,
            default: () => [],
        },
        /**
         * Label for search field
         */
        searchLabel: {
            type: String,
            default: 'records',
        },
        /**
         * Status options for dropdown
         */
        statusOptions: {
            type: Array,
            default: () => [
                { value: 'pending', title: 'Pending' },
                { value: 'received', title: 'Received' },
                { value: 'partial', title: 'Partial' },
                { value: 'missing', title: 'Missing' },
                { value: 'cancelled', title: 'Cancelled' },
            ],
        },
        /**
         * Method options for dropdown
         */
        methodOptions: {
            type: Array,
            default: () => [
                { value: 'book_fair', title: 'Book Fair' },
                { value: 'supplier', title: 'Supplier' },
                { value: 'donation', title: 'Donation' },
            ],
        },
        /**
         * Branch options for dropdown
         */
        branchOptions: {
            type: Array,
            default: () => [],
        },
        /**
         * Initial filter values
         */
        modelValue: {
            type: Object,
            default: () => ({
                search: '',
                status: [],
                method: [],
                branch: [],
                dateAcquired: '',
                dateAddedFrom: '',
                dateAddedTo: '',
            }),
        },
    },
    emits: ['update:modelValue', 'apply'],
    data() {
        return {
            isOpen: false,
            buttonPosition: {
                y: 100,
            },
            isDragging: false,
            dragStartY: 0,
            dragStartPos: 0,
            localFilters: {
                search: '',
                status: [],
                method: [],
                branch: [],
                dateAcquired: '',
                dateAddedFrom: '',
                dateAddedTo: '',
            },
        }
    },
    watch: {
        modelValue: {
            handler(newVal) {
                this.localFilters = { ...newVal }
            },
            deep: true,
        },
    },
    mounted() {
        this.localFilters = { ...this.modelValue }
        // Add document event listeners for dragging
        document.addEventListener('mousemove', this.onDragMove)
        document.addEventListener('mouseup', this.endDrag)
        document.addEventListener('touchmove', this.onDragMove, { passive: false })
        document.addEventListener('touchend', this.endDrag)
    },
    beforeUnmount() {
        document.removeEventListener('mousemove', this.onDragMove)
        document.removeEventListener('mouseup', this.endDrag)
        document.removeEventListener('touchmove', this.onDragMove)
        document.removeEventListener('touchend', this.endDrag)
    },
    methods: {
        toggleDrawer() {
            this.isOpen = !this.isOpen
        },
        hasFilter(filterName) {
            return this.filters.includes(filterName)
        },
        emitFilters() {
            this.$emit('update:modelValue', { ...this.localFilters })
        },
        resetFilters() {
            this.localFilters = {
                search: '',
                status: [],
                method: [],
                branch: [],
                dateAcquired: '',
                dateAddedFrom: '',
                dateAddedTo: '',
            }
            // Do not emit immediately; respect explicit Apply action
        },
        applyAndClose() {
            // Emit the chosen filters and a semantic 'apply' event, then close drawer
            this.$emit('update:modelValue', { ...this.localFilters })
            this.$emit('apply', { ...this.localFilters })
            this.toggleDrawer()
        },
        startDrag(e) {
            // Prevent opening drawer when dragging
            if (e.button === 2) return // Ignore right-click
            
            this.isDragging = true
            const clientY = e.touches ? e.touches[0].clientY : e.clientY
            this.dragStartY = clientY
            this.dragStartPos = this.buttonPosition.y
            e.preventDefault()
        },
        onDragMove(e) {
            if (!this.isDragging) return
            
            const clientY = e.touches ? e.touches[0].clientY : e.clientY
            const delta = clientY - this.dragStartY
            let newY = this.dragStartPos + delta
            
            // Constrain button to viewport bounds
            const minY = 24
            const maxY = window.innerHeight - 80
            newY = Math.max(minY, Math.min(maxY, newY))
            
            this.buttonPosition.y = newY
            
            if (e.touches) {
                e.preventDefault()
            }
        },
        endDrag() {
            this.isDragging = false
        },
    },
}
</script>

<style scoped>
.filter-btn-container {
    position: fixed !important;
    right: 0;
    width: 56px;
    height: 56px;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    transition: right 0.2s ease;
    user-select: none;
}

.filter-btn-container:active {
    cursor: grabbing;
}

.filter-toggle-btn {
    width: 56px !important;
    height: 56px !important;
    border-radius: 8px 0 0 8px !important;
    font-size: 20px;
    color: #1976d2 !important;
    transition: all 0.3s ease;
    box-shadow: -4px 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.filter-toggle-btn:hover {
    box-shadow: -6px 6px 16px rgba(0, 0, 0, 0.2) !important;
    transform: translateX(-4px);
}

.filter-toggle-btn.active {
    color: #1565c0 !important;
}

.filter-drawer {
    border-left: 1px solid #e0e0e0;
}

.filter-drawer-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    flex-shrink: 0;
}

.filter-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
}

.filter-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.filter-section {
    margin-bottom: 20px;
}

.filter-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #666;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.date-range-group {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
    align-items: center;
}

.range-divider {
    text-align: center;
    color: #999;
    font-size: 12px;
    padding-top: 8px;
}

.filter-footer {
    flex-shrink: 0;
    padding: 16px;
    background-color: #fafafa;
}

/* Scrollbar styling for filter body */
.filter-body::-webkit-scrollbar {
    width: 6px;
}

.filter-body::-webkit-scrollbar-track {
    background: #f1f1f1;
}

.filter-body::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
}

.filter-body::-webkit-scrollbar-thumb:hover {
    background: #555;
}

/* Mobile responsiveness */
@media (max-width: 600px) {
    .filter-toggle-btn {
        width: 48px !important;
        height: 48px !important;
        border-radius: 6px 0 0 6px !important;
    }

    .filter-btn-container {
        width: 48px;
        height: 48px;
    }
}
</style>
