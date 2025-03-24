'use client';
import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import Confetti from 'react-confetti';
import Image from 'next/image';
import styles from './styles/target.module.css';

/**
 * A standalone card component that:
 * - Fetches current revenue & end date from /api/admin/analytics/month-revenue
 * - Displays minValue - maxValue (in Lakh)
 * - Displays the "current revenue" in Lakh
 * - Shows a countdown timer until the end date
 * - Shows a confetti animation + sound if currentRevenue > minValue
 * - Stops confetti + fades out music after 10s
 * - Hides the card if the deadline is already in the past
 */
const Target = ({
  minValue = '6.5',
  maxValue = '7',
  month = '03',         // e.g. "03"
  year = '2025',        // e.g. "2025"
  deadlineRaw = '2025-03-31',
  partyIconUrl = 'assets/icons/party.png'
}) => {
  // State
  const [currentRevenue, setCurrentRevenue] = useState('0');
  const [showConfetti, setShowConfetti] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: '000', minutes: '00', seconds: '00' });

  // We'll store the audio object in a ref so we can stop/fade it later
  const audioRef = useRef(null);

  // Convert the raw string to a dayjs date
  const deadline = dayjs(deadlineRaw);

  // 1) Fetch current revenue from the API
  useEffect(() => {
    async function fetchRevenueData() {
      try {
        const res = await fetch(`/api/admin/analytics/month-revenue?month=${month}&year=${year}`);
        if (!res.ok) {
          console.error('Failed to fetch revenue data');
          return;
        }
        const data = await res.json();
        // Convert the revenue to "lakh" if desired (assuming 1 lakh = 100000)
        const revenueInLakh = (data.currentRevenue / 100000).toFixed(2);
        setCurrentRevenue(revenueInLakh);
      } catch (error) {
        console.error('Error fetching revenue:', error);
      }
    }
    fetchRevenueData();
  }, [month, year]);

  // 2) Handle confetti + sound if currentRevenue > minValue
  useEffect(() => {
    const revenueNum = parseFloat(currentRevenue);
    const minValNum = parseFloat(minValue);

    if (revenueNum > minValNum) {
      setShowConfetti(true);

      // Play sound (ensure your .mp3 file is in the correct public path)
      const audio = new Audio(`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}/assets/audio/party-music.mp3`);
      audioRef.current = audio;
      audio.volume = 1.0; // start at full volume
      audio.play().catch(err => console.error('Audio play error:', err));

      // After 10 seconds, fade out music and stop confetti
      const stopTimeout = setTimeout(() => {
        // Fade out music over ~2 seconds by reducing volume every 200ms
        let fadeInterval = setInterval(() => {
          if (audio.volume > 0.1) {
            audio.volume -= 0.1;
          } else {
            audio.volume = 0;
            clearInterval(fadeInterval);
            audio.pause();
            audio.currentTime = 0;
          }
        }, 200);

        setShowConfetti(false);
      }, 10000);

      return () => {
        clearTimeout(stopTimeout);
      };
    } else {
      setShowConfetti(false);
    }
  }, [currentRevenue, minValue]);

  // 3) Countdown timer
  useEffect(() => {
    if (!deadline.isValid()) return;

    const interval = setInterval(() => {
      const now = dayjs();
      const diff = deadline.diff(now);

      if (diff <= 0) {
        // Deadline has passed
        setTimeLeft({ hours: '000', minutes: '00', seconds: '00' });
        clearInterval(interval);
      } else {
        const totalSeconds = Math.floor(diff / 1000);
        const hrs = Math.floor(totalSeconds / 3600);
        const remainderSec = totalSeconds % 3600;
        const mins = Math.floor(remainderSec / 60);
        const secs = remainderSec % 60;

        const hoursStr = String(hrs).padStart(3, '0');
        const minutesStr = String(mins).padStart(2, '0');
        const secondsStr = String(secs).padStart(2, '0');

        setTimeLeft({ hours: hoursStr, minutes: minutesStr, seconds: secondsStr });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  // 4) Hide the card if the deadline is in the past
  if (deadline.isValid() && dayjs().isAfter(deadline)) {
    return null;
  }

  // Format the deadline date as M/D/YYYY
  const dateString = deadline.isValid() ? deadline.format('M/D/YYYY') : '...';

  // 5) For confetti sizing (avoid SSR issues by checking typeof window)
  const width = typeof window !== 'undefined' ? window.innerWidth : 800;
  const height = typeof window !== 'undefined' ? window.innerHeight : 600;

  return (
    <div className={styles.container}>
      {/* Confetti if showConfetti is true */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={true}   // Keep it going for the 10s
          numberOfPieces={400}
          gravity={0.2}
        />
      )}

      <div className={styles.card}>
        {/* The range text, e.g. "6.5 - 7" */}
        <div className={styles.range}>
          <div>
            {minValue}
          </div>
          <div>
            -
          </div>
          <div className={styles.maxValue}>
            {maxValue} Lakhs
          </div>
        </div>

        {/* The current revenue text, e.g. "Current revenue 4.89 lakh" */}
        <div className={styles.currentRevenue}>
          <span style={{ marginRight: '1rem' }}>Current revenue</span> {currentRevenue === 0 ? '???' : currentRevenue} lakhs
        </div>

        {/* The date, e.g. "3/13/2025" */}
        <div className={styles.date}>
          {dateString}
        </div>

        {/* Timer: 000 00 00 */}
        <div className={styles.timer}>
          <div className={styles.timerSegment}>{timeLeft.hours}</div>
          <div className={styles.timerSegment}>{timeLeft.minutes}</div>
          <div className={styles.timerSegment}>{timeLeft.seconds}</div>
        </div>

        {/* Party icon in the bottom-left corner */}
        <Image
          width={250}
          height={250}
          className={styles.partyIcon}
          src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}/${partyIconUrl}`}
          alt="Party Icon"
        />
      </div>
    </div>
  );
};

export default Target;
