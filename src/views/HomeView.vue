<template>
    <div class="flex items-center justify-center">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <DepartmentCard
            v-for="dep in departments"
            :key="dep.id"
            :depName="dep.name"
            :depImg="dep.img"
        />
    </div>
    </div>
    
    
</template>
<script setup lang="ts">
    import DepartmentCard from '@/components/DepartmentCard.vue';
    const departments = [
        {
            id: 1,
            name: "GIC",
            img: "/src/assets/images/gic.jpg"
        },
        {
            id: 2,
            name: "AMS",
            img: "/src/assets/images/ams.jpg"
        },
        {
            id: 3,
            name: "GIM",
            img: "/src/assets/images/gim.jpg"
        },
        {
            id: 4,
            name: "GTR",
            img: "/src/assets/images/gtr.jpg"
        },
    ]
</script>