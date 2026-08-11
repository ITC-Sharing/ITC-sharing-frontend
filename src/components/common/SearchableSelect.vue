<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

// A dropdown select with a built-in search box — pick from the list or type to
// filter. Same v-model contract as FilterButton/SelectDropdown (string value).
type Option = { label: string; value: string }

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  searchPlaceholder: { type: String, default: '' },
  options: { type: Array as () => Option[], default: () => [] },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const { t } = useI18n({ useScope: 'global' })

const isOpen = ref(false)
const query = ref('')
const rootRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)

const selectedLabel = computed(
  () => props.options.find((o) => o.value === props.modelValue)?.label || props.placeholder,
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter((o) => o.label.toLowerCase().includes(q))
})

function toggleMenu() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function select(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
  close()
}

// Focus the search box and reset the query each time the menu opens.
watch(isOpen, (open) => {
  if (open) {
    query.value = ''
    void nextTick(() => searchRef.value?.focus())
  }
})

function onClickOutside(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) close()
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="rootRef" class="relative w-full">
    <button
      type="button"
      class="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-800 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer"
      :class="isOpen ? 'border-primary shadow-md' : ''"
      :disabled="disabled"
      @click="toggleMenu"
    >
      <span class="truncate" :class="selectedLabel ? '' : 'text-gray-400'">
        {{ selectedLabel }}
      </span>
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
      v-if="isOpen"
      class="absolute left-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
    >
      <!-- Search -->
      <div class="border-b border-gray-100 p-2">
        <div class="relative">
          <svg
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            ref="searchRef"
            v-model="query"
            type="text"
            :placeholder="searchPlaceholder || t('common.common.search')"
            class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            @keydown.enter.prevent="filtered[0] && select(filtered[0].value)"
          />
        </div>
      </div>

      <!-- Options -->
      <div class="max-h-60 overflow-y-auto scrollbar-hide">
        <button
          v-for="option in filtered"
          :key="option.value"
          type="button"
          class="block w-full px-4 py-2.5 text-left text-sm transition hover:bg-[#EAF6FB] hover:text-primary hover:cursor-pointer"
          :class="option.value === modelValue ? 'bg-[#EAF6FB] text-primary' : 'text-gray-700'"
          @click="select(option.value)"
        >
          {{ option.label }}
        </button>
        <p v-if="!filtered.length" class="px-4 py-3 text-sm text-gray-400">
          {{ t('common.common.noResults') }}
        </p>
      </div>
    </div>
  </div>
</template>
