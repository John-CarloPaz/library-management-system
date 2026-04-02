<template>
    <v-row class="fill-height ma-0">
        <v-col cols="12" lg="4" class="w-100 d-flex flex-column align-center justify-center px-16">
            <v-container fluid class="d-flex justify-start w-100 mb-10">
                <p class="text-h2 font-weight-medium px-0 mb-2 text-blue-darken-4">SPCF Library</p>
            </v-container>

            <v-container fluid class="d-flex flex-column justify-start w-100 mb-2 mt-16">
                <p class="text-h4 text-title text-grey-darken-4">Login to your account</p>
                <p class="text-subtitle mt-3 text-grey-darken-1">Enter your email and password to login</p>
            </v-container>

            <v-container class="mt-2" @keyup.enter="onEnter">
                <v-text-field
                    v-model="email"
                    label="Email"
                    variant="outlined"
                    :disabled="isLoading"
                    type="email"
                    autocomplete="email"
                ></v-text-field>

                <v-text-field
                    ref="passwordField"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    label="Password"
                    variant="outlined"
                    :disabled="isLoading"
                    autocomplete="current-password"
                    :append-inner-icon="showPassword ? 'fa-eye-slash' : 'fa-eye'"
                    @click:append-inner.stop="togglePassword"
                ></v-text-field>

                <div class="mb-4 mt-n2 text-right">
                    <span
                        class="text-grey-darken-2 text-caption forgot-password-link"
                        @click="showForgotPasswordDialog"
                    >
                        Forgot password?
                    </span>
                </div>

                <p v-show="errMsg" class="text-red">{{ errMsg }}</p>

                <v-btn
                    block
                    @click="signIn"
                    color="primary"
                    class="ml-auto px-0"
                    variant="flat"
                    size="large"
                    :loading="isLoading"
                    :disabled="isLoading"
                >
                    Login
                </v-btn>
            </v-container>
        </v-col>
        <v-col cols="12" lg="8" class="h-100 w-100 pa-0">
            <v-img
                :src="loginImage"
                class="d-flex align-center justify-center rounded-l-lg"
                cover
                height="100vh"
                gradient="rgba(0,0,0,0.60), rgba(0,0,0,0.60)">
                <div class="d-flex align-center justify-center" style="height:100%;">
                    <v-avatar :image="logo" size="160" class="elevation-6"></v-avatar>
                </div>
            </v-img>
        </v-col>

        <ErrorDialog
            :visible.sync="forgotDialog.visible"
            :title="forgotDialog.title"
            :message="forgotDialog.message"
            :isError="forgotDialog.isError"
            @update:visible="val => (forgotDialog.visible = val)"
        />
    </v-row>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import loginImage from '../assets/login-photo.png'
import logo from '../assets/spcf-logo.png'
import { login as authLogin, isAuthenticated } from '../services/auth'
import ErrorDialog from '@/components/ErrorDialog.vue'

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const passwordField = ref(null)
const router = useRouter()
const errMsg = ref('')
const isLoading = ref(false)
const forgotDialog = ref({
    visible: false,
    title: 'Forgot Password',
    message: 'To reset your password contact your administrator',
    isError: false,
})

onMounted(() => {
    // If already authenticated, redirect to the app
    if (isAuthenticated()) {
        console.log('Restored authenticated session')
        router.push({ name: 'home' })
    }
})

const signIn = async () => {
    errMsg.value = ''
    isLoading.value = true

    try {
        // Call the auth service (supports both real API and fallback to local data)
        const result = await authLogin(email.value, password.value)
        console.log('Logged in successfully:', result.session)

        // Navigate to dashboard
        await router.push({ name: 'home' })
    } catch (error) {
        console.error('Login error:', error)
        errMsg.value = error.message || 'Login failed. Please try again.'
    } finally {
        isLoading.value = false
    }
}

const onEnter = () => {
    if (!isLoading.value) {
        signIn()
    }
}

const togglePassword = async () => {
    // Remember the current input element and value length
    const fieldComponent = passwordField.value
    const currentInput = fieldComponent?.$el?.querySelector('input')
    const currentLength = currentInput?.value?.length ?? 0

    // Toggle visibility
    showPassword.value = !showPassword.value

    // After DOM updates, restore caret at the end of the input
    await nextTick()
    const newFieldComponent = passwordField.value
    const inputEl = newFieldComponent?.$el?.querySelector('input')
    if (inputEl) {
        const len = inputEl.value.length ?? currentLength
        inputEl.focus()
        inputEl.setSelectionRange(len, len)
    }
}

const showForgotPasswordDialog = () => {
    forgotDialog.value.visible = true
}
</script>
