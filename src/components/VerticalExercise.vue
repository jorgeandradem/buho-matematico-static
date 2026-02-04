<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { 
  ChevronLeft, ChevronRight, RotateCcw,
  Plus, Minus, X as MultiplyIcon 
} from 'lucide-vue-next';
import SmartGuide from './SmartGuide.vue';
import SimpleConfetti from './SimpleConfetti.vue';
import VirtualKeypad from './VirtualKeypad.vue';

const props = defineProps({
  operation: { type: String, default: 'add' },
  difficulty: { type: Number, default: 1 }
});

const emit = defineEmits(['back']);

// --- CONFIGURACIÓN VISUAL (ICONOS Y SIGNOS) ---
const operationConfig = computed(() => {
  const configs = {
    add: { icon: Plus, color: 'bg-green-500', label: 'Sumar' },
    sub: { icon: Minus, color: 'bg-orange-500', label: 'Restar' },
    mult: { icon: MultiplyIcon, color: 'bg-purple-500', label: 'Multiplicar' }
  };
  return configs[props.operation] || configs.add;
});

const opSymbol = computed(() => {
  if (props.operation === 'sub') return '-';
  if (props.operation === 'mult') return 'x';
  return '+';
});

const showConfetti = ref(false);
const activeExerciseIndex = ref(0);
const activeCell = ref(null);
const currentInputTask = ref({ expected: null, nextFn: null, id: null, exIdx: null });

const isMultLevel2 = computed(() => props.operation === 'mult' && props.difficulty === 2);
const staticCellClass = computed(() => 
  isMultLevel2.value 
    ? "w-9 h-10 flex items-center justify-center text-xl font-bold text-slate-700" 
    : "w-14 h-12 flex items-center justify-center text-4xl font-mono font-bold text-slate-700"
);

// --- GENERADOR DE EJERCICIOS ---
const generateRandomExercise = (id) => {
  let top, bot;
  if (props.operation === 'sub') {
    top = Math.floor(Math.random() * 800) + 200; 
    let bUnit = (top % 10) + Math.floor(Math.random() * 4) + 2; 
    bot = (Math.floor(Math.random() * (top - 100)) - ((top - 100) % 10)) + Math.min(9, bUnit);
    if (bot > top) bot = top - 11;
  } else if (props.operation === 'mult') {
    top = props.difficulty === 2 ? Math.floor(Math.random() * 8000) + 1000 : Math.floor(Math.random() * 800) + 100;
    bot = props.difficulty === 2 ? Math.floor(Math.random() * 89) + 10 : Math.floor(Math.random() * 8) + 2;
  } else {
    top = Math.floor(Math.random() * 800) + 100; bot = Math.floor(Math.random() * 800) + 100;
  }
  return { id, top, bot, completed: false, inputs: {} };
};

const exercises = ref(Array.from({ length: 5 }, (_, i) => generateRandomExercise(i)));
const getDigits = (num) => num.toString().split('').reverse().map(Number);

const computedExercises = computed(() => exercises.value.map(ex => {
  if (props.operation === 'mult' && props.difficulty === 2) return processMultLevel2(ex);
  return processStandardOperation(ex);
}));
const currentExercise = computed(() => computedExercises.value[activeExerciseIndex.value]);

// --- PROCESADORES LÓGICOS ---
const processStandardOperation = (ex) => {
  const topDigits = getDigits(ex.top); const botDigits = getDigits(ex.bot); 
  const cols = Math.max(topDigits.length, botDigits.length); const columns = [];
  let carry = 0; const loopLimit = (props.operation === 'sub') ? cols : cols + 1; 
  for (let i = 0; i < loopLimit; i++) {
    if (i >= cols && carry === 0) break;
    const t = topDigits[i] || 0; const b = props.operation === 'mult' ? ex.bot : (botDigits[i] || 0);
    let resDigit, nextCarry, ovalValue = 0, showOval = false, ovalType = '';
    if (props.operation === 'sub') {
      let effectiveTop = t - carry; 
      if (effectiveTop < b && i < cols - 1) {
        ovalValue = effectiveTop + 10; resDigit = ovalValue - b; nextCarry = 1; showOval = true; ovalType = 'borrow';
      } else {
        resDigit = effectiveTop - b; nextCarry = 0; if (carry > 0) { showOval = true; ovalValue = effectiveTop; ovalType = 'reduced'; }
      }
    } else {
      const valTotal = (props.operation === 'mult' ? t * b : t + b) + carry;
      resDigit = valTotal % 10; nextCarry = Math.floor(valTotal / 10);
      showOval = i > 0 && carry > 0; ovalValue = carry;
    }
    columns.push({ colIdx: i, top: t, bot: b, isExtraCol: i >= cols, expectedResult: resDigit, expectedCarry: nextCarry, prevCarry: carry, showOval, ovalValue, ovalType, fullBot: ex.bot });
    carry = nextCarry;
  }
  return { ...ex, processedCols: columns, totalCols: columns.length, isMultL2: false };
};

