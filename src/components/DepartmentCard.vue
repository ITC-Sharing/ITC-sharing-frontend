<template>
    <RouterLink :to="`/${depName.toLowerCase()}`" class="w-65 h-auto bg-white border-2 border-[#D9D9D9] rounded-md p-2 flex flex-col items-center justify-between hover:shadow-md hover:border-[#008CB9] cursor-pointer">
        <img :src="depImg" :alt="depName" class="w-55 h-55 rounded-md">
        <h1 class="text-xl font-bold">{{ depName }}</h1>
    </RouterLink>
</template>
<script setup lang="ts">
    defineProps({
        depName: {
            type: String,
            default: "Department"
        },
        depImg: {
            type: String,
            default: "/src/assets/images/non-photo.jpg"
        }
    })
</script>