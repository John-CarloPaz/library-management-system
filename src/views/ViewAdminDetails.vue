<template>
    <v-container>
        <v-row>
            <v-col cols="12">
                <AppBar :title="`Admin Details`" />

                <!-- Status Banner -->
                <StatusBanner 
                    v-if="bannerMessage"
                    :type="bannerType"
                    :message="bannerMessage"
                    :duration="5000"
                    class="mt-4"
                />

                <v-card elevation="0" class="py-3" v-if="!isLoading">
                    <v-card-text>
                        <InfoTable 
                            title="Admin Information"
                            :fields="adminFieldsData"
                        />

                        <v-row class="mt-4" justify="end">
                            <v-btn
                                variant="outlined"
                                class="mr-2 bg-white text-primary"
                                @click="goBack"
                            >
                                Back
                            </v-btn>
                            <v-btn
                                color="primary"
                                @click="editAdmin"
                            >
                                Edit
                            </v-btn>
                        </v-row>
                    </v-card-text>
                </v-card>

                <v-card elevation="1" v-if="isLoading" class="py-3">
                    <v-card-text>
                        <v-progress-linear indeterminate></v-progress-linear>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue';
import Table from '@/components/Table.vue';
import StatusBanner from '@/components/StatusBanner.vue';
import InfoTable from '@/components/InfoTable.vue';
import { getAdmin } from '@/services/admin';
import { getBranch } from '@/services/branch';
import { getSession } from '@/services/auth'

export default {
    name: 'ViewAdminDetails',
    components: { AppBar, Table, StatusBanner, InfoTable },
    data() {
        return {
            isLoading: false,
            adminId: null,
            bannerMessage: '',
            bannerType: 'success',
            session: null,
            admin: {
                id: '',
                username: '',
                email: '',
                employee_id: '',
                first_name: '',
                last_name: '',
                middle_name: '',
                suffix: '',
                role: '',
                branch_id: '',
                employee_type: '',
                is_active: true,
            },
            branchName: '',
        };
    },
    mounted() {
        try {
            this.session = getSession() || null
        } catch (e) {
            this.session = null
        }

        this.adminId = this.$route.params.id;
        // Check if coming from successful update
        if (this.$route.query.success) {
            this.bannerMessage = 'Admin updated successfully!';
            this.bannerType = 'success';
        }
        if (this.adminId) {
            this.loadAdmin();
        }
    },
    methods: {
        isBranchAdmin() {
            const role = this.session && this.session.role ? String(this.session.role).toLowerCase() : ''
            return role === 'branch_admin'
        },
        sessionBranchId() {
            const raw = this.session && this.session.branch_id != null ? this.session.branch_id : null
            const n = raw != null ? Number(raw) : null
            return Number.isFinite(n) ? n : raw
        },
        canAccessAdminRecord(admin) {
            const role = this.session && this.session.role ? String(this.session.role).toLowerCase() : ''
            if (role === 'super_admin') return true
            if (role !== 'branch_admin') return false

            if (!admin) return false
            if (admin.role === 'super_admin') return false
            const branchId = this.sessionBranchId()
            if (branchId == null) return false
            return Number(admin.branch_id) === Number(branchId)
        },
        async loadAdmin() {
            this.isLoading = true;
            try {
                const admin = await getAdmin(this.adminId);

                if (!this.canAccessAdminRecord(admin)) {
                    this.bannerType = 'error'
                    this.bannerMessage = 'Permission denied. You can only view admins under your own branch.'
                    setTimeout(() => {
                        this.$router.push({ name: 'admin-management' });
                    }, 900)
                    return
                }

                this.admin = admin;

                // Resolve branch name for display
                if (this.admin && this.admin.branch && this.admin.branch.name) {
                    this.branchName = this.admin.branch.name;
                } else if (this.admin && this.admin.branch_id) {
                    try {
                        const branch = await getBranch(this.admin.branch_id);
                        this.branchName = branch.name || `Branch ${this.admin.branch_id}`;
                    } catch (e) {
                        console.error('Failed to load branch for admin:', e);
                        this.branchName = `Branch ${this.admin.branch_id}`;
                    }
                } else {
                    this.branchName = '';
                }
            } catch (error) {
                console.error('Failed to load admin:', error);
                this.branchName = '';
                this.bannerType = 'error'
                this.bannerMessage = 'Failed to load admin. Please try again.'
                setTimeout(() => {
                    this.$router.push({ name: 'admin-management' });
                }, 2000);
            } finally {
                this.isLoading = false;
            }
        },
        goBack() {
            try { this.$router.back(); } catch (e) { console.warn('Failed to navigate back', e); }
        },
        editAdmin() {
            if (!this.canAccessAdminRecord(this.admin)) {
                this.bannerType = 'error'
                this.bannerMessage = 'Permission denied. You can only edit admins under your own branch.'
                return
            }
            this.$router.push({ name: 'edit-admin', params: { id: this.adminId } });
        },
    },
    computed: {
        adminFieldsData() {
            return [
                { label: 'ID', value: this.admin.id },
                { label: 'Username', value: this.admin.username },
                { label: 'Email', value: this.admin.email },
                { label: 'First Name', value: this.admin.first_name },
                { label: 'Last Name', value: this.admin.last_name },
                { label: 'Middle Name', value: this.admin.middle_name },
                { label: 'Suffix', value: this.admin.suffix },
                { label: 'Employee ID', value: this.admin.employee_id },
                { label: 'Role', value: this.admin.role },
                { label: 'Branch', value: this.branchName || (this.admin.branch?.name || (this.admin.branch_id ? `Branch ${this.admin.branch_id}` : '')) },
                { label: 'Employee Type', value: this.admin.employee_type },
                { label: 'Status', value: this.admin.is_active },
            ];
        },
    },
};
</script>


<style scoped>
/* Table styling */
</style>
