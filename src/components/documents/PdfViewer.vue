<script setup lang="ts">
import { ref, shallowRef, watch, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

/**
 * PDF reader with a page-thumbnail rail, rendered with pdf.js rather than the
 * browser's built-in viewer (which brings its own toolbar and gives no way to
 * show thumbnails).
 *
 * Pages render lazily: a canvas is only painted once it scrolls near the
 * viewport, so a 200-page file costs the same to open as a 2-page one.
 */
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const props = defineProps<{ src: string }>()
const { t } = useI18n({ useScope: 'global' })

const doc = shallowRef<PDFDocumentProxy | null>(null)
let loadingTask: PDFDocumentLoadingTask | null = null
const pages = ref<{ num: number; width: number; height: number }[]>([])
const loading = ref(true)
const failed = ref(false)
const currentPage = ref(1)
const scale = ref(1)

const scroller = ref<HTMLElement | null>(null)
const pageEls = new Map<number, HTMLElement>()
const pageCanvases = new Map<number, HTMLCanvasElement>()
const thumbCanvases = new Map<number, HTMLCanvasElement>()
const paintedAt = new Map<number, number>()
const paintedThumbs = new Set<number>()
const tasks = new Map<number, RenderTask>()

const dpr = Math.min(window.devicePixelRatio || 1, 2)
const THUMB_WIDTH = 108
const BASE_WIDTH = 820

let pageObserver: IntersectionObserver | null = null
let thumbObserver: IntersectionObserver | null = null

function setPageEl(num: number, el: Element | null) {
  if (el) {
    pageEls.set(num, el as HTMLElement)
    pageObserver?.observe(el)
  }
}

function setPageCanvas(num: number, el: Element | null) {
  if (el) pageCanvases.set(num, el as HTMLCanvasElement)
}

function setThumbCanvas(num: number, el: Element | null) {
  if (el) {
    thumbCanvases.set(num, el as HTMLCanvasElement)
    thumbObserver?.observe(el)
  }
}

async function paintPage(num: number) {
  const pdf = doc.value
  const canvas = pageCanvases.get(num)
  if (!pdf || !canvas || paintedAt.get(num) === scale.value) return

  tasks.get(num)?.cancel()
  const page = await pdf.getPage(num)
  const viewport = page.getViewport({ scale: scale.value * dpr })
  canvas.width = viewport.width
  canvas.height = viewport.height
  canvas.style.width = `${viewport.width / dpr}px`
  canvas.style.height = `${viewport.height / dpr}px`

  const context = canvas.getContext('2d')
  if (!context) return
  const task = page.render({ canvas, canvasContext: context, viewport })
  tasks.set(num, task)
  try {
    await task.promise
    paintedAt.set(num, scale.value)
  } catch {
    /* superseded by a newer render — the latest one wins */
  }
}

async function paintThumb(num: number) {
  const pdf = doc.value
  const canvas = thumbCanvases.get(num)
  if (!pdf || !canvas || paintedThumbs.has(num)) return
  paintedThumbs.add(num)

  const page = await pdf.getPage(num)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: (THUMB_WIDTH / base.width) * dpr })
  canvas.width = viewport.width
  canvas.height = viewport.height
  canvas.style.width = `${THUMB_WIDTH}px`
  canvas.style.height = `${viewport.height / dpr}px`

  const context = canvas.getContext('2d')
  if (!context) return
  try {
    await page.render({ canvas, canvasContext: context, viewport }).promise
  } catch {
    paintedThumbs.delete(num)
  }
}

