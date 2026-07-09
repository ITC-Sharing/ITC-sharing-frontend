<template>
  <button
    type="button"
    class="text-white bg-[#008CB9] box-border border border-transparent hover:bg-[#006F9E] focus:ring-4 focus:ring-[#D1E9FF] shadow-xs font-sm leading-5 rounded-lg text-md px-4 py-1.5 focus:outline-none cursor-pointer"
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
