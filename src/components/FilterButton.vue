<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type FilterOption = {
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
  },
  options: {
    type: Array as () => FilterOption[],
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

const selectedLabel = computed(() => {
  const selected = props.options.find((option) => option.value === props.modelValue)
  return selected?.label || props.placeholder
})

const toggleMenu = () => {
  if (props.disabled || props.options.length === 0) return
  isOpen.value = !isOpen.value
}

const closeMenu = () => {
  isOpen.value = false
}

const handleSelect = (value: string) => {
  emit('update:modelValue', value)
  emit('change', value)
  closeMenu()
}

const handleClickOutside = (event: MouseEvent) => {
  if (!rootRef.value) return
  if (!rootRef.value.contains(event.target as Node)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="rootRef" class="relative inline-block w-full max-w-xs">
    <button
      type="button"
      class="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-right text-sm font-medium text-gray-800 shadow-sm transition hover:border-gray-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      :class="isOpen ? 'border-[#008CB9] shadow-md' : ''"
      :disabled="disabled"
      @click="toggleMenu"
    >
      <span class="truncate">{{ selectedLabel }}</span>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        class="ml-3 h-4 w-4 shrink-0 transition-transform duration-200"
        :class="isOpen ? 'rotate-180' : ''"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div
      v-if="isOpen && options.length > 0"
      class="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="block w-full px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-[#EAF6FB] hover:text-[#008CB9]"
        @click="handleSelect(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
