import React, { useEffect, useState } from 'react';
import { FaClock } from 'react-icons/fa';
import './Timer.css';

interface TimerProps {
    startTime: string | Date | undefined;
}

/**
 * A reusable timer component that shows elapsed time since a specific start time
 * 
 * @param startTime The starting time to measure from (string or Date object)
 * @returns A component displaying the elapsed time in HH:MM:SS format
 */
export const Timer = ({ startTime }: TimerProps): JSX.Element => {
    const [elapsedTime, setElapsedTime] = useState<string>("--:--");
    
    useEffect(() => {
        if (!startTime) {
            setElapsedTime("--:--");
            return;
        }
        
        // Calculate initial elapsed time
        const startDate = new Date(startTime);
        const updateElapsedTime = () => {
            const now = new Date();
            const diffMs = now.getTime() - startDate.getTime();
            
            // Format time as HH:MM:SS
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            
            setElapsedTime(
                `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        };
        
        // Update elapsed time immediately
        updateElapsedTime();
        
        // Set up interval to update elapsed time every second
        const interval = setInterval(updateElapsedTime, 1000);
        
        // Clear interval on component unmount
        return () => clearInterval(interval);
    }, [startTime]);
    
    return (
        <div className="timer">
            <FaClock className="timer-icon" />
            <span>{elapsedTime}</span>
        </div>
    );
};

export default Timer;
