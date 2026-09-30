<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UploadFile } from '@/types/documents.types'
import PdfViewer from '@/components/documents/PdfViewer.vue'
import * as documentsApi from '@/services/documents.api'

// Fullscreen in-app viewer for a single file. Handles three kinds inline:
//  - images        → <img> with zoom, pan and rotate
//  - pdf           → PdfViewer (pdf.js) — our own canvas renderer, so the file
//                    gets a page-thumbnail rail instead of the browser's toolbar
//  - office docs   → <object> of the server-generated PDF rendition
//                    (file.preview_url), created on upload by LibreOffice. This
//                    renders client-side, so it works everywhere — localhost
//                    included. If a rendition is missing (older row, or
//                    conversion was unavailable) we fall back to the Microsoft
//                    Office Online viewer, which needs a public, internet-
//                    reachable URL (prod only, not localhost MinIO).
// Anything else isn't previewable; the parent downloads it instead.
const props = defineProps<{
  modelValue: boolean
  file: UploadFile | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  download: [file: UploadFile]
}>()

const { t } = useI18n({ useScope: 'global' })

/**
 * A URL minted when this modal opens, not when the list was fetched.
 *
 * The URLs on the row are presigned with a short TTL — five minutes by default
 * — and signed once, when the page loaded. Anything opened after that window
 * gets `403 Request has expired`, which renders as a blank viewer with nothing
 * in the console to explain it. A page left open on a second screen fails
 * every time.
 *
 * So the modal asks the API for a fresh one. That also re-authorises: the
 * endpoint checks the viewer against the upload's audience, status and hidden
 * state before it signs anything, so a link cannot outlive the permission that
 * produced it.
 */
const freshUrl = ref('')
const loadingUrl = ref(false)
const urlError = ref(false)

watch(
  () => [props.modelValue, props.file?.id] as const,
  async ([open, id]) => {
    freshUrl.value = ''
    urlError.value = false
    if (!open || !id) return

    loadingUrl.value = true
    try {
      const { url } = await documentsApi.fileAccessUrl(id, 'preview')
      freshUrl.value = url
    } catch {
      // Falls back to the list's URL below, which may still be valid if the
      // page was loaded moments ago.
      urlError.value = true
    } finally {
      loadingUrl.value = false
    }
  },
  { immediate: true },
)

