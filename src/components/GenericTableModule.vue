<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { ArrowLeft, Eraser, Eye, EyeOff, HelpCircle, Check, X } from 'lucide-vue-next';
import SimpleConfetti from './SimpleConfetti.vue';
import VerticalExercise from './VerticalExercise.vue';
import VirtualKeypad from './VirtualKeypad.vue'; 

const props = defineProps({
  operation: String, title: String, colorTheme: String, icon: Object,
  initialMode: String, initialDifficulty: Number, initialTable: [String, Number]
});

const emit = defineEmits(['back']);
const isNotebookMode = ref(props.initialMode === 'notebook'); 
const selectedNumber = ref(props.initialTable || 'random');
const showConfetti = ref(false);
const isSuccess = ref(false);
const refreshKey = ref(0);

// ESTADO MODO RÁPIDO
const userInputs = ref({});
const showTable = ref(false);
const exercises = ref([]);
const activeInputId = ref(null); 

const themes = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-900', btn: 'bg-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-900', btn: 'bg-green-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-900', btn: 'bg-purple-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-900', btn: 'bg-orange-600' },
};
const themeClasses = computed(() => themes[props.colorTheme] || themes.blue);

const generateExercises = async () => {
  isSuccess.value = false;
  showConfetti.value = false;
  userInputs.value = {};
  activeInputId.value = null;
  exercises.value = [];
  
  if (!isNotebookMode.value) {
    let baseArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    if (selectedNumber.value === 'random') baseArray.sort(() => Math.random() - 0.5);
    exercises.value = baseArray.slice(0, 10).map(i => createExerciseData(i));
    await nextTick();
    if (exercises.value.length > 0) focusInput(exercises.value[0].id);
  } else {
    refreshKey.value++; 
  }
};

const createExerciseData = (i) => {
    let left = 0, right = 0, opChar = '+', result = 0;
    let currentTableNum = selectedNumber.value === 'random' ? Math.floor(Math.random() * 9) + 2 : parseInt(selectedNumber.value);
    if (props.operation === 'div') currentTableNum = selectedNumber.value === 'random' ? Math.floor(Math.random() * 10) + 1 : parseInt(selectedNumber.value);
    
    let varNum = i;
    if (props.operation === 'sub') {
        left = Math.max(currentTableNum, varNum) + Math.min(currentTableNum, varNum); 
        right = Math.min(currentTableNum, varNum); opChar = '-'; result = left - right;
    } else if (props.operation === 'add') {
        left = currentTableNum; right = varNum; opChar = '+'; result = left + right;
    } else if (props.operation === 'div') {
        left = currentTableNum * varNum; right = currentTableNum; opChar = '÷'; result = varNum;
    } else { 
        left = currentTableNum; right = varNum; opChar = 'x'; result = left * right;
    }
    return { id: `q-${Date.now()}-${Math.random()}`, left, right, operator: opChar, result };
};

onMounted(() => { setTimeout(generateExercises, 100); });

