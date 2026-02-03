<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-vue-next';
import SmartGuide from './SmartGuide.vue';
import SimpleConfetti from './SimpleConfetti.vue';
import VirtualKeypad from './VirtualKeypad.vue';

const props = defineProps({
  operation: { type: String, default: 'add' },
  difficulty: { type: Number, default: 1 }
});

const showConfetti = ref(false);
const activeExerciseIndex = ref(0);
const activeCell = ref(null);
const currentInputTask = ref({ expected: null, nextFn: null, id: null, exIdx: null });

// --- ESTILOS DINÁMICOS (MAQUILLAJE) ---
const isMultLevel2 = computed(() => props.operation === 'mult' && props.difficulty === 2);

// Celdas Estáticas: Compactas (w-9) para que quepan 6 columnas en Nivel 2
const staticCellClass = computed(() => 
  isMultLevel2.value 
    ? "w-9 text-center text-xl font-bold text-slate-700" 
    : "w-14 h-12 flex items-center justify-center text-4xl font-mono font-bold text-slate-700"
);

// --- GENERADORES (AJUSTE 4 CIFRAS x 2 CIFRAS) ---
const generateRandomExercise = (id) => {
  let top, bot;
  if (props.operation === 'sub') {
    top = Math.floor(Math.random() * 800) + 200; 
    let tUnit = top % 10;
    let bUnit = Math.min(9, tUnit + Math.floor(Math.random() * 4) + 1); 
    let tempBot = Math.floor(Math.random() * (top - 100));
    bot = (tempBot - (tempBot % 10)) + bUnit;
    if (bot > top) bot = top - 10; 
  } else if (props.operation === 'mult') {
    if (props.difficulty === 2) {
        // NIVEL 2: 4 CIFRAS (1000-9999) x 2 CIFRAS (10-99)
        top = Math.floor(Math.random() * 9000) + 1000; 
        bot = Math.floor(Math.random() * 90) + 10;   
    } else {
        // NIVEL 1: 3 CIFRAS x 1 CIFRA
        top = Math.floor(Math.random() * 900) + 100;
        bot = Math.floor(Math.random() * 9) + 1; 
    }
  } else {
    top = Math.floor(Math.random() * 900) + 100; 
    bot = Math.floor(Math.random() * 900) + 100; 
  }
  return { id, top, bot, completed: false, inputs: {} };
};

const exercises = ref(Array.from({ length: 5 }, (_, i) => generateRandomExercise(i)));
const getDigits = (num) => num.toString().split('').reverse().map(Number);

const computedExercises = computed(() => {
  return exercises.value.map((ex) => {
    if (props.operation === 'mult' && props.difficulty === 2) return processMultLevel2(ex);
    return processStandardOperation(ex);
  });
});
const currentExercise = computed(() => computedExercises.value[activeExerciseIndex.value]);

// --- PROCESADORES (INTACTOS) ---
const processStandardOperation = (ex) => {
    const topDigits = getDigits(ex.top); const botDigits = getDigits(ex.bot); 
    const cols = Math.max(topDigits.length, botDigits.length); const columns = [];
    let carry = 0; const loopLimit = (props.operation === 'sub') ? cols : cols + 1; 
    for (let i = 0; i < loopLimit; i++) {
      if (i >= cols && carry === 0) break;
      const t = topDigits[i] || 0; const b = props.operation === 'mult' ? ex.bot : (botDigits[i] || 0);
      let resDigit, nextCarry, valTotal, showOval = false, ovalValue = 0;
      if (props.operation === 'sub') {
        let effectiveTop = t - carry; let needsBorrow = false;
        if (effectiveTop < b) { needsBorrow = true; valTotal = (effectiveTop + 10) - b; nextCarry = 1; } 
        else { valTotal = effectiveTop - b; nextCarry = 0; }
        resDigit = valTotal;
        if (carry > 0 || needsBorrow) { showOval = true; ovalValue = needsBorrow ? (effectiveTop + 10) : effectiveTop; }
      } else if (props.operation === 'mult') {
        valTotal = (t * b) + carry; resDigit = valTotal % 10; nextCarry = Math.floor(valTotal / 10);
        showOval = i > 0 && carry > 0; ovalValue = carry; 
      } else {
        valTotal = t + b + carry; resDigit = valTotal % 10; nextCarry = Math.floor(valTotal / 10);
        showOval = i > 0 && carry > 0; ovalValue = carry;
      }
      columns.push({ colIdx: i, top: t, bot: props.operation === 'mult' ? null : b, isExtraCol: i >= cols, expectedResult: resDigit, expectedCarry: nextCarry, prevCarry: carry, showOval, ovalValue, fullBot: ex.bot });
      carry = nextCarry;
    }
    return { ...ex, processedCols: columns, totalCols: columns.length, isMultL2: false };
};

