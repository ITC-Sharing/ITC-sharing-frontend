<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

type Option = {
  label: string
  value: string
}

const props = defineProps<{
  open: boolean
  yearLevel: number
  defaultDepartmentId: string
  departments: Option[]
  submitting?: boolean
  apiError?: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (
    e: 'submit',
    payload: {
      name: string
      major_id: string
      year_level: number
      semester: number
      image: File | null
    },
  ): void
}>()

const subjectName = ref('')
const departmentId = ref('')
const academicYear = ref(String(props.yearLevel))
const semester = ref('1')
const subjectImage = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const isDragActive = ref(false)
const formError = ref('')

const departmentOptions = computed(() => props.departments)

function resetForm() {
  subjectName.value = ''
  departmentId.value = (props.defaultDepartmentId || departmentOptions.value[0]?.value) ?? ''
  academicYear.value = String(props.yearLevel)
  semester.value = '1'
  subjectImage.value = null
  formError.value = ''

  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value)
  }
  imagePreview.value = null
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetForm()
    }
  },
)

watch(
  () => [props.defaultDepartmentId, props.yearLevel, props.departments],
  () => {
    if (!props.open) {
      return
    }

    departmentId.value = (props.defaultDepartmentId || departmentOptions.value[0]?.value) ?? ''
    academicYear.value = String(props.yearLevel)
  },
  { deep: true },
)

function closeModal() {
  emit('close')
}

function setSelectedFile(file: File | null) {
  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value)
  }

  if (!file || !file.type.startsWith('image/')) {
    subjectImage.value = null
    imagePreview.value = null
    return
  }

  subjectImage.value = file
  imagePreview.value = URL.createObjectURL(file)
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  setSelectedFile(file ?? null)
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragActive.value = true
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  isDragActive.value = false
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragActive.value = false
  const file = event.dataTransfer?.files?.[0] ?? null
  setSelectedFile(file)
}

function handleSubmit() {
  formError.value = ''

  const name = subjectName.value.trim()
  if (!name) {
    formError.value = 'Please enter subject name.'
    return
  }

  if (!departmentId.value) {
    formError.value = 'Department is missing.'
    return
  }

  emit('submit', {
    name,
    major_id: departmentId.value,
    year_level: Number(academicYear.value),
    semester: Number(semester.value),
    image: subjectImage.value,
  })
}

onBeforeUnmount(() => {
  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div
        class="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 md:max-w-md"
      >
        <div class="border-b border-black/5 px-5 py-4">
          <p class="text-center text-2xl font-bold text-black">{{ t('common.subjectCreateModal.title') }}</p>
          <p class="mt-2 text-center text-sm text-gray-500">
            {{ t('common.subjectCreateModal.subtitle') }}
          </p>
        </div>

        <form
          class="max-h-[80vh] space-y-4 overflow-y-auto px-5 py-5"
          @submit.prevent="handleSubmit"
        >
          <div class="space-y-2">
            <label class="text-sm font-medium text-black"
              >{{ t('common.subjectCreateModal.nameLabel') }} <span class="text-red-500">*</span></label
            >
            <input
              v-model="subjectName"
              type="text"
              :placeholder="t('common.subjectCreateModal.nameLabel')"
              class="w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-base outline-none transition focus:border-[#0057BD]"
            />
          </div>

          <p v-if="formError" class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {{ formError }}
          </p>

          <p v-if="props.apiError" class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {{ props.apiError }}
          </p>

          <div class="space-y-2">
            <label class="text-sm font-medium text-black"
              >{{ t('common.subjectCreateModal.departmentLabel') }} <span class="text-red-500">*</span></label
            >
            <select
              v-model="departmentId"
              disabled
              class="w-full appearance-none rounded-xl border border-[#D9D9D9] bg-[#F5F5F5] px-4 py-2.5 text-base text-gray-600 outline-none"
            >
              <option disabled value="">Select department</option>
              <option
                v-for="department in departmentOptions"
                :key="department.value"
                :value="department.value"
              >
                {{ department.label }}
              </option>
            </select>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-sm font-medium text-black"
                >{{ t('common.subjectCreateModal.yearLabel') }} <span class="text-red-500">*</span></label
              >
              <select
                v-model="academicYear"
                disabled
                class="w-full appearance-none rounded-xl border border-[#D9D9D9] bg-[#F5F5F5] px-4 py-2.5 text-base text-gray-600 outline-none"
              >
                <option :value="academicYear">{{ t('common.subjectCreateModal.year') }} {{ academicYear }}</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-black"
                >{{ t('common.subjectCreateModal.semesterLabel') }} <span class="text-red-500">*</span></label
              >
              <div class="relative">
                <select
                  v-model="semester"
                  class="w-full appearance-none rounded-xl border border-[#D9D9D9] bg-white px-4 py-2.5 pr-10 text-base outline-none transition focus:border-[#0057BD]"
                >
                  <option value="1">{{ t('common.subjectCreateModal.semesterLabel') }} 1</option>
                  <option value="2">{{ t('common.subjectCreateModal.semesterLabel') }} 2</option>
                </select>
                <svg
                  class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <path d="m5 7.5 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-black">{{ t('common.subjectCreateModal.imageLabel') }}</label>
            <label
              class="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition"
              :class="
                isDragActive
                  ? 'border-[#0057BD] bg-[#F3F8FF]'
                  : 'border-[#D3D3D3] bg-[#FAFAFA] hover:border-[#0057BD] hover:bg-[#F3F8FF]'
              "
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @drop="handleDrop"
            >
              <input type="file" accept="image/*" class="hidden" @change="handleFileChange" />
              <div v-if="imagePreview" class="mb-4 flex flex-col items-center gap-3">
                <img
                  :src="imagePreview"
                  alt="Selected subject image"
                  class="h-24 w-24 rounded-2xl object-cover shadow-sm"
                />
                <p class="text-sm text-gray-500">{{ t('common.subjectCreateModal.dragAndDrop') }}</p>
              </div>

              <template v-else>
                <div
                  class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8EEF8] text-[#8A8A8A]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="h-10 w-10"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                  >
                    <path
                      d="M3 17l6-6 4 4 5-5 3 3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"
                    />
                    <circle cx="9" cy="8" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <p class="text-sm font-medium text-gray-500">{{ t('common.subjectCreateModal.dragAndDrop') }}</p>
              </template>
            </label>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              :disabled="props.submitting"
              class="rounded-xl border border-[#D0D0D0] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#F4F4F4]"
              @click="closeModal"
            >
              {{ t('common.subjectCreateModal.cancelButton') }}
            </button>
            <button
              type="submit"
              :disabled="props.submitting"
              class="rounded-xl bg-[#13A10E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10910C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ props.submitting ? t('common.subjectCreateModal.creating') : t('common.subjectCreateModal.createButton') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