function ext(name: string | null | undefined): string {
  return (name ?? '').split('.').pop()?.toLowerCase() ?? ''
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
const OFFICE_EXTS = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx']

const kind = computed<'image' | 'pdf' | 'office' | 'none'>(() => {
  const e = ext(props.file?.original_name)
  if (IMAGE_EXTS.includes(e)) return 'image'
  if (e === 'pdf') return 'pdf'
  if (OFFICE_EXTS.includes(e)) return 'office'
  return 'none'
})

// Prefer the server-generated PDF rendition (renders anywhere); only fall back
// to the Office Online viewer when there's no rendition.
const officeSrc = computed(() => {
  if (!props.file) return ''
  if (props.file.preview_url) return props.file.preview_url
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(props.file.file_url)}`
})

// Hides the built-in PDF chrome (filename, page box, zoom, download, print) —
// the modal's own top bar already offers those. Chromium honours these; other
// engines ignore them harmlessly.
function withoutPdfToolbar(url: string) {
  return `${url}#toolbar=0&navpanes=0&statusbar=0`
}

/** What the embedded viewer loads: a PDF gets the chrome stripped. */
const embedSrc = computed(() => {
  if (!props.file) return ''
  // The freshly signed URL wherever we have one. The list's URL is the
  // fallback for the moments before it arrives, and for the office path with
  // no rendition, which goes to Office Online instead.
  if (kind.value === 'pdf') {
    return withoutPdfToolbar(freshUrl.value || props.file.file_url)
  }
  if (freshUrl.value) return withoutPdfToolbar(freshUrl.value)
  return props.file.preview_url ? withoutPdfToolbar(props.file.preview_url) : officeSrc.value
})

/** What a "open in a new tab" link should point at for the current file. */
const externalSrc = computed(() =>
  kind.value === 'office' ? officeSrc.value : freshUrl.value || (props.file?.file_url ?? ''),
)

const title = computed(() => props.file?.original_name?.trim() || 'Preview')

// ── Image viewport ─────────────────────────────────────────────────────────
// Zoom is applied as a CSS transform on the <img>: no re-decode, and panning is
// just a translation. The PDF kinds keep the browser's own viewer controls.
const MIN_ZOOM = 0.25
const MAX_ZOOM = 6
const zoom = ref(1)
const rotation = ref(0)
const offset = ref({ x: 0, y: 0 })
const isPanning = ref(false)
let panStart = { x: 0, y: 0, offsetX: 0, offsetY: 0 }

const imageStyle = computed(() => ({
  transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${zoom.value}) rotate(${rotation.value}deg)`,
  cursor: zoom.value > 1 ? (isPanning.value ? 'grabbing' : 'grab') : 'zoom-in',
}))

function resetView() {
  zoom.value = 1
  rotation.value = 0
  offset.value = { x: 0, y: 0 }
}

function setZoom(next: number) {
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(next.toFixed(2))))
  // Back at fit, recentre — otherwise the image can sit off-screen.
  if (zoom.value === 1) offset.value = { x: 0, y: 0 }
}

function zoomBy(factor: number) {
  setZoom(zoom.value * factor)
}

function rotate() {
  rotation.value = (rotation.value + 90) % 360
}

function onWheel(event: WheelEvent) {
  if (kind.value !== 'image') return
  event.preventDefault()
  zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15)
}

function onDoubleClick() {
  if (zoom.value > 1) resetView()
  else setZoom(2)
}

function startPan(event: MouseEvent) {
  if (zoom.value <= 1) return
  isPanning.value = true
  panStart = {
    x: event.clientX,
    y: event.clientY,
    offsetX: offset.value.x,
    offsetY: offset.value.y,
  }
}

function onPan(event: MouseEvent) {
  if (!isPanning.value) return
  offset.value = {
    x: panStart.offsetX + (event.clientX - panStart.x),
    y: panStart.offsetY + (event.clientY - panStart.y),
  }
}

function endPan() {
  isPanning.value = false
}

function close() {
  emit('update:modelValue', false)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    close()
    return
  }
  if (kind.value !== 'image') return
  if (e.key === '+' || e.key === '=') zoomBy(1.2)
  else if (e.key === '-') zoomBy(1 / 1.2)
  else if (e.key === '0') resetView()
  else if (e.key.toLowerCase() === 'r') rotate()
}

// A fresh file (or a fresh open) starts at fit, not at the last zoom.
watch(() => props.file, resetView)
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetView()
      window.addEventListener('keydown', handleKeydown)
    } else {
      window.removeEventListener('keydown', handleKeydown)
    }
  },
)

onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue && file"
      class="fixed inset-0 z-60 flex flex-col bg-black/90"
      @click.self="close"
      @mousemove="onPan"
      @mouseup="endPan"
      @mouseleave="endPan"
    >
      <!-- Top bar. The controls keep their size and the filename takes what
           is left: min-w-0 lets the span shrink below its text, which a flex
           item will not do on its own, so on a phone the name truncates
           instead of pushing Open and Download off the edge. -->
      <div class="flex items-center gap-2 px-3 py-3 text-white sm:gap-3 sm:px-4">
        <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ title }}</span>

        <!-- Image controls -->
        <div v-if="kind === 'image'" class="ml-auto flex items-center gap-1">
          <button
            class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 hover:cursor-pointer disabled:opacity-40"
            :disabled="zoom <= 0.25"
            aria-label="Zoom out"
            @click="zoomBy(1 / 1.2)"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
            </svg>
          </button>
          <button
            class="min-w-14 rounded-full bg-white/10 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-white/20 hover:cursor-pointer"
            :aria-label="`Zoom ${Math.round(zoom * 100)}%, click to reset`"
            @click="resetView"
          >
            {{ Math.round(zoom * 100) }}%
          </button>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 hover:cursor-pointer disabled:opacity-40"
            :disabled="zoom >= 6"
            aria-label="Zoom in"
            @click="zoomBy(1.2)"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 hover:cursor-pointer"
            aria-label="Rotate"
            @click="rotate"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M20 20v-5h-5M20 15a8 8 0 10-2.3 4.6"
              />
            </svg>
          </button>
        </div>

        <div class="flex items-center gap-2" :class="kind === 'image' ? '' : 'ml-auto'">
          <!-- The browser's own viewer is the best fallback when an embedded
               one can't render (iOS Safari won't show PDFs inline). -->
          <a
            :href="externalSrc"
            target="_blank"
            rel="noopener"
            class="flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-white/10 text-sm transition-colors hover:bg-white/20 max-sm:w-9 sm:px-3"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M14 3h7v7m0-7L10 14M19 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h5"
              />
            </svg>
            <span class="max-sm:sr-only">
              {{ t('document.documentDetailsPage.preview') }}
            </span>
          </a>
          <button
            class="flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-white/10 text-sm transition-colors hover:bg-white/20 hover:cursor-pointer max-sm:w-9 sm:px-3"
            @click="emit('download', file)"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
              />
            </svg>
            <span class="max-sm:sr-only">
              {{ t('document.documentDetailsPage.download') }}
            </span>
          </button>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 hover:cursor-pointer"
            aria-label="Close"
            @click="close"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div
        class="flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-4"
        @wheel="onWheel"
      >
        <img
          v-if="kind === 'image'"
          :src="file.file_url"
          :alt="title"
          draggable="false"
          class="max-h-full max-w-full select-none object-contain transition-transform duration-100"
          :style="imageStyle"
          @click.stop
          @dblclick="onDoubleClick"
          @mousedown.prevent="startPan"
        />

        <!-- <object>, not <iframe>: when a browser can't display the PDF it
             renders the children instead, so the fallback shows itself. -->
        <PdfViewer v-else-if="(kind === 'pdf' || kind === 'office') && embedSrc" :src="embedSrc" />

        <object
          v-else-if="kind === 'pdf' || kind === 'office'"
          :data="embedSrc"
          type="application/pdf"
          class="h-full w-full rounded-lg bg-white"
          @click.stop
        >
          <div
            class="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center"
          >
            <p class="text-sm text-gray-600">{{ title }}</p>
            <a
              :href="externalSrc"
              target="_blank"
              rel="noopener"
              class="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {{ t('document.documentDetailsPage.preview') }}
            </a>
          </div>
        </object>
      </div>

      <!-- Hint, images only -->
      <p v-if="kind === 'image'" class="pb-3 text-center text-xs text-white/50">
        {{ t('document.documentDetailsPage.viewerHint') }}
      </p>
    </div>
  </Teleport>
</template>
