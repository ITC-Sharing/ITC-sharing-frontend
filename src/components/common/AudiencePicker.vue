<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Picks who may see an upload, one answer at a time: the menu opens on the
 * departments, and choosing one drills into that department's years. Picking a
 * year emits the pair; picking "Everyone" emits that instead and skips the year
 * step, because it isn't a restriction at all.
 *
 * It emits rather than v-models: each choice is added to a list the caller owns,
 * so the control resets itself and never holds a value.
 */
export type AudienceDepartment = {
  id: string
  acronym: string
  years: { value: number; label: string }[]
}

const props = withDefaults(
  defineProps<{
    departments: AudienceDepartment[]
    placeholder?: string
    everyoneLabel?: string
    /** Adds every year of the drilled-in department in one go. */
    allYearsLabel?: string
    /** Header shown while drilled into a department. */
    backLabel?: string
    disabled?: boolean
  }>(),
  {
    placeholder: '',
    everyoneLabel: 'Everyone',
    allYearsLabel: 'All years',
    backLabel: 'Back',
    disabled: false,
  },
)

const emit = defineEmits<{
  (event: 'select', value: { everyone: true } | { major_id: string; year_level: number }): void
}>()

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
// Which department's years are showing; null = the department list.
const drilledId = ref<string | null>(null)

const drilled = computed(() =>
  props.departments.find((department) => department.id === drilledId.value),
)

function toggleMenu() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (!isOpen.value) drilledId.value = null
}

function close() {
  isOpen.value = false
  drilledId.value = null
}

function chooseEveryone() {
  emit('select', { everyone: true })
  close()
}

function chooseYear(year: number) {
  if (!drilled.value) return
  emit('select', { major_id: drilled.value.id, year_level: year })
  close()
}

// "All years" is just every year of this department, emitted one by one — the
// caller de-dupes, so it also tops up a department that was partly picked.
function chooseAllYears() {
  if (!drilled.value) return
  for (const year of drilled.value.years) {
    emit('select', { major_id: drilled.value.id, year_level: year.value })
  }
  close()
}

// Bound to mousedown, not click: drilling into a department replaces the button
// that was clicked, and Vue re-renders between the button's click handler and a
// document-level one — so by then the target is detached, `contains()` says
// "outside", and the menu would slam shut on every drill. mousedown fires
// before any of that.
function handleClickOutside(event: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div ref="rootRef" class="relative w-full">
    <button
      type="button"
      :disabled="disabled"
      class="flex w-full items-center justify-between rounded-xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-left text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-[#F5F5F5] disabled:opacity-70 hover:cursor-pointer"
      :class="isOpen ? 'border-primary' : ''"
      @click="toggleMenu"
    >
      <span class="truncate text-gray-400">{{ placeholder }}</span>
      <svg
        class="ml-2 h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200"
        :class="isOpen ? 'rotate-180' : ''"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="absolute left-0 z-20 mt-2 max-h-72 w-full overflow-y-auto scrollbar-hide rounded-2xl border border-gray-200 bg-white py-1 shadow-lg"
    >
      <!-- Level 1: Everyone, then the departments -->
      <template v-if="!drilled">
        <button
          type="button"
          class="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-primary/10 hover:text-primary hover:cursor-pointer"
          @click="chooseEveryone"
        >
          {{ everyoneLabel }}
        </button>
        <button
          v-for="department in departments"
          :key="department.id"
          type="button"
          class="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-primary/10 hover:text-primary hover:cursor-pointer"
          @click="drilledId = department.id"
        >
          {{ department.acronym }}
          <svg
            class="h-4 w-4 shrink-0 text-gray-400"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </template>

      <!-- Level 2: that department's years -->
      <template v-else>
        <button
          type="button"
          class="flex w-full items-center gap-2 border-b border-gray-100 px-4 py-2.5 text-left text-sm font-semibold text-gray-700 transition hover:bg-primary/10 hover:text-primary hover:cursor-pointer"
          @click="drilledId = null"
        >
          <svg
            class="h-4 w-4 shrink-0 text-gray-400"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m15 6-6 6 6 6" />
          </svg>
          {{ drilled.acronym }}
        </button>
        <button
          type="button"
          class="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-primary/10 hover:text-primary hover:cursor-pointer"
          @click="chooseAllYears"
        >
          {{ allYearsLabel }}
        </button>
        <button
          v-for="year in drilled.years"
          :key="year.value"
          type="button"
          class="flex w-full items-center px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-primary/10 hover:text-primary hover:cursor-pointer"
          @click="chooseYear(year.value)"
        >
          {{ year.label }}
        </button>
      </template>
    </div>
  </div>
</template>
