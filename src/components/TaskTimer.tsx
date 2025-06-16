import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TaskTimerProps {
  isActive: boolean;
  onTimeUpdate?: (seconds: number) => void;
}

const TaskTimer: React.FC<TaskTimerProps> = ({ isActive, onTimeUpdate }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(prev => {
          const newSeconds = prev + 1;
          onTimeUpdate?.(newSeconds);
          return newSeconds;
        });
      }, 1000);
    } else {
      if (interval) {
        clearInterval(interval);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, onTimeUpdate]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-black bg-opacity-70 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
      <Clock size={16} />
      <span>Time: {formatTime(seconds)}</span>
    </div>
  );
};

export default TaskTimer;
