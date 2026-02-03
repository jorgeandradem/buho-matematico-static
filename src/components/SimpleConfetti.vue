<script setup>
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps({
  isActive: Boolean
});

const canvasRef = ref(null);
let animationId = null;
let particles = [];
const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

const createParticles = (canvas) => {
  particles = [];
  for (let i = 0; i < 200; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      vx: Math.random() * 4 - 2,
      vy: Math.random() * 5 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 5 + 2
    });
  }
};

const animate = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.y > canvas.height) p.y = -10;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  
  animationId = requestAnimationFrame(animate);
};

watch(() => props.isActive, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      const canvas = canvasRef.value;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        createParticles(canvas);
        animate();
        // Detener a los 5 segundos
        setTimeout(() => {
          if(animationId) cancelAnimationFrame(animationId);
          if(canvas) {
            const ctx = canvas.getContext('2d');
            if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }, 5000);
      }
    }, 100);
  } else {
    if (animationId) cancelAnimationFrame(animationId);
  }
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
});
</script>

<template>
  <canvas 
    v-if="isActive" 
    ref="canvasRef" 
    class="fixed inset-0 pointer-events-none z-[100]"
  ></canvas>
</template>