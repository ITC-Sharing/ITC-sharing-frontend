<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useMajorsStore } from '@/stores/majors.store'
import { useSubjectsStore } from '@/stores/subjects.store'

const majors = useMajorsStore()
const subjects = useSubjectsStore()

const emit = defineEmits<{
  (e: 'change', filters: {
    major_id: string
    subject_id: string
    doc_type: string
    search: string
  }): void
}>()

const filters = reactive({
  major_id: '',
  subject_id: '',
  doc_type: '',
  search: '',
})

// When major changes, reload subjects and clear subject filter
watch(() => filters.major_id, async (majorId) => {
  filters.subject_id = ''
  if (majorId) await subjects.fetchByMajorAndYear(majorId, 0) // 0 = all years
  emit('change', { ...filters })
})

watch([() => filters.subject_id, () => filters.doc_type], () => {
  emit('change', { ...filters })
})

let searchTimer: ReturnType<typeof setTimeout>
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => emit('change', { ...filters }), 400)
}

// Initialise majors on mount
majors.fetchMajors()
</script>

<template>
  <div class="flex flex-wrap gap-3 items-center">

    <!-- Search -->
    <input
      v-model="filters.search"
      @input="onSearchInput"
      type="text"
      placeholder="Search documents..."
      class="border border-[#D9D9D9] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
    />

    <!-- Major -->
    <select
      v-model="filters.major_id"
      class="border border-[#D9D9D9] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">All Majors</option>
      <option v-for="m in majors.majors" :key="m.id" :value="m.id">
        {{ m.acronym }}
      </option>
    </select>

    <!-- Subject (only shown when a major is selected) -->
    <select
      v-if="filters.major_id"
      v-model="filters.subject_id"
      class="border border-[#D9D9D9] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">All Subjects</option>
      <option v-for="s in subjects.subjects" :key="s.id" :value="s.id">
        {{ s.name }}
      </option>
    </select>

    <!-- Type -->
    <select
      v-model="filters.doc_type"
      @change="emit('change', { ...filters })"
      class="border border-[#D9D9D9] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">All Types</option>
      <option value="notes">Notes</option>
      <option value="assignment">Assignment</option>
      <option value="past_exam">Past Exam</option>
      <option value="lab">Lab</option>
    </select>

  </div>
</template>