const processMultLevel2 = (ex) => {
    const topDigits = getDigits(ex.top); const botDigits = getDigits(ex.bot);
    const row1Cols = []; let carry = 0; const unitMult = botDigits[0];
    
    // FASE 1: Unidades
    // Iteramos por las 4 cifras de arriba + posible llevada
    for(let i=0; i < topDigits.length || carry > 0; i++) {
        const t = topDigits[i] || 0; const val = (t * unitMult) + carry;
        row1Cols.push({ digit: val % 10, carryVal: Math.floor(val / 10), prevCarry: carry, topDigit: t, multDigit: unitMult });
        carry = Math.floor(val / 10);
    }
    
    // FASE 2: Decenas
    const row2Cols = []; carry = 0; const tenMult = botDigits[1];
    for(let i=0; i < topDigits.length || carry > 0; i++) {
        const t = topDigits[i] || 0; const val = (t * tenMult) + carry;
        row2Cols.push({ digit: val % 10, carryVal: Math.floor(val / 10), prevCarry: carry, topDigit: t, multDigit: tenMult });
        carry = Math.floor(val / 10);
    }
    
    // FASE 3: Suma
    const num1 = parseInt(row1Cols.map(c => c.digit).reverse().join(''));
    const num2 = parseInt(row2Cols.map(c => c.digit).reverse().join('')) * 10; 
    const sumCols = []; 
    // Calculamos el total real para determinar el ancho exacto del grid
    const totalDigits = getDigits(num1 + num2); 
    carry = 0;
    
    for(let i=0; i < totalDigits.length; i++) {
        const d1 = i < row1Cols.length ? row1Cols[i].digit : 0;
        const d2 = (i > 0 && (i-1) < row2Cols.length) ? row2Cols[i-1].digit : 0;
        const val = d1 + d2 + carry;
        sumCols.push({ digit: val % 10, carryVal: Math.floor(val / 10), prevCarry: carry, d1, d2 });
        carry = Math.floor(val / 10);
    }
    
    // El ancho máximo del grid será la longitud de la suma final (aprox 6 columnas)
    const maxCols = Math.max(row1Cols.length, row2Cols.length + 1, sumCols.length);
    const gridIndices = Array.from({length: maxCols}, (_, i) => i);
    
    return { ...ex, isMultL2: true, row1: row1Cols, row2: row2Cols, sumRow: sumCols, topDigits, botDigits, totalCols: maxCols, gridIndices };
};

