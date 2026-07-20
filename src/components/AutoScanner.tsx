import React, { useEffect, useRef, useState } from 'react';
import { createWorker, Worker } from 'tesseract.js';
import { MonitorPlay, StopCircle, Scan, AlertCircle } from 'lucide-react';

export default function AutoScanner({
  onNumberDetected,
}: {
  onNumberDetected: (num: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [status, setStatus] = useState('Initializing OCR Engine...');
  const [scanBox, setScanBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [lastScanned, setLastScanned] = useState<number | null>(null);
  const [videoInfo, setVideoInfo] = useState({ w: 0, h: 0 });

  const lastScannedRef = useRef<number | null>(null);
  const onNumberDetectedRef = useRef(onNumberDetected);

  useEffect(() => {
    onNumberDetectedRef.current = onNumberDetected;
  }, [onNumberDetected]);

  useEffect(() => {
    let w: Worker | null = null;
    const init = async () => {
      try {
        w = await createWorker('eng');
        await w.setParameters({
          tessedit_char_whitelist: '0123456789',
        });
        setWorker(w);
        setStatus('Ready! Share a screen or tab to start.');
      } catch (error) {
        console.error('Failed to init Tesseract:', error);
        setStatus('Error initializing OCR.');
      }
    };
    init();
    return () => {
      if (w) w.terminate();
    };
  }, []);

  const startShare = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in this environment. Please open the app in a new tab.');
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsSharing(true);
      setStatus('Waiting for you to select the scan area...');

      stream.getVideoTracks()[0].onended = () => {
        stopShare();
      };
    } catch (error: any) {
      console.error(error);
      if (error.message.includes('not supported') || error.message.includes('getDisplayMedia is not a function')) {
        setStatus('⚠️ Auto-scan requires screen sharing. Please open this app in a NEW TAB to enable it.');
      } else {
        setStatus('Screen sharing was denied or failed.');
      }
    }
  };

  const stopShare = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsSharing(false);
    setScanBox(null);
    setStatus('Ready! Share a screen or tab to start.');
  };

  const handleLoadedData = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setVideoInfo({
      w: e.currentTarget.videoWidth,
      h: e.currentTarget.videoHeight,
    });
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!videoRef.current || videoInfo.w === 0) return;
    const rect = videoRef.current.getBoundingClientRect();
    const scaleX = videoInfo.w / rect.width;
    const scaleY = videoInfo.h / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 140x140 area just to be safe it catches the number
    setScanBox({
      x: Math.max(0, clickX - 70),
      y: Math.max(0, clickY - 70),
      width: 140,
      height: 140,
    });
    setStatus('Scan area set. Analyzing every 3 seconds...');
  };

  useEffect(() => {
    let interval: number;
    if (isSharing && scanBox && worker) {
      interval = window.setInterval(async () => {
        if (!canvasRef.current || !videoRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        canvasRef.current.width = scanBox.width;
        canvasRef.current.height = scanBox.height;

        ctx.drawImage(
          videoRef.current,
          scanBox.x,
          scanBox.y,
          scanBox.width,
          scanBox.height,
          0,
          0,
          scanBox.width,
          scanBox.height
        );

        try {
          const { data } = await worker.recognize(canvasRef.current);
          const text = data.text.replace(/[^0-9]/g, '');

          if (text) {
            const num = parseInt(text, 10);
            if (!isNaN(num) && num >= 0 && num <= 36) {
              if (num !== lastScannedRef.current) {
                lastScannedRef.current = num;
                setLastScanned(num);
                onNumberDetectedRef.current(num);
              }
            }
          }
        } catch (err) {
          console.error('OCR Error:', err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSharing, scanBox, worker]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-neutral-400 flex items-center gap-2">
          <Scan className="w-4 h-4" />
          Auto Scanner Mode
        </h2>
        {!isSharing ? (
          <button
            disabled={!worker}
            onClick={startShare}
            className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <MonitorPlay className="w-4 h-4" />
            Select Window to Scan
          </button>
        ) : (
          <button
            onClick={stopShare}
            className="flex items-center gap-2 bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-colors cursor-pointer"
          >
            <StopCircle className="w-4 h-4" />
            Stop Scan
          </button>
        )}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="text-xs text-emerald-500 mb-3 ml-1 uppercase tracking-wide font-semibold">{status}</div>

        {isSharing && (
          <div className="relative border border-neutral-800 bg-black rounded-xl overflow-hidden group">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedData={handleLoadedData}
              onClick={handleVideoClick}
              className="w-full max-h-[400px] object-contain cursor-crosshair"
            />
            {!scanBox && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/40">
                <div className="text-white text-sm font-medium flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur">
                  <AlertCircle className="w-4 h-4 text-emerald-400" />
                  Click on the video exactly where the number appears
                </div>
              </div>
            )}
            {scanBox && videoInfo.w > 0 && (
              <div
                className="absolute border-2 border-emerald-500 bg-emerald-500/10 pointer-events-none animate-pulse shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
                style={{
                  left: `${(scanBox.x / videoInfo.w) * 100}%`,
                  top: `${(scanBox.y / videoInfo.h) * 100}%`,
                  width: `${(scanBox.width / videoInfo.w) * 100}%`,
                  height: `${(scanBox.height / videoInfo.h) * 100}%`,
                }}
              />
            )}
          </div>
        )}

        {scanBox && (
          <div className="mt-4 flex items-center gap-6 border-t border-neutral-800 pt-4">
            <div>
              <div className="text-xs text-neutral-500 mb-2 uppercase font-semibold">Live Crop</div>
              <div className="w-[100px] h-[100px] border border-neutral-700 rounded-xl overflow-hidden bg-black flex items-center justify-center relative ring-1 ring-white/10 shadow-xl">
                <canvas ref={canvasRef} className="w-full h-full object-contain" />
              </div>
            </div>
            {lastScanned !== null && (
              <div>
                <div className="text-xs text-emerald-500 mb-2 uppercase font-semibold">Last Match</div>
                <div className="text-4xl font-bold text-white bg-neutral-950 px-6 py-4 rounded-xl border border-neutral-800 flex items-center justify-center">
                  {lastScanned}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