const processMultLevel2 = (ex) => {
  const topDigits = getDigits(ex.top); const botDigits = getDigits(ex.bot);
  const row1 = []; let c1 = 0;
  for(let i=0; i<topDigits.length || c1>0; i++) {
    const v = ((topDigits[i] || 0) * botDigits[0]) + c1;
    row1.push({ digit: v % 10, carry: Math.floor(v / 10), prev: c1, t: (topDigits[i] || 0), m: botDigits[0] });
    c1 = Math.floor(v / 10);
  }
  const row2 = []; let c2 = 0;
  for(let i=0; i<topDigits.length || c2>0; i++) {
    const v = ((topDigits[i] || 0) * botDigits[1]) + c2;
    row2.push({ digit: v % 10, carry: Math.floor(v / 10), prev: c2, t: (topDigits[i] || 0), m: botDigits[1] });
    c2 = Math.floor(v / 10);
  }
  const sumRows = []; let cs = 0;
  const maxLen = Math.max(row1.length, row2.length + 1);
  for(let i=0; i<maxLen || cs>0; i++) {
    const d1 = row1[i]?.digit || 0;
    const d2 = (i > 0) ? (row2[i-1]?.digit || 0) : 0;
    const v = d1 + d2 + cs;
    sumRows.push({ digit: v % 10, carry: Math.floor(v / 10), prev: cs, d1, d2 });
    cs = Math.floor(v / 10);
  }
  const maxCols = sumRows.length;
  const gridIndices = Array.from({length: maxCols}, (_, i) => i);
  return { ...ex, isMultL2: true, row1, row2, sumRows, topDigits, botDigits, totalCols: maxCols, gridIndices };
};

// --- INTELIGENCIA DEL PROFESOR BÚHO (LÉXICO EXACTO) ---
const owlAdvice = computed(() => {
  const ex = currentExercise.value;
  if (!activeCell.value || ex.completed) return "¡Excelente trabajo!\nLo has hecho\ncomo un campeón.";
  
  const { type, colIdx, rowId } = activeCell.value;
  const col = !ex.isMultL2 ? ex.processedCols[colIdx] : null;

  // CONTEXTO: SUMAR
  if (props.operation === 'add' && col) {
      if (type === 'carry') return "Anota el 1 de\nla llevada.";
      if (col.isExtraCol) return "Suma: 1 de la\nllevada = 1";

      const sumBase = col.top + col.bot;
      const total = sumBase + col.prevCarry;

      if (col.prevCarry > 0) {
          if (total >= 10) return `Suma: (${col.top} + ${col.bot} = ${sumBase})\n+ 1 llevada = ${total}\nAnota ${col.expectedResult} abajo y\nsube 1 de la llevada.`;
          return `Suma: (${col.top} + ${col.bot} = ${sumBase})\n+ 1 llevada = ${total}\nabajo.`;
      } else {
          if (total >= 10) return `Suma: (${col.top} + ${col.bot} = ${total})\nPon el ${col.expectedResult} abajo y\nsube el 1 al óvalo\nde al lado.`;
          return `Suma: (${col.top} + ${col.bot} = ${total})\nPon el ${col.expectedResult}\nabajo.`;
      }
  }

  // CONTEXTO: RESTAR
  if (props.operation === 'sub' && col) {
      if (type === 'carry') return col.ovalType === 'borrow' 
        ? `¿${col.top} menor que ${col.bot}?\n¡Pide 1 prestado!\nTe vuelves ${col.ovalValue}.\nEscríbelo arriba.`
        : `Como prestaste 1,\nahora eres ${col.ovalValue}.\nPonlo en el óvalo.\n¡Sigue así!`;
      const valBase = col.showOval ? col.ovalValue : col.top;
      return `¡Resta ahora!\n${valBase} - ${col.bot} = ${col.expectedResult}\nPon el resultado\ny continúa así.`;
  }

  // CONTEXTO: MULTIPLICAR
  if (props.operation === 'mult') {
      if (ex.isMultL2) {
          if (rowId === 'r1') return `Multiplica por ${ex.botDigits[0]}.\nFila por fila.\n¡Ojo al óvalo!\nTú puedes.`;
          if (rowId === 'r2') return `Multiplica por ${ex.botDigits[1]}.\n¡OJO! Deja el 0\na la derecha.\n¡Muy bien!`;
          return "Suma las filas\npara el total.\n¡Ya casi está!";
      }
      if (type === 'carry') return "Anota el número de\nla llevada en\nel óvalo.";
      return `Multiplica:\n${ex.bot} x ${col.top} + (${col.prevCarry})\nEscribe el ${col.expectedResult}\ny sube la llevada.`;
  }

  return "Toca la casilla,\npiensa el número\ny escríbelo.\n¡Vamos, búho!";
});

