// Generador de sonido de Búho usando Web Audio API (Funciona Offline)
export const playOwlHoot = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const t = ctx.currentTime;

    // Función auxiliar para crear un "Hoot"
    const createHoot = (startTime, duration, startFreq, endFreq, maxVol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine'; // Onda senoidal (suave y pura)
        
        // Tono: Empieza agudo y baja serenamente
        osc.frequency.setValueAtTime(startFreq, startTime); 
        osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

        // Volumen: Curva suave (Entrada - Sostenido - Salida)
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(maxVol, startTime + (duration * 0.2)); // Attack
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Release

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
    };

    // Secuencia: "Huuu... Huuuuu"
    // Nota: Volumen bajo (0.15) para no molestar la voz
    createHoot(t, 0.4, 550, 400, 0.15);       // Primer hoot corto
    createHoot(t + 0.5, 0.6, 500, 350, 0.12); // Segundo hoot largo y sereno

  } catch (e) {
    console.error("El búho está afónico:", e);
  }
};