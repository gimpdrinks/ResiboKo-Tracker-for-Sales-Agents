import React, { useRef, useEffect, useState, useCallback } from 'react';
import Spinner from './Spinner';

interface CameraCaptureProps {
    onClose: () => void;
    onCapture: (file: File) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("Could not access the camera. Please ensure permissions are granted and try again.");
                setIsLoading(false);
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCanPlay = () => {
        setIsLoading(false);
    }

    const handleCapture = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                        onCapture(file);
                    }
                }, 'image/jpeg', 0.95);
            }
        }
    }, [onCapture]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            onClose();
          }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
            {isLoading && !error && (
                 <div className="text-white text-center">
                    <Spinner className="w-12 h-12 mx-auto" />
                    <p className="mt-4">Starting camera...</p>
                </div>
            )}
            {error && (
                <div className="text-white text-center p-8">
                    <p className="text-xl font-bold text-red-500">Camera Error</p>
                    <p className="mt-2">{error}</p>
                     <button
                        onClick={onClose}
                        className="mt-6 px-6 py-2 bg-slate-700 text-white rounded-lg font-semibold"
                    >
                        Close
                    </button>
                </div>
            )}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                onCanPlay={handleCanPlay}
                className={`w-full h-full object-cover ${isLoading || error ? 'hidden' : 'block'}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {!isLoading && !error && (
                <>
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center bg-black/50 text-white rounded-full text-2xl font-bold"
                            aria-label="Close camera"
                        >
                            &times;
                        </button>
                    </div>

                    <div className="absolute bottom-8 flex justify-center w-full">
                        <button
                            onClick={handleCapture}
                            className="w-20 h-20 bg-white rounded-full border-4 border-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500"
                            aria-label="Take picture"
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default CameraCapture;
