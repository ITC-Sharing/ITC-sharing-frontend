<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type SelectOption = {
  label: string
  value: string
}

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  options: {
    type: Array as () => SelectOption[],
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'change', value: string): void
}>()

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(
  () => props.options.find((option) => option.value === props.modelValue)?.label,
)

function toggleMenu() {
  if (props.disabled || props.options.length === 0) return
  isOpen.value = !isOpen.value
}

function handleSelect(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
  isOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) isOpen.value = false
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="rootRef" class="relative w-full">
    <button
      type="button"
      :disabled="disabled"
      class="flex w-full items-center justify-between rounded-xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-left text-sm outline-none transition focus:border-[#008CB9] disabled:cursor-not-allowed disabled:bg-[#F5F5F5] disabled:opacity-70"
      :class="isOpen ? 'border-[#008CB9]' : ''"
      @click="toggleMenu"
    >
      <span class="truncate" :class="selectedLabel ? 'text-black' : 'text-gray-400'">
        {{ selectedLabel || placeholder }}
      </span>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        class="ml-3 h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200"
        :class="isOpen ? 'rotate-180' : ''"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div
      v-if="isOpen && options.length > 0"
      class="absolute left-0 z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-lg"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="block w-full px-4 py-2.5 text-left text-sm transition hover:bg-[#EAF6FB] hover:text-[#008CB9]"
        :class="option.value === modelValue ? 'bg-[#EAF6FB] text-[#008CB9]' : 'text-gray-700'"
        @click="handleSelect(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
