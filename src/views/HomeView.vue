<template>
  <div class="flex items-center justify-center">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <DepartmentCard
        v-for="dep in departments"
        :key="dep.id"
        :depName="dep.name"
        :depImg="dep.img"
        :depSlug="dep.slug"
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
        img: "/src/assets/images/department/gic.jpg",
        slug: "gic"
    },
    {
        id: 2,
        name: "AMS",
        img: "/src/assets/images/department/ams.jpg",
        slug: "ams"
    },
    {
        id: 3,
        name: "GIM",
        img: "/src/assets/images/department/gim.jpg",
        slug: "gim"
    },
    {
        id: 4,
        name: "GTR",
        img: "/src/assets/images/department/gtr.jpg",
        slug: "gtr"
    },
    {
        id: 5,
        name: "GCA",
        img: "/src/assets/images/department/gca.png",
        slug: "gca"
    },
    {
        id: 6,
        name: "GAR",
        img: "/src/assets/images/department/gar.jpg",
        slug: "gar"
    },
    {
        id: 7,
        name: "GRU",
        img: "/src/assets/images/department/gru.png",
        slug: "gru"
    },
    {
        id: 8,
        name: "GTI",
        img: "/src/assets/images/department/gti.png",
        slug: "gti"

    },
    {
        id: 9,
        name: "GEE",
        img: "/src/assets/images/department/gee.jpeg",
        slug: "gee"
    },
    {
        id: 10,
        name: "Foundation Year",
        img: "/src/assets/images/department/itc.png",
        slug: "foundation-year"
    }
]
</script>
