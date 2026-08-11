<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

// Multi-select dropdown: v-model is a string[] of chosen values. An option with
// value '' is a select-all/reset row ("Select all" / "Everyone") — checked when
// every real option is selected, and toggling it selects/clears all.
type SelectOption = { label: string; value: string }

const props = defineProps({
  modelValue: { type: Array as () => string[], default: () => [] },
  placeholder: { type: String, default: '' },
  options: { type: Array as () => SelectOption[], default: () => [] },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits<{ (event: 'update:modelValue', value: string[]): void }>()

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)

// Real option values (excluding the '' select-all row).
const realValues = computed(() => props.options.filter((o) => o.value !== '').map((o) => o.value))

const allSelected = computed(
  () => realValues.value.length > 0 && realValues.value.every((v) => props.modelValue.includes(v)),
)

// Selected options in list order (excluding the '' select-all row), for the
// chips shown in the trigger.
const selectedOptions = computed(() =>
  props.options.filter((o) => o.value !== '' && props.modelValue.includes(o.value)),
)

function toggleMenu() {
  if (props.disabled || props.options.length === 0) return
  isOpen.value = !isOpen.value
}

function isSelected(value: string) {
  if (value === '') return allSelected.value
  return props.modelValue.includes(value)
}

function toggleOption(value: string) {
  if (value === '') {
    emit('update:modelValue', allSelected.value ? [] : [...realValues.value])
    return
  }
  const next = props.modelValue.includes(value)
    ? props.modelValue.filter((v) => v !== value)
    : [...props.modelValue, value]
  emit('update:modelValue', next)
}

// Remove every selection.
function clearAll() {
  emit('update:modelValue', [])
}

function handleClickOutside(event: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) isOpen.value = false
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="rootRef" class="relative w-full">
    <!-- Trigger -->
    <div
      role="button"
      tabindex="0"
      class="flex w-full items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition"
      :class="[
        isOpen ? 'border-primary' : 'border-[#D9D9D9] hover:border-gray-300',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ]"
      @click="toggleMenu"
      @keydown.enter.prevent="toggleMenu"
      @keydown.space.prevent="toggleMenu"
    >
      <!-- Placeholder, or selected items as removable chips (scroll sideways) -->
      <span v-if="!selectedOptions.length" class="flex-1 truncate text-gray-400">
        {{ placeholder }}
      </span>
      <div v-else class="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-hide">
        <span
          v-for="option in selectedOptions"
          :key="option.value"
          class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-primary/10 px-2 py-1 text-xs text-primary"
        >
          {{ option.label }}
          <span
            class="flex h-4 w-4 items-center justify-center rounded text-primary"
            :aria-label="`Remove ${option.label}`"
            @click.stop="toggleOption(option.value)"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </span>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-1">
        <!-- Clear all selections -->
        <button
          v-if="selectedOptions.length"
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition hover:bg-primary/10 hover:text-primary hover:cursor-pointer"
          aria-label="Clear all"
          @click.stop="clearAll"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <svg
          class="h-4 w-4 text-gray-500 transition-transform duration-200"
          :class="isOpen ? 'rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>

    <!-- Menu -->
    <div
      v-if="isOpen && options.length > 0"
      class="absolute left-0 z-20 mt-2 max-h-72 w-full overflow-y-auto scrollbar-hide rounded-2xl border border-gray-200 bg-white py-1 shadow-lg"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:cursor-pointer"
        :class="option.value === '' ? 'border-b border-gray-100' : ''"
        @click="toggleOption(option.value)"
      >
        <!-- Circular check indicator -->
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition"
          :class="
            isSelected(option.value)
              ? 'border-primary bg-primary text-white'
              : 'border-gray-300 text-transparent'
          "
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