// --- INTERACCIÓN ---
const handleKeypadPress = (num) => {
  if (!currentInputTask.value.id) return;
  const { expected, id, exIdx, nextFn } = currentInputTask.value;
  if (exIdx !== activeExerciseIndex.value) return;
  let cur = exercises.value[exIdx].inputs[id + '_val'] || "";
  let newVal = cur + num.toString();
  if (parseInt(newVal) === expected) {
    document.getElementById(id).value = newVal;
    exercises.value[exIdx].inputs[id] = 'correct';
    exercises.value[exIdx].inputs[id + '_val'] = "";
    nextTick(() => { if (nextFn) nextFn(); });
  } else if (newVal.length >= expected.toString().length) {
    exercises.value[exIdx].inputs[id] = 'error';
    exercises.value[exIdx].inputs[id + '_val'] = "";
  } else {
    exercises.value[exIdx].inputs[id + '_val'] = newVal;
    document.getElementById(id).value = newVal;
  }
};

const handleFocus = (exIdx, type, colIdx, rowId, expectedVal, nextFn) => {
  activeExerciseIndex.value = exIdx;
  const newId = rowId ? getId(exIdx, `${rowId}-${colIdx}`) : getId(exIdx, `c${colIdx}-${type}`);
  currentInputTask.value = { expected: expectedVal, nextFn, id: newId, exIdx };
  activeCell.value = { exIdx, type, colIdx, rowId };
};

const getId = (exIdx, s) => `in-${exIdx}-${s}`;

const autoFocus = () => {
  nextTick(() => {
    const idx = activeExerciseIndex.value; const ex = computedExercises.value[idx]; if(!ex) return;
    if (ex.isMultL2) {
      handleFocus(idx, 'result', 0, 'r1', ex.row1[0].digit, () => nextStepMult(idx, 0, 'r1'));
      document.getElementById(getId(idx, 'r1-0'))?.focus();
    } else {
      const col = ex.processedCols[0]; const type = col.showOval ? 'carry' : 'result';
      handleFocus(idx, type, 0, null, type==='carry' ? col.ovalValue : col.expectedResult, () => nextStepStd(idx, 0, type));
      document.getElementById(getId(idx, `c0-${type}`))?.focus();
    }
  });
};

const nextStepStd = (idx, col, type) => {
  const ex = computedExercises.value[idx];
  if (type === 'result') {
    if (col + 1 < ex.processedCols.length) {
      const next = ex.processedCols[col+1];
      const nextId = next.showOval ? getId(idx, `c${col+1}-carry`) : getId(idx, `c${col+1}-result`);
      document.getElementById(nextId)?.focus();
    } else { exercises.value[idx].completed = true; if (idx === exercises.value.length - 1) showConfetti.value = true; else setTimeout(() => { activeExerciseIndex.value++; autoFocus(); }, 1000); }
  } else { document.getElementById(getId(idx, `c${col}-result`))?.focus(); }
};

const nextStepMult = (idx, col, row) => {
  const ex = computedExercises.value[idx];
  if (row === 'r1') {
    if (col + 1 < ex.row1.length) document.getElementById(getId(idx, `r1-${col+1}`))?.focus();
    else document.getElementById(getId(idx, `r2-1`))?.focus();
  } else if (row === 'r2') {
    if (col + 1 < ex.row2.length + 1) document.getElementById(getId(idx, `r2-${col+1}`))?.focus();
    else document.getElementById(getId(idx, `sum-0`))?.focus();
  } else {
    if (col + 1 < ex.sumRows.length) document.getElementById(getId(idx, `sum-${col+1}`))?.focus();
    else { exercises.value[idx].completed = true; if (idx === exercises.value.length - 1) showConfetti.value = true; else setTimeout(() => { activeExerciseIndex.value++; autoFocus(); }, 1000); }
  }
};

const isCellActive = (idx, col, type, row) => {
  const a = activeCell.value;
  return a && a.exIdx === idx && a.colIdx === col && a.type === type && a.rowId === row;
};

