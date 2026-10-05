<script setup lang="ts">
import { browser } from 'wxt/browser'
import BrandMark from './BrandMark.vue'

const version = browser.runtime.getManifest().version
</script>

<template>
  <span class="flex items-center gap-2">
    <BrandMark />
    <span class="text-lg font-extrabold tracking-tight">SolvFC</span>
    <span class="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">v{{ version }}</span>
  </span>
</template>