const focusInput = (id) => {
    activeInputId.value = id;
    nextTick(() => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const handleKeypadPress = (num) => {
    if (!activeInputId.value) return;
    const id = activeInputId.value;
    const ex = exercises.value.find(e => e.id === id);
    if (userInputs.value[id] === 'correct') return; 

    let currentVal = (userInputs.value[id] || '').toString();
    if (currentVal === 'error') currentVal = '';
    
    const newVal = currentVal + num.toString();
    if (newVal.length > ex.result.toString().length + 1) return;

    if (parseInt(newVal) === ex.result) {
        userInputs.value[id] = 'correct'; 
        const idx = exercises.value.findIndex(e => e.id === id);
        if (idx < exercises.value.length - 1) {
            focusInput(exercises.value[idx + 1].id);
        } else {
            activeInputId.value = null; 
            isSuccess.value = true;
            showConfetti.value = true;
        }
    } else {
        const strResult = ex.result.toString();
        if (newVal.length >= strResult.length && newVal !== strResult) {
             userInputs.value[id] = 'error'; 
             if (navigator.vibrate) navigator.vibrate(200);
        } else {
             userInputs.value[id] = newVal; 
        }
    }
};

const handleDelete = () => {
    if (!activeInputId.value) return;
    const id = activeInputId.value;
    if (userInputs.value[id] === 'correct') return;
    let val = (userInputs.value[id] || '').toString();
    if (val === 'error') val = '';
    userInputs.value[id] = val.slice(0, -1);
};
</script>

<template>
  <div :class="`h-[100dvh] w-full ${themeClasses.bg} font-sans flex flex-col overflow-hidden`">
    <SimpleConfetti :isActive="showConfetti" />
    
    <!-- HEADER -->
    <div v-if="!isNotebookMode" class="flex-none p-3 flex items-center justify-between z-10 bg-white/60 backdrop-blur border-b border-slate-200">
      <div class="flex items-center gap-3">
        <button @click="emit('back')" class="text-slate-500 hover:text-slate-800 font-bold"><ArrowLeft :size="24" /></button>
        <h1 class="text-lg font-black text-slate-800 flex items-center gap-2">
          <span :class="`${themeClasses.btn} text-white p-1 rounded`"><component :is="icon" :size="16" /></span>
          {{ title }}
        </h1>
      </div>
      <div class="flex gap-2">
           <button @click="generateExercises" class="p-2 bg-white shadow-sm rounded-lg text-slate-500 active:scale-95 transition"><Eraser :size="18" /></button>
           <button @click="showTable = !showTable" :class="`p-2 rounded-lg shadow-sm transition active:scale-95 ${showTable ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300' : 'bg-white text-slate-500'}`">
               <component :is="showTable ? EyeOff : Eye" :size="18" />
           </button>
      </div>
    </div>

    <!-- MODAL TABLA AYUDA -->
    <div v-if="showTable" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" @click.self="showTable = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xs border-4 border-indigo-100 overflow-hidden flex flex-col max-h-[70vh]">
            <div class="bg-indigo-50 p-3 border-b border-indigo-100 flex justify-between items-center shrink-0">
                <div class="flex items-center gap-2 font-black text-slate-700">
                    <HelpCircle :size="20" class="text-indigo-500"/> Soluciones
                </div>
                <button @click="showTable = false" class="p-1 bg-white rounded-full text-slate-400 hover:text-red-500 transition shadow-sm"><X :size="20" /></button>
            </div>
            <div class="overflow-y-auto p-3 bg-white">
                <div class="grid grid-cols-1 gap-2">
                    <div v-for="ex in exercises" :key="'h-'+ex.id" class="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
                        <span class="text-lg font-bold text-slate-600 font-mono">{{ ex.left }} {{ ex.operator }} {{ ex.right }}</span>
                        <span class="text-xl font-black text-indigo-600">= {{ ex.result }}</span>
                    </div>
                </div>
            </div>
            <div class="p-3 bg-slate-50 border-t border-slate-100 text-center shrink-0">
                <button @click="showTable = false" class="w-full py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition">¡Entendido!</button>
            </div>
        </div>
    </div>

    <!-- CUERPO TABLAS RÁPIDAS -->
    <div v-if="!isNotebookMode" class="flex-1 overflow-y-auto p-4 bg-slate-50">
       <div class="max-w-md mx-auto grid grid-cols-1 gap-4 pb-4">
           <div class="grid grid-cols-2 gap-3">
             <div v-for="ex in exercises" :key="ex.id" 
                  class="bg-white p-2 rounded-xl shadow-sm border-2 transition-all flex flex-col items-center justify-center gap-1 min-h-[65px]"
                  :class="activeInputId === ex.id ? 'border-yellow-400 ring-2 ring-yellow-100 scale-[1.02]' : 'border-white'">
               
               <div class="text-base font-black text-slate-600 font-numbers flex gap-1">
                 <span>{{ ex.left }}</span>
                 <span class="text-indigo-400">{{ ex.operator }}</span>
                 <span>{{ ex.right }}</span>
                 <span class="text-slate-300">=</span>
               </div>
               
               <!-- INPUT CON VALIDACIÓN EXTERNA: CORRECCIÓN FINAL -->
               <div class="relative flex items-center justify-center w-full px-5">
                 <div @click="focusInput(ex.id)" 
                      :id="ex.id"
                      class="w-16 h-10 rounded-lg border-2 flex items-center justify-center text-lg font-bold cursor-pointer transition-colors"
                      :class="[
                         userInputs[ex.id] === 'correct' ? 'bg-green-100 border-green-500 text-green-700 shadow-sm' :
                         userInputs[ex.id] === 'error' ? 'bg-red-50 border-red-300 text-red-500' :
                         activeInputId === ex.id ? 'bg-yellow-50 border-yellow-400 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-400'
                      ]"
                 >
                    <!-- El número NO desaparece al acertar -->
                    <span>{{ userInputs[ex.id] === 'error' ? '?' : (userInputs[ex.id] === 'correct' ? ex.result : (userInputs[ex.id] || '')) }}</span>
                 </div>
                 
                 <!-- Palomita externa a la derecha, fuera de la celda -->
                 <div v-if="userInputs[ex.id] === 'correct'" 
                      class="absolute left-full ml-1 text-green-600 animate-fade-in-scale z-10">
                    <Check :size="20" stroke-width="4" />
                 </div>
               </div>
             </div>
           </div>
       </div>
    </div>

    <!-- MODO CUADERNO: BLINDADO -->
    <div v-if="isNotebookMode" class="fixed inset-0 z-50 bg-slate-100">
        <VerticalExercise 
            :key="refreshKey" 
            :operation="props.operation" 
            :difficulty="props.initialDifficulty"
            :title="title" 
            :icon="icon"
            :colorTheme="colorTheme"
            @back="emit('back')"
        />
    </div>

    <!-- TECLADO RÁPIDO -->
    <div v-if="!isNotebookMode" class="flex-none bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
        <VirtualKeypad @press="handleKeypadPress" @delete="handleDelete" />
    </div>

  </div>
</template>

<style scoped>
.font-numbers { font-family: 'Nunito', sans-serif; }
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

/* Animación optimizada para la palomita externa */
.animate-fade-in-scale {
  animation: fadeInScale 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.5) translateX(-5px); }
  to { opacity: 1; transform: scale(1) translateX(0); }
}
</style>