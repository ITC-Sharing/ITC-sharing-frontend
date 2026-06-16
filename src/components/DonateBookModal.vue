<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useBooksStore } from '@/stores/books.store'
import { useMajorsStore } from '@/stores/majors.store'
import SelectDropdown from '@/components/SelectDropdown.vue'
import { computed } from 'vue'

const auth = useAuthStore()
const books = useBooksStore()
const majors = useMajorsStore()

const emit = defineEmits<{ (e: 'close'): void; (e: 'donated'): void }>()

majors.fetchMajors()

const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(null)
const uploading = ref(false)

const form = reactive({
  title: '',
  department: auth.user?.majors?.id ?? '',
  description: '',
  contact: '',
})

const errors = reactive({
  title: '',
  department: '',
  contact: '',
  cover: '',
})

const majorOptions = computed(() =>
  majors.majors.map((m) => ({ value: m.id, label: m.acronym })),
)

function onCoverChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
}

function removeCover() {
  coverFile.value = null
  coverPreview.value = null
}

function validate() {
  errors.title = form.title.trim() ? '' : 'Title is required'
  errors.department = form.department ? '' : 'Please select a department'
  errors.contact = form.contact.trim() ? '' : 'Contact is required'
  errors.cover = coverFile.value ? '' : 'Cover image is required'
  return !errors.title && !errors.department && !errors.contact && !errors.cover
}

async function submit() {
  if (!validate()) return
  uploading.value = true
  try {
    let cover_image_url: string | undefined
    if (coverFile.value) {
      cover_image_url = await books.uploadCover(coverFile.value)
    }
    await books.donate({
      title: form.title.trim(),
      department: form.department,
      description: form.description.trim() || undefined,
      contact: form.contact.trim(),
      cover_image_url,
    })
    emit('donated')
    emit('close')
  } catch {
    // books.error is set by store
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div class="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 md:max-w-md">
      <!-- Header -->
      <div class="border-b border-black/5 px-5 py-4">
        <p class="text-center text-xl font-bold text-black">Donate a Book</p>
      </div>

      <!-- Body -->
      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <!-- Server error -->
        <p v-if="books.error" class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {{ books.error }}
        </p>

        <!-- Cover image -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-black">Cover Image <span class="text-red-500">*</span></label>
          <div v-if="coverPreview" class="relative w-fit">
            <img :src="coverPreview" class="h-32 w-24 rounded-xl object-cover shadow" />
            <button
              type="button"
              @click="removeCover"
              class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
            >✕</button>
          </div>
          <label
            v-else
            class="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D3D3D3] bg-[#FAFAFA] text-sm text-gray-400 transition hover:border-[#008CB9] hover:bg-[#F3FBFF]"
          >
            <input type="file" class="hidden" accept="image/jpeg,image/png,image/webp" @change="onCoverChange" />
            <svg class="mb-1 h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4-4a3 3 0 014 0l4 4m-4-4v9M12 3v4" />
            </svg>
            Click to upload (JPG, PNG, WebP)
          </label>
          <p v-if="errors.cover" class="text-xs text-red-500">{{ errors.cover }}</p>
        </div>

        <!-- Title -->
        <div class="space-y-1">
          <label class="text-sm font-medium text-black">Title <span class="text-red-500">*</span></label>
          <input
            v-model="form.title"
            type="text"
            placeholder="e.g. Introduction to Algorithms"
            class="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm outline-none transition focus:border-[#008CB9]"
            :class="errors.title ? 'border-red-400' : ''"
          />
          <p v-if="errors.title" class="text-xs text-red-500">{{ errors.title }}</p>
        </div>

        <!-- Department -->
        <div class="space-y-1">
          <label class="text-sm font-medium text-black">Department <span class="text-red-500">*</span></label>
          <SelectDropdown
            v-model="form.department"
            placeholder="Select department"
            :options="majorOptions"
          />
          <p v-if="errors.department" class="text-xs text-red-500">{{ errors.department }}</p>
        </div>

        <!-- Description -->
        <div class="space-y-1">
          <label class="text-sm font-medium text-black">Description <span class="font-normal text-gray-400">(optional)</span></label>

          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Condition, edition, notes…"
            class="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm outline-none transition focus:border-[#008CB9] resize-none"
          />
        </div>

        <!-- Contact -->
        <div class="space-y-1">
          <label class="text-sm font-medium text-black">Contact <span class="text-red-500">*</span></label>
          <input
            v-model="form.contact"
            type="text"
            placeholder="e.g. Telegram: @username"
            class="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm outline-none transition focus:border-[#008CB9]"
          />
          <p v-if="errors.contact" class="text-xs text-red-500">{{ errors.contact }}</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            :disabled="uploading"
            @click="emit('close')"
            class="rounded-xl border border-[#D0D0D0] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#F4F4F4] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="uploading"
            @click="submit"
            class="rounded-xl bg-[#008CB9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#006B9C] disabled:opacity-60"
          >
            <span v-if="uploading" class="flex items-center gap-2">
              <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Submitting…
            </span>
            <span v-else>Donate Book</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
