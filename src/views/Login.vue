<template>
    <v-row class="fill-height ma-0">
        <v-col cols="12" lg="4" class="w-100 d-flex flex-column align-center justify-center px-16">
            <v-container fluid class="d-flex justify-start w-100 mb-10">
                <p class="text-h5 font-weight-bold px-0 mb-2 text-blue-darken-4">SPCF LMS</p>
            </v-container>

            <v-container fluid class="d-flex flex-column justify-start w-100 mb-2 mt-16">
                <p class="text-h4 text-title text-grey-darken-4">Login to your account</p>
                <p class="text-subtitle mt-3 text-grey-darken-1">Enter your email and password to login</p>
            </v-container>

            <v-container class="mt-2">
                <v-text-field v-model="email" label="Email" variant="outlined"></v-text-field>
                <v-text-field v-model="password" label="Password" type="password" variant="outlined"></v-text-field>
                <p v-show="errMsg" class="text-red">{{ errMsg }}</p>
                <v-btn block @click="signIn" color="primary" class="ml-auto px-0" variant="flat"
                    size="large">Login</v-btn>
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
    </v-row>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import loginImage from '../assets/login-photo.png'
import logo from '../assets/spcf-logo.png'
import credentials from '../data/credentials.test.json'

const email = ref('')
const password = ref('')
const router = useRouter()
const errMsg = ref('')

const SESSION_KEY = 'app_session'

onMounted(() => {
    // If a session exists in localStorage, redirect to the app
    try {
        const s = localStorage.getItem(SESSION_KEY)
        if (s) {
            const session = JSON.parse(s)
            if (session && session.email) {
                console.log('Restored session for', session.email)
                router.push({ name: 'home' })
            }
        }
    } catch (e) {
        // ignore
    }
})

const signIn = () => {
    errMsg.value = ''
    const user = credentials.find(u => u.email.toLowerCase() === (email.value || '').toLowerCase())
    if (!user) {
        errMsg.value = 'No account with that email was found'
        return
    }
    if (user.password !== password.value) {
        errMsg.value = 'Incorrect password'
        return
    }

    // create a simple session object (do NOT use this in production)
    const session = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: new Date().toISOString(),
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    console.log('Logged in (fake):', session)
    try {
        // Notify other components/tabs that session changed (Navigation listens for this)
        window.dispatchEvent(new Event('storage'))
    } catch (e) {
        // ignore
    }
    router.push({ name: 'home' })
}
</script>