const getInputClass = (idx, id, type = 'normal') => {
  const status = exercises.value[idx].inputs[id];
  let base = "text-center font-bold transition-all outline-none ";
  if (type === 'oval') {
    base += (props.operation === 'sub' ? "w-14 h-10 rounded-lg border-2 text-xl mb-1 " : "w-10 h-10 rounded-full border-2 text-lg mb-1 ");
  } else {
    base += (isMultLevel2.value ? "w-9 h-11 rounded-md border-2 text-xl " : "w-14 h-16 rounded-xl border-2 text-3xl ");
  }
  if (status === 'correct') return base + "bg-green-100 border-green-500 text-green-700";
  if (status === 'error') return base + "bg-red-50 border-red-500 text-red-600 animate-shake";
  return base + "bg-white border-slate-300 focus:ring-4 focus:ring-yellow-300";
};

onMounted(autoFocus);
</script>

<template>
  <div class="h-[100dvh] w-full bg-slate-100 flex flex-col overflow-hidden font-sans">
    <SimpleConfetti :isActive="showConfetti" />
    
    <div class="flex-none pt-2 px-4 pb-1 z-10 bg-white/90 backdrop-blur border-b border-slate-200 flex flex-col gap-1">
        <div class="flex justify-between items-center h-10">
            <div class="flex items-center gap-3">
                <button @click="$emit('back')" class="p-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center gap-1 active:scale-95 transition-transform"><ChevronLeft class="w-4 h-4"/> Volver</button>
                <div :class="`w-8 h-8 rounded-lg ${operationConfig.color} flex items-center justify-center shadow-sm`"><component :is="operationConfig.icon" :size="18" class="text-white" :stroke-width="3" /></div>
            </div>
            <div class="text-xs font-bold text-slate-400 uppercase tracking-widest">Ej {{ activeExerciseIndex + 1 }} / 5</div>
            <button @click="autoFocus" class="p-2 rounded-full bg-blue-100 text-blue-600 shadow active:scale-95 transition"><RotateCcw :size="20" /></button>
        </div>
        <SmartGuide :currentAdvice="owlAdvice" />
    </div>

    <div class="flex-1 flex flex-col items-center justify-center p-1 relative bg-slate-50 overflow-hidden">
        <div v-if="currentExercise" :key="currentExercise.id" class="w-full max-w-md flex flex-col justify-center h-full">
             <div class="relative p-2 rounded-[1.5rem] border-4 w-full shadow-lg bg-yellow-50 border-yellow-400 flex flex-col justify-center items-center h-full" :class="{ 'bg-green-50 border-green-300': currentExercise.completed }">
                
                <div class="absolute -top-4 -left-2 bg-white text-slate-700 font-black text-lg w-10 h-10 rounded-full flex items-center justify-center shadow-md border-2 border-slate-200">{{ activeExerciseIndex + 1 }}</div>

                <!-- MODO MULTIPLICACIÓN NIVEL 2 -->
                <div v-if="currentExercise.isMultL2" class="flex flex-col items-center w-full scale-90 sm:scale-100">
                    <div class="inline-flex flex-col items-end">
                        <div class="flex flex-row-reverse gap-1 mb-1">
                            <div v-for="i in currentExercise.totalCols" :key="'t'+i" class="w-9 text-center text-2xl font-bold text-slate-700">
                                {{ currentExercise.topDigits[i-1] !== undefined ? currentExercise.topDigits[i-1] : '' }}
                            </div>
                        </div>
                        <div class="flex flex-row-reverse gap-1 border-b-4 border-slate-800 pb-1 mb-2 relative">
                            <span class="absolute right-full mr-4 top-0 text-2xl font-black text-slate-400">x</span>
                            <div v-for="i in currentExercise.totalCols" :key="'b'+i" class="w-9 text-center text-2xl font-bold text-slate-700">
                                {{ currentExercise.botDigits[i-1] !== undefined ? currentExercise.botDigits[i-1] : '' }}
                            </div>
                        </div>
                        <div class="flex flex-row-reverse gap-1 mb-1">
                            <div v-for="i in currentExercise.totalCols" :key="'r1-'+i">
                                <input v-if="currentExercise.row1[i-1]" readonly :id="getId(activeExerciseIndex, `r1-${i-1}`)" :class="[getInputClass(activeExerciseIndex, getId(activeExerciseIndex, `r1-${i-1}`)), isCellActive(activeExerciseIndex, i-1, 'result', 'r1') ? 'ring-4 ring-yellow-400' : '']" @focus="handleFocus(activeExerciseIndex, 'result', i-1, 'r1', currentExercise.row1[i-1].digit, () => nextStepMult(activeExerciseIndex, i-1, 'r1'))" />
                                <div v-else class="w-9"></div>
                            </div>
                        </div>
                        <div class="flex flex-row-reverse gap-1 mb-2">
                            <div v-for="i in currentExercise.totalCols" :key="'r2-'+i">
                                <div v-if="i === 1" class="w-9 h-11 border-2 border-dashed border-slate-200 rounded-md flex items-center justify-center text-slate-300 font-bold bg-white">0</div>
                                <input v-else-if="currentExercise.row2[i-2]" readonly :id="getId(activeExerciseIndex, `r2-${i-1}`)" :class="[getInputClass(activeExerciseIndex, getId(activeExerciseIndex, `r2-${i-1}`)), isCellActive(activeExerciseIndex, i-1, 'result', 'r2') ? 'ring-4 ring-yellow-400' : '']" @focus="handleFocus(activeExerciseIndex, 'result', i-1, 'r2', currentExercise.row2[i-2].digit, () => nextStepMult(activeExerciseIndex, i-1, 'r2'))" />
                                <div v-else class="w-9"></div>
                            </div>
                        </div>
                        <div class="w-full border-b-4 border-slate-300 mb-2"></div>
                        <div class="flex flex-row-reverse gap-1">
                            <div v-for="i in currentExercise.totalCols" :key="'s'+i">
                                <input v-if="currentExercise.sumRows[i-1]" readonly :id="getId(activeExerciseIndex, `sum-${i-1}`)" :class="[getInputClass(activeExerciseIndex, getId(activeExerciseIndex, `sum-${i-1}`)), isCellActive(activeExerciseIndex, i-1, 'result', 'sum') ? 'ring-4 ring-yellow-400' : '']" @focus="handleFocus(activeExerciseIndex, 'result', i-1, 'sum', currentExercise.sumRows[i-1].digit, () => nextStepMult(activeExerciseIndex, i-1, 'sum'))" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- MODO ESTÁNDAR (Suma, Resta, Mult Nivel 1) -->
                <div v-else class="flex flex-row-reverse justify-center gap-1">
                    <div v-for="col in currentExercise.processedCols" :key="col.colIdx" class="flex flex-col items-center">
                        <div class="h-10 flex items-end justify-center mb-1">
                            <input v-if="col.showOval" readonly :id="getId(activeExerciseIndex, `c${col.colIdx}-carry`)" :class="[getInputClass(activeExerciseIndex, getId(activeExerciseIndex, `c${col.colIdx}-carry`), 'oval'), isCellActive(activeExerciseIndex, col.colIdx, 'carry') ? 'ring-4 ring-yellow-400' : '']" @focus="handleFocus(activeExerciseIndex, 'carry', col.colIdx, null, col.ovalValue, () => nextStepStd(activeExerciseIndex, col.colIdx, 'carry'))" />
                        </div>
                        <div class="w-14 h-12 flex items-center justify-center text-4xl font-mono font-bold text-slate-700">{{ col.isExtraCol ? '' : col.top }}</div>
                        <div class="w-14 h-12 flex items-center justify-center text-4xl font-mono font-bold text-slate-700 border-b-[5px] border-slate-800 relative">
                            <span v-if="col.colIdx === currentExercise.totalCols - 1 && !col.isExtraCol" class="absolute -left-8 top-1 text-2xl text-slate-400 font-black">{{ opSymbol }}</span>
                            {{ col.isExtraCol ? '' : (props.operation === 'mult' ? (col.colIdx === 0 ? col.fullBot : '') : col.bot) }}
                        </div>
                        <input readonly :id="getId(activeExerciseIndex, `c${col.colIdx}-result`)" :class="[getInputClass(activeExerciseIndex, getId(activeExerciseIndex, `c${col.colIdx}-result`)), isCellActive(activeExerciseIndex, col.colIdx, 'result') ? 'ring-4 ring-yellow-300' : '']" @focus="handleFocus(activeExerciseIndex, 'result', col.colIdx, null, col.expectedResult, () => nextStepStd(activeExerciseIndex, col.colIdx, 'result'))" />
                    </div>
                </div>
             </div>
        </div>
    </div>

    <div class="flex-none bg-white z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <VirtualKeypad @press="handleKeypadPress" @delete="() => {}" />
    </div>
  </div>
</template>

<style scoped>
input { caret-color: transparent; cursor: pointer; }
.animate-shake { animation: shake 0.4s; }
@keyframes shake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-5px);} 75%{transform:translateX(5px);} }
</style>