<script setup lang="ts">
import type { SolveStats } from '../stats'

defineProps<{ stats: SolveStats }>()
</script>

<template>
  <section class="rounded-2xl bg-ink p-4 text-white">
    <h1 class="text-sm font-semibold text-slate-400">On this device</h1>
    <dl class="mt-3 grid grid-cols-2 gap-4">
      <div class="flex flex-col-reverse">
        <dt class="text-xs text-slate-400">Squads solved</dt>
        <dd class="text-3xl font-extrabold tracking-tight">{{ stats.squadsSolved.toLocaleString() }}</dd>
      </div>
      <div class="flex flex-col-reverse">
        <dt class="text-xs text-slate-400">Cards used</dt>
        <dd class="text-3xl font-extrabold tracking-tight text-coin">{{ stats.cardsUsed.toLocaleString() }}</dd>
      </div>
    </dl>
  </section>
</template>
