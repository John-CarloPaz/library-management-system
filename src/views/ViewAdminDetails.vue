<template>
    <v-container>
        <v-row>
            <v-col cols="12">
                <AppBar :title="`Admin Details`">
                    <template #title-actions>
                        <v-btn text @click="goBack">Back</v-btn>
                        <v-btn color="primary" @click="editAdmin" :disabled="isLoading">Edit</v-btn>
                    </template>
                </AppBar>

                <!-- Status Banner -->
                <StatusBanner 
                    v-if="bannerMessage"
                    :type="bannerType"
                    :message="bannerMessage"
                    :duration="5000"
                    class="mt-4"
                />

                <v-progress-linear v-if="isLoading" indeterminate></v-progress-linear>

                <InfoTable 
                    title="Admin Information"
                    :fields="adminFieldsData"
                    v-if="!isLoading"
                />
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

export default {
    name: 'ViewAdminDetails',
    components: { AppBar, Table, StatusBanner, InfoTable },
    data() {
        return {
            isLoading: false,
            adminId: null,
            bannerMessage: '',
            bannerType: 'success',
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
        async loadAdmin() {
            this.isLoading = true;
            try {
                const admin = await getAdmin(this.adminId);
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
                this.dialog = {
                    visible: true,
                    title: 'Load Failed',
                    message: 'Failed to load admin: ' + (error.message || 'Unknown error'),
                    isError: true,
                };
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
