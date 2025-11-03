<template>
    <v-app-bar flat class="border-b">
        <v-app-bar-title>{{ title }}</v-app-bar-title>
    </v-app-bar>
</template>

<script>
export default {
    name: 'AppBar',
    props: {
        title: {
            type: String,
            required: true,
        }
    },
};
</script>