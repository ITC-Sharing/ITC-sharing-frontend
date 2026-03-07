<template>
  <button
    type="button"
    class="text-white bg-[#1B68FF] box-border border border-transparent hover:bg-[#093ABE] focus:ring-4 focus:ring-[#D1E9FF] shadow-xs font-sm leading-5 rounded-lg text-lg px-4 py-2.5 focus:outline-none"
  >
    {{ text }}
  </button>
</template>
<script setup lang="ts">
defineProps({
  text: String,
  type: {
    type: String,
    default: "button"
  }
})</script>