function goToPage(num: number) {
  pageEls.get(num)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function zoomBy(factor: number) {
  scale.value = Math.min(3, Math.max(0.4, scale.value * factor))
  paintedAt.clear()
  for (const num of pageEls.keys()) if (isNear(num)) void paintPage(num)
}

/** Cheap visibility test used when re-painting after a zoom. */
function isNear(num: number) {
  const el = pageEls.get(num)
  const box = scroller.value?.getBoundingClientRect()
  if (!el || !box) return false
  const rect = el.getBoundingClientRect()
  return rect.bottom > box.top - box.height && rect.top < box.bottom + box.height
}

function teardown() {
  for (const task of tasks.values()) task.cancel()
  tasks.clear()
  pageObserver?.disconnect()
  thumbObserver?.disconnect()
  pageObserver = thumbObserver = null
  pageEls.clear()
  pageCanvases.clear()
  thumbCanvases.clear()
  paintedAt.clear()
  paintedThumbs.clear()
  void loadingTask?.destroy()
  loadingTask = null
  doc.value = null
}

async function load(src: string) {
  teardown()
  loading.value = true
  failed.value = false
  pages.value = []
  currentPage.value = 1
  scale.value = 1

  try {
    loadingTask = pdfjs.getDocument({ url: src })
    const pdf = await loadingTask.promise
    doc.value = pdf

    // Page boxes are needed up front so the scrollbar is the right length
    // before anything is painted. Past 60 pages that costs more than it's
    // worth, so the first page's ratio stands in for the rest.
    const first = await pdf.getPage(1)
    const firstView = first.getViewport({ scale: 1 })
    scale.value = Math.min(1.6, BASE_WIDTH / firstView.width)

    const sampleAll = pdf.numPages <= 60
    const sizes: { num: number; width: number; height: number }[] = []
    for (let num = 1; num <= pdf.numPages; num++) {
      const view =
        sampleAll && num > 1 ? (await pdf.getPage(num)).getViewport({ scale: 1 }) : firstView
      sizes.push({ num, width: view.width, height: view.height })
    }
    pages.value = sizes
    loading.value = false

    await nextTick()
    observe()
  } catch {
    loading.value = false
    failed.value = true
  }
}

function observe() {
  const root = scroller.value
  if (!root) return

  // A page is painted once it comes within one screen of the viewport.
  pageObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const num = Number((entry.target as HTMLElement).dataset.page)
        if (entry.isIntersecting) {
          void paintPage(num)
          if (entry.intersectionRatio > 0.35) currentPage.value = num
        }
      }
    },
    { root, rootMargin: '100% 0px', threshold: [0, 0.35, 0.6] },
  )
  thumbObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting)
          void paintThumb(Number((entry.target as HTMLElement).dataset.page))
      }
    },
    { rootMargin: '200px' },
  )

  for (const el of pageEls.values()) pageObserver.observe(el)
  for (const el of thumbCanvases.values()) thumbObserver.observe(el)
}

watch(() => props.src, load, { immediate: true })
onBeforeUnmount(teardown)
</script>

<template>
  <div class="flex h-full w-full overflow-hidden rounded-lg bg-[#2B2B2B]" @click.stop>
    <!-- Thumbnail rail -->
    <aside
      v-if="pages.length > 1"
      class="hidden w-40 shrink-0 overflow-y-auto overscroll-contain border-r border-white/10 bg-black/30 py-3 sm:block"
    >
      <button
        v-for="page in pages"
        :key="page.num"
        type="button"
        class="mx-auto mb-3 flex w-[124px] flex-col items-center gap-1 hover:cursor-pointer"
        @click="goToPage(page.num)"
      >
        <canvas
          :ref="(el) => setThumbCanvas(page.num, el as Element | null)"
          :data-page="page.num"
          :style="{
            width: `${THUMB_WIDTH}px`,
            height: `${(THUMB_WIDTH * page.height) / page.width}px`,
          }"
          :class="[
            'rounded bg-white shadow-sm ring-2 transition-shadow',
            currentPage === page.num ? 'ring-primary' : 'ring-transparent',
          ]"
        />
        <span
          :class="[
            'text-[11px] font-medium',
            currentPage === page.num ? 'text-primary' : 'text-white/50',
          ]"
          >{{ page.num }}</span
        >
      </button>
    </aside>

    <!-- Pages -->
    <div class="relative flex min-w-0 flex-1 flex-col">
      <div ref="scroller" class="flex-1 overflow-auto overscroll-contain p-4">
        <p v-if="loading" class="py-16 text-center text-sm text-white/60">
          {{ t('document.documentDetailsPage.pdfLoading') }}
        </p>
        <p v-else-if="failed" class="py-16 text-center text-sm text-white/60">
          {{ t('document.documentDetailsPage.pdfFailed') }}
        </p>

        <div
          v-for="page in pages"
          :key="page.num"
          :ref="(el) => setPageEl(page.num, el as Element | null)"
          :data-page="page.num"
          class="mx-auto mb-4 w-fit bg-white shadow-lg"
          :style="{ minHeight: `${(page.height / page.width) * 200}px` }"
        >
          <canvas
            :ref="(el) => setPageCanvas(page.num, el as Element | null)"
            class="block"
            :style="{
              width: `${page.width * scale}px`,
              height: `${page.height * scale}px`,
            }"
          />
        </div>
      </div>

      <!-- Page counter + zoom -->
      <div
        v-if="pages.length"
        class="flex items-center justify-center gap-2 border-t border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70"
      >
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:cursor-pointer hover:bg-white/20"
          aria-label="Zoom out"
          @click="zoomBy(1 / 1.2)"
        >
          −
        </button>
        <span class="min-w-24 text-center tabular-nums">
          {{ currentPage }} / {{ pages.length }}
        </span>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:cursor-pointer hover:bg-white/20"
          aria-label="Zoom in"
          @click="zoomBy(1.2)"
        >
          +
        </button>
      </div>
    </div>
  </div>
</template>
