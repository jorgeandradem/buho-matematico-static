<script setup>
import { Delete } from 'lucide-vue-next';

const emit = defineEmits(['press', 'delete']);

const keys = [
  1, 2, 3,
  4, 5, 6,
  7, 8, 9,
  null, 0, 'del'
];

const handlePress = (key) => {
  if (key === 'del') emit('delete');
  else if (key !== null) emit('press', key);
};
</script>

<template>
  <div class="w-full bg-white border-t-4 border-indigo-100 p-2 pb-6 z-50 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
    <div class="max-w-md mx-auto">
      <div class="flex justify-center mb-1">
        <div class="h-1 w-12 bg-slate-200 rounded-full"></div>
      </div>

      <div class="grid grid-cols-3 gap-2 px-4">
        <button 
          v-for="(key, index) in keys" 
          :key="index"
          @click.stop.prevent="handlePress(key)"
          :class="[
            'h-12 sm:h-14 rounded-xl text-2xl font-black transition-all flex items-center justify-center shadow-sm active:scale-95 active:translate-y-1',
            key === 'del' ? 'bg-red-50 text-red-500 border-b-4 border-red-200 active:border-b-0 col-span-1' : 
            key === null ? 'invisible' : 
            'bg-slate-50 border-b-4 border-slate-300 text-slate-700 active:border-b-0 active:bg-indigo-50'
          ]"
        >
          <Delete v-if="key === 'del'" :size="24" stroke-width="3" />
          <span v-else>{{ key }}</span>
        </button>
      </div>
    </div>
  </div>
</template>