// --- CEREBRO DEL BÚHO ---
const owlAdvice = computed(() => { 
  const ex = currentExercise.value;
  if (!activeCell.value) return "Toca para empezar.";
  if (!ex || ex.completed) return "¡Ejercicio completado! Siguiente.";
  const { type, colIdx, rowId } = activeCell.value;

  if (ex.isMultL2) {
      if (rowId === 'r1') {
          const col = ex.row1[colIdx]; if (!col) return "Sigue.";
          if (type === 'carry') return `Llevamos ${col.prevCarry}.`;
          let msg = `Multiplica: ${col.multDigit}x${col.topDigit}.`;
          if (col.prevCarry > 0) msg += ` +${col.prevCarry} llevada.`;
          msg += ` Escribe ${col.digit}.`; return msg;
      }
      if (rowId === 'r2') {
          const col = ex.row2[colIdx - 1]; if (!col) return "0 (Espacio).";
          if (type === 'carry') return `Nueva llevada: ${col.prevCarry}.`;
          let msg = `Multiplica: ${col.multDigit}x${col.topDigit}.`;
          if (col.prevCarry > 0) msg += ` +${col.prevCarry}.`;
          msg += ` Escribe ${col.digit}.`; return msg;
      }
      if (rowId === 'sum') {
          const col = ex.sumRow[colIdx]; if (!col) return "";
          if (type === 'carry') return `Llevada suma: ${col.prevCarry}.`;
          return `Suma: ${col.d1} + ${col.d2} ${col.prevCarry>0?'+ '+col.prevCarry:''} = ${col.digit + col.carryVal*10}.`;
      }
      return "Sigue así.";
  }

  const colData = ex.processedCols[colIdx];
  if (!colData) return "";
  const { top, bot, prevCarry, expectedResult, expectedCarry, ovalValue, isExtraCol, fullBot } = colData;
  const op = props.operation;
  
  if (type === 'carry') {
    if (op === 'sub') {
        if (expectedCarry > 0) return `A ${top} no le quitas ${bot}. Pide prestado.`;
        if (prevCarry > 0) return `Quedó en ${ovalValue} por prestar.`;
    }
    return `Llevas ${ovalValue}.`;
  }
  if (type === 'result') {
    if (op === 'sub') {
      if (colData.showOval) return `Resta: ${ovalValue} - ${bot} = ${expectedResult}.`;
      return `Resta: ${top} - ${bot} = ${expectedResult}.`;
    }
    if (op === 'mult') {
        if (isExtraCol) return `Baja la llevada: ${prevCarry}.`;
        return `Multiplica ${fullBot}x${top}. Escribe ${expectedResult}.`;
    }
    const sumTotal = top + bot + prevCarry;
    if (isExtraCol) return `Baja llevada: ${prevCarry}.`;
    return `Suma: ${prevCarry>0?prevCarry+'+':''}${top}+${bot} = ${expectedResult + expectedCarry*10}.`;
  }
  return "¡Vamos!";
});

// INTERACCIÓN
const handleKeypadPress = (num) => {
    if (!currentInputTask.value.id) return;
    const { expected, nextFn, id, exIdx } = currentInputTask.value;
    if (exIdx !== activeExerciseIndex.value) return;

    if (parseInt(num) === expected) {
        const el = document.getElementById(id); if (el) el.value = num;
        exercises.value[exIdx].inputs[id] = 'correct';
        nextTick(() => { if (nextFn) nextFn(); });
    } else {
        exercises.value[exIdx].inputs[id] = 'error';
        if (navigator.vibrate) navigator.vibrate(200);
    }
};

const handleDelete = () => {
    if (!currentInputTask.value.id) return;
    const { id, exIdx } = currentInputTask.value;
    const el = document.getElementById(id); if (el) el.value = '';
    delete exercises.value[exIdx].inputs[id];
};

const handleFocus = (exIdx, type, colIdx, rowId, expectedVal, nextFn) => {
  if (exercises.value[exIdx].completed) return;
  activeExerciseIndex.value = exIdx; 
  const newId = rowId ? getId(exIdx, `${rowId}-${colIdx}`) : getId(exIdx, `c${colIdx}-${type}`);
  currentInputTask.value = { expected: expectedVal, nextFn: nextFn, id: newId, exIdx };
  if (rowId) activeCell.value = { exIdx, type, colIdx, rowId };
  else activeCell.value = { exIdx, type, colIdx };
};

