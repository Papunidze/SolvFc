<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ label: string; description: string; defaultPercent: number }>()
const percent = defineModel<number>({ required: true })

const draft = ref(percent.value)
const isDefault = computed(() => draft.value === props.defaultPercent)

function preview(event: Event) {
  draft.value = Number((event.target as HTMLInputElement).value)
}

function commit() {
  percent.value = draft.value
}
</script>

<template>
  <label class="block space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
    <span class="flex items-center justify-between">
      <span class="font-bold">{{ label }}</span>
      <span
        class="rounded-full px-2 py-0.5 text-xs font-semibold"
        :class="isDefault ? 'bg-mist text-slate-500' : 'bg-volt text-ink'"
      >
        {{ isDefault ? 'Default' : 'Custom' }}
      </span>
    </span>
    <span class="block text-4xl font-extrabold tracking-tight">{{ draft }}<span class="text-2xl text-slate-400">%</span></span>
    <input type="range" min="0" max="300" step="5" :value="draft" class="w-full cursor-pointer accent-ink" @input="preview" @change="commit" />
    <span class="block text-xs text-slate-500">{{ description }}</span>
  </label>
</template>
