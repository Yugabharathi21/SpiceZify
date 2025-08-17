import { useRef, useEffect, useState } from 'react';

interface MusicVisualizerProps {
  audioElement: HTMLAudioElement;
  style?: 'bars' | 'wave' | 'circle' | 'particles';
}

export default function MusicVisualizer({ audioElement, style = 'bars' }: MusicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!audioElement || !canvasRef.current) return;

    const initializeAudioContext = async () => {
      try {
        // Create audio context and analyser
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        
        // Connect audio element to analyser
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        // Configure analyser
        analyser.fftSize = 512;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength) as Uint8Array;

        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        setIsInitialized(true);

        console.log('🎤 Audio visualizer initialized');
      } catch (error) {
        console.error('Failed to initialize audio visualizer:', error);
      }
    };

    initializeAudioContext();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioElement]);

  useEffect(() => {
    if (!isInitialized || !analyserRef.current || !dataArrayRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const bufferLength = dataArray.length;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Clear canvas with gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (style === 'bars') {
        drawBars(ctx, canvas, dataArray, bufferLength);
      } else if (style === 'wave') {
        drawWave(ctx, canvas, dataArray, bufferLength);
      } else if (style === 'circle') {
        drawCircle(ctx, canvas, dataArray, bufferLength);
      } else if (style === 'particles') {
        drawParticles(ctx, canvas, dataArray, bufferLength);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isInitialized, style]);

  const drawBars = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataArray: Uint8Array, bufferLength: number) => {
    const barWidth = canvas.width / bufferLength * 4;
    let barHeight: number;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      gradient.addColorStop(0, `hsl(${(i / bufferLength) * 360 + 200}, 100%, 70%)`);
      gradient.addColorStop(0.5, `hsl(${(i / bufferLength) * 360 + 280}, 80%, 60%)`);
      gradient.addColorStop(1, `hsl(${(i / bufferLength) * 360 + 320}, 60%, 40%)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

      x += barWidth;
    }
  };

  const drawWave = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataArray: Uint8Array, bufferLength: number) => {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00ff88';
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // Add glow effect
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  const drawCircle = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataArray: Uint8Array, bufferLength: number) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.2;

    ctx.lineWidth = 2;

    for (let i = 0; i < bufferLength; i++) {
      const amplitude = dataArray[i] / 255;
      const angle = (i / bufferLength) * Math.PI * 2;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + amplitude * 100);
      const y2 = centerY + Math.sin(angle) * (radius + amplitude * 100);

      const hue = (i / bufferLength) * 360;
      ctx.strokeStyle = `hsl(${hue}, 100%, ${50 + amplitude * 50}%)`;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataArray: Uint8Array, bufferLength: number) => {
    const particleCount = 100;
    
    for (let i = 0; i < particleCount; i++) {
      const dataIndex = Math.floor((i / particleCount) * bufferLength);
      const amplitude = dataArray[dataIndex] / 255;
      
      const x = (i / particleCount) * canvas.width;
      const y = canvas.height / 2 + (Math.sin(Date.now() * 0.001 + i * 0.1) * amplitude * 200);
      const size = amplitude * 8 + 1;
      
      const hue = (i / particleCount) * 360;
      ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${amplitude})`;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