const prevExercise = () => { if(activeExerciseIndex.value > 0) { activeExerciseIndex.value--; autoFocusFirstCell(); } };
const nextExercise = () => { if(activeExerciseIndex.value < exercises.value.length - 1) { activeExerciseIndex.value++; autoFocusFirstCell(); } };
const resetExercises = () => { showConfetti.value = false; exercises.value = Array.from({ length: 5 }, (_, i) => generateRandomExercise(i)); activeExerciseIndex.value = 0; activeCell.value = null; currentInputTask.value = { expected: null, nextFn: null, id: null }; autoFocusFirstCell(); };
const getId = (exIdx, idStr) => `in-${exIdx}-${idStr}`;

const autoFocusFirstCell = () => {
  nextTick(() => {
    const idx = activeExerciseIndex.value; const ex = computedExercises.value[idx]; if (!ex) return;
    if (ex.isMultL2) {
        const col = ex.row1[0]; const nextFn = () => nextStepMultL2(idx, 'r1', 0, ex);
        handleFocus(idx, 'result', 0, 'r1', col.digit, nextFn); document.getElementById(getId(idx, 'r1-0'))?.focus();
    } else {
        const col0 = ex.processedCols[0]; const type = (props.operation === 'sub' && col0.showOval) ? 'carry' : 'result';
        const val = type === 'carry' ? col0.ovalValue : col0.expectedResult; const nextFn = () => nextStepStandard(idx, 0, type, ex);
        handleFocus(idx, type, 0, null, val, nextFn); document.getElementById(getId(idx, `c0-${type}`))?.focus();
    }
  });
};
onMounted(() => { autoFocusFirstCell(); });

const nextStepStandard = (exIdx, colIdx, type, currentEx) => {
    let nextId = null;
    if (type === 'result') {
        if (colIdx + 1 < currentEx.processedCols.length) {
            const nextCol = currentEx.processedCols[colIdx + 1];
            if (nextCol.showOval) nextId = getId(exIdx, `c${colIdx+1}-carry`); else nextId = getId(exIdx, `c${colIdx+1}-result`);
        } else { finishExercise(exIdx); return; }
    } else { nextId = getId(exIdx, `c${colIdx}-result`); }
    nextTick(() => { document.getElementById(nextId)?.focus(); });
};
const nextStepMultL2 = (exIdx, rowId, colIdx, exData) => {
    let nextId = null; let nextCol = colIdx + 1; 
    if (rowId === 'r1') { const rowData = exData.row1; if (nextCol < rowData.length && rowData[nextCol].prevCarry > 0) nextId = getId(exIdx, `oval-${nextCol}`); else if (nextCol < rowData.length) nextId = getId(exIdx, `r1-${nextCol}`); else { clearOvals(exIdx); nextId = getId(exIdx, `r2-1`); } } 
    else if (rowId === 'r2') { const rowData = exData.row2; const dataIdx = colIdx - 1; const nextDataIdx = dataIdx + 1; if (nextDataIdx < rowData.length && rowData[nextDataIdx].prevCarry > 0) nextId = getId(exIdx, `oval-${nextCol}`); else if (nextDataIdx < rowData.length) nextId = getId(exIdx, `r2-${nextCol}`); else { clearOvals(exIdx); nextId = getId(exIdx, `sum-0`); } }
    else if (rowId === 'sum') { const rowData = exData.sumRow; if (nextCol < rowData.length && rowData[nextCol].prevCarry > 0) nextId = getId(exIdx, `oval-${nextCol}`); else if (nextCol < rowData.length) nextId = getId(exIdx, `sum-${nextCol}`); else { finishExercise(exIdx); return; } }
    nextTick(() => { document.getElementById(nextId)?.focus(); });
};
const clearOvals = (exIdx) => { const keys = Object.keys(exercises.value[exIdx].inputs); keys.forEach(k => { if (k.includes('oval')) exercises.value[exIdx].inputs[k] = ''; }); const inputs = document.querySelectorAll(`input[id^="in-${exIdx}-oval"]`); inputs.forEach(el => el.value = ''); };
const finishExercise = (exIdx) => { exercises.value[exIdx].completed = true; if (exIdx === exercises.value.length - 1) { showConfetti.value = true; activeCell.value = null; currentInputTask.value = { id: null }; } else { setTimeout(() => { nextExercise(); }, 1000); } };
const isCellActive = (exIdx, colIdx, type, rowId) => { const active = activeCell.value; if (!active || active.exIdx !== exIdx) return false; if (active.type !== type) return false; if (rowId && active.rowId !== rowId) return false; return active.colIdx === colIdx; };

