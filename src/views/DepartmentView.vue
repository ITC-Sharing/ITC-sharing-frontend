<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import YearCard from '@/components/YearCard.vue'
import SubjectCard from '@/components/SubjectCard.vue'
import AddnewSubject from '@/components/AddnewSubject.vue'
import DocumentCard from '@/components/DocumentCard.vue'

const props = defineProps<{
  slug: string
}>()

const { t } = useI18n({ useScope: 'global' })

const departments = [
  {
    name: 'GIC',
    slug: 'gic',
    img: '/src/assets/images/department/gic2.png',
    fname: 'Department of Information and Communication Engineering',
  },
  {
    name: 'AMS',
    slug: 'ams',
    img: '/src/assets/images/department/ams-removebg.png',
    fname: 'Department of Applied Mathematics and Statistics',
  },
  {
    name: 'GIM',
    slug: 'gim',
    img: '/src/assets/images/department/gim-removebg.png',
    fname: 'Department of Industrial and Mechanical Engineering',
  },
  {
    name: 'GTR',
    slug: 'gtr',
    img: '/src/assets/images/department/gtr-removebg.png',
    fname: 'Department of Telecommunication and Network Engineering',
  },
  {
    name: 'GCA',
    slug: 'gca',
    img: '/src/assets/images/department/gca-removebg.png',
    fname: 'department of computer applications',
  },
  {
    name: 'GAR',
    slug: 'gar',
    img: '/src/assets/images/department/gar-removebg.png',
    fname: 'department of architecture',
  },
  {
    name: 'GRU',
    slug: 'gru',
    img: '/src/assets/images/department/gru.png',
    fname: 'department of rural development',
  },
  {
    name: 'GTI',
    slug: 'gti',
    img: '/src/assets/images/department/gti-removebg.png',
    fname: 'department of information technology',
  },
  {
    name: 'GEE',
    slug: 'gee',
    img: '/src/assets/images/department/gee-removebg.png',
    fname: 'department of electrical engineering',
  },
  {
    name: 'Foundation Year',
    slug: 'foundation-year',
    img: '/src/assets/images/department/itc-removebg.png',
    fname: 'foundation year',
  },
]

const selectedDepartment = computed(() => {
  return departments.find((department) => department.slug === props.slug)
})

const years = [
  {
    id: 1,
    title: 'common.departmentPage.year3',
    subtitle: 'common.departmentPage.subject',
    img: '/src/assets/images/year/year3.jpg',
  },
  {
    id: 2,
    title: 'common.departmentPage.year4',
    subtitle: 'common.departmentPage.subject',
    img: '/src/assets/images/year/year4.jpg',
  },
  {
    id: 3,
    title: 'common.departmentPage.year5',
    subtitle: 'common.departmentPage.subject',
    img: '/src/assets/images/year/year5.jpg',
  },
]
</script>
<template>
  <div class="mb-6 flex flex-col items-center justify-center gap-4">
    <div
      v-if="selectedDepartment"
      class="flex h-50 w-50 items-center justify-center overflow-hidden rounded-md"
    >
      <img
        :src="selectedDepartment.img"
        :alt="selectedDepartment.name"
        class="h-full w-full object-contain"
      />
    </div>
    <div class="ml-4">
      <h1 class="text-xl font-semibold text-black">
        {{ selectedDepartment ? selectedDepartment.fname : 'Department Not Found' }}
      </h1>
    </div>
  </div>
  <div class="mx-auto flex w-full max-w-6xl flex-col items-center justify-center px-4 gap-6">
    <div class="flex w-full items-start justify-start">
      <h1 class="w-full text-xl text-black">
        {{ t('common.departmentPage.chooseYear') }}
      </h1>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <YearCard
        v-for="year in years"
        :key="year.id"
        :title="t(year.title)"
        :subtitle="t(year.subtitle)"
        :img="year.img"
      />
    </div>
    <SubjectCard />
    <AddnewSubject />
    <DocumentCard />
  </div>
</template>
