<script setup>
defineProps({
  currentAdvice: {
    type: String,
    required: true
  }
});
</script>

<template>
  <div 
    v-if="currentAdvice" 
    class="w-full max-w-lg mx-auto transition-all duration-300 animate-fade-in"
  >
    <!-- Altura mínima aumentada para soportar textos largos -->
    <div class="bg-blue-900 rounded-2xl p-3 shadow-xl flex items-center gap-3 border-2 border-blue-800 min-h-[90px]">
      
      <!-- Avatar Búho -->
      <div class="relative flex-shrink-0">
        <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center border-4 border-yellow-400 shadow-md">
           <span class="text-3xl">🦉</span>
        </div>
      </div>

      <!-- Texto Consejo -->
      <div class="flex-1 min-w-0 flex items-center">
        <div class="w-full">
            <h4 class="text-yellow-400 text-[10px] font-extrabold uppercase tracking-widest mb-1">
              Profesor Búho:
            </h4>
            <p class="text-white font-bold leading-snug text-sm">
              {{ currentAdvice }}
            </p>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>