const getInputClass = (exIdx, id, type = 'normal') => {
  const status = exercises.value[exIdx].inputs[id];
  const isCompleted = exercises.value[exIdx].completed;
  let base = "text-center font-bold transition-all duration-200 outline-none ";
  
  if (type === 'oval') {
      if (props.operation === 'sub') base += "w-14 h-10 rounded-lg border-2 text-xl mb-1 ";
      else if (isMultLevel2.value) base += "w-8 h-8 rounded-full border-2 text-sm mb-0.5 "; // COMPACTO N2
      else base += "w-10 h-10 rounded-full border-2 text-lg mb-1 "; 
  } else {
      if (isMultLevel2.value) base += "w-9 h-11 rounded-md border-2 text-lg "; // COMPACTO N2
      else base += "w-14 h-16 rounded-xl border-2 text-3xl "; // GRANDE NORMAL
  }

  if (isCompleted) return base + "bg-green-100 border-green-300 text-green-700 opacity-90"; 
  if (status === 'correct') return base + "bg-green-100 border-green-500 text-green-800 shadow-md scale-105";
  if (status === 'error') return base + "bg-red-50 border-red-500 text-red-600 animate-shake";
  
  if (type === 'oval') return base + "bg-white border-red-200 text-red-500 placeholder-red-200 shadow-inner focus:ring-4 focus:ring-yellow-300 focus:border-yellow-400 focus:bg-yellow-50";
  return base + "bg-white border-slate-300 text-blue-700 border-dashed focus:ring-4 focus:ring-yellow-300 focus:border-yellow-500 focus:bg-yellow-50";
};

const opSymbol = computed(() => { if (props.operation === 'sub') return '-'; if (props.operation === 'mult') return 'x'; return '+'; });
</script>

<template>
  <div class="h-[100dvh] w-full bg-slate-100 flex flex-col overflow-hidden font-sans">
    <SimpleConfetti :isActive="showConfetti" />

    <div class="flex-none pt-2 px-4 pb-1 z-10 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm flex flex-col gap-1">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
                <button @click="$emit('back')" class="p-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs"><ChevronLeft class="inline w-4 h-4"/> Volver</button>
            </div>
            <div class="text-xs font-bold text-slate-400 uppercase tracking-widest">Ej {{ activeExerciseIndex + 1 }} / {{ exercises.length }}</div>
            <div class="flex gap-2">
                <button @click="resetExercises" class="p-2 rounded-full bg-blue-100 text-blue-600 shadow active:scale-95 transition"><RotateCcw :size="20" /></button>
                <button @click="nextExercise" :disabled="activeExerciseIndex === exercises.length - 1" class="p-2 rounded-full bg-white shadow text-slate-600 disabled:opacity-30 active:scale-95 transition"><ChevronRight /></button>
            </div>
        </div>
        <SmartGuide :currentAdvice="owlAdvice" />
    </div>

    <!-- 2. CUERPO (Fijo, Centrado y Expandido) -->
    <!-- AJUSTE: p-1, flex-grow y h-full en el contenedor amarillo para tocar bordes -->
    <div class="flex-1 flex flex-col items-center justify-center p-1 relative overflow-hidden bg-slate-50">
        <div v-if="currentExercise" :key="currentExercise.id" class="w-full max-w-md animate-slide-in flex-grow flex flex-col justify-center h-full">
             
             <div class="relative p-2 rounded-[1.5rem] transition-all duration-500 border-4 w-full shadow-lg bg-yellow-50 border-yellow-400 flex-grow flex flex-col justify-center items-center h-full"
                  :class="{ 'bg-green-50 border-green-300': currentExercise.completed }">
                
                <div class="absolute -top-4 -left-2 bg-white text-slate-700 font-black text-lg w-10 h-10 rounded-full flex items-center justify-center shadow-md border-2 border-slate-200">{{ activeExerciseIndex + 1 }}</div>

                <!-- MODO MULTIPLICACIÓN NIVEL 2 -->
                <div v-if="currentExercise.isMultL2" class="flex flex-col items-center w-full">
                    <div class="inline-flex flex-col items-end gap-0.5">
                        <div class="flex flex-row-reverse gap-0.5 mb-1">
                            <div v-for="i in currentExercise.gridIndices" :key="i" class="flex flex-col items-center">
                                <div class="h-8 flex items-end justify-center">
                                    <input v-if="i > 0" readonly inputmode="none" :id="getId(activeExerciseIndex, `oval-${i}`)" :class="[getInputClass(activeExerciseIndex, getId(activeExerciseIndex, `oval-${i}`), 'oval'), isCellActive(activeExerciseIndex, i, 'carry', activeCell?.rowId) ? 'ring-4 ring-yellow-400 border-yellow-500 bg-yellow-50' : '']" @focus="handleFocus(activeExerciseIndex, 'carry', i, activeCell?.rowId || 'r1', (activeCell?.rowId === 'r1' ? currentExercise.row1[i]?.prevCarry : (activeCell?.rowId === 'r2' ? currentExercise.row2[i-1]?.prevCarry : currentExercise.sumRow[i]?.prevCarry)), () => { const rId = activeCell?.rowId; const nextId = getId(activeExerciseIndex, `${rId}-${i}`); document.getElementById(nextId)?.focus(); })" />
                                </div>
                                <div :class="staticCellClass">{{ currentExercise.topDigits[i] !== undefined ? currentExercise.topDigits[i] : '' }}</div>
                            </div>
                        </div>
                        <div class="flex flex-row-reverse gap-0.5 border-b-4 border-slate-800 pb-1 mb-1 relative pr-0">
                            <span class="absolute right-full mr-2 top-0 text-xl font-black text-slate-400">x</span>
                            <div v-for="i in currentExercise.gridIndices" :key="i" :class="staticCellClass">{{ currentExercise.botDigits[i] !== undefined ? currentExercise.botDigits[i] : '' }}</div>
                        </div>
                        <div class="flex flex-row-reverse gap-0.5 mb-1">
                            <div v-for="i in currentExercise.gridIndices" :key="i">
                                <input v-if="currentExercise.row1[i]" readonly inputmode="none" :id="getId(activeExerciseIndex, `r1-${i}`)" :class="[getInputClass(activeExerciseIndex, getId(activeExerciseIndex, `r1-${i}`)), isCellActive(activeExerciseIndex, i, 'result', 'r1') ? 'ring-4 ring-yellow-200 border-yellow-400 bg-yellow-50' : '']" @focus="handleFocus(activeExerciseIndex, 'result', i, 'r1', currentExercise.row1[i].digit, () => nextStepMultL2(activeExerciseIndex, 'r1', i, currentExercise))" />
                                <div v-else class="w-9 h-11"></div>
                            </div>
                        </div>
                        <div class="flex flex-row-reverse gap-0.5 mb-1">
                            <div v-for="i in currentExercise.gridIndices" :key="i">
                                <div v-if="i === 0" class="w-9 h-11 border-2 border-dashed border-slate-200 rounded-md flex items-center justify-center text-slate-300 font-bold bg-slate-50">0</div>
                                <input v-else-if="currentExercise.row2[i-1]" readonly inputmode="none" :id="getId(activeExerciseIndex, `r2-${i}`)" :class="[getInputClass(activeExerciseIndex, getId(activeExerciseIndex, `r2-${i}`)), isCellActive(activeExerciseIndex, i, 'result', 'r2') ? 'ring-4 ring-yellow-200 border-yellow-400 bg-yellow-50' : '']" @focus="handleFocus(activeExerciseIndex, 'result', i, 'r2', currentExercise.row2[i-1].digit, () => nextStepMultL2(activeExerciseIndex, 'r2', i, currentExercise))" />
                                <div v-else class="w-9 h-11"></div>
                            </div>
                        </div>
                        <div class="w-full border-b-4 border-slate-300 mb-1"></div>
                        <div class="flex flex-row-reverse gap-0.5">
                            <div v-for="i in currentExercise.gridIndices" :key="i">
                                <input v-if="currentExercise.sumRow[i]" readonly inputmode="none" :id="getId(activeExerciseIndex, `sum-${i}`)" :class="[getInputClass(activeExerciseIndex, getId(activeExerciseIndex, `sum-${i}`)), isCellActive(activeExerciseIndex, i, 'result', 'sum') ? 'ring-4 ring-yellow-200 border-yellow-400 bg-yellow-50' : '']" @focus="handleFocus(activeExerciseIndex, 'result', i, 'sum', currentExercise.sumRow[i].digit, () => nextStepMultL2(activeExerciseIndex, 'sum', i, currentExercise))" />
                                <div v-else class="w-9 h-11"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- MODO ESTÁNDAR (NORMAL) -->
                <div v-else class="flex flex-row-reverse justify-center" :class="gridGapClass">
                    <div v-for="col in currentExercise.processedCols" :key="col.colIdx" class="flex flex-col items-center gap-0.5">
                        <div class="h-10 flex items-end justify-center mb-0.5">
                            <input v-if="col.showOval" readonly inputmode="none" :id="getId(activeExerciseIndex, `c${col.colIdx}-carry`)" :class="[getInputClass(activeExerciseIndex, getId(activeExerciseIndex, `c${col.colIdx}-carry`), 'oval'), isCellActive(activeExerciseIndex, col.colIdx, 'carry') ? 'ring-4 ring-yellow-300 border-yellow-500 bg-yellow-50' : '']" @focus="handleFocus(activeExerciseIndex, 'carry', col.colIdx, null, col.ovalValue, () => nextStepStandard(activeExerciseIndex, col.colIdx, 'carry', currentExercise))" />
                        </div>
                        <div :class="staticCellClass">{{ col.isExtraCol ? '' : col.top }}</div>
                        <div :class="staticCellClass" class="border-b-[5px] border-slate-800 relative">
                            <span v-if="col.colIdx === currentExercise.totalCols - 1 && !col.isExtraCol" class="absolute -left-6 top-1 text-2xl text-slate-400 font-black">{{ opSymbol }}</span>
                            {{ col.isExtraCol ? '' : (props.operation === 'mult' ? (col.colIdx === 0 ? col.fullBot : '') : col.bot) }}
                        </div>
                        <input readonly inputmode="none" :id="getId(activeExerciseIndex, `c${col.colIdx}-result`)" :class="[getInputClass(activeExerciseIndex, getId(activeExerciseIndex, `c${col.colIdx}-result`)), isCellActive(activeExerciseIndex, col.colIdx, 'result') ? 'ring-4 ring-yellow-200 border-yellow-400 bg-yellow-50' : '']" @focus="handleFocus(activeExerciseIndex, 'result', col.colIdx, null, col.expectedResult, () => nextStepStandard(activeExerciseIndex, col.colIdx, 'result', currentExercise))" />
                    </div>
                </div>

             </div>
        </div>
    </div>

    <!-- 3. TECLADO -->
    <div class="flex-none bg-white z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <VirtualKeypad @press="handleKeypadPress" @delete="handleDelete" />
    </div>
  </div>
</template>

<style scoped>
.animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
@keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
input { cursor: pointer; caret-color: transparent; }
</style>