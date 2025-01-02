import React from 'react';
import styles from './styles/department-homepage.module.css';
import Link from 'next/link';

export default function DepartmentHomePage({ department = 'Marketing', quote, options }) {
    const colorMap = {
        Marketing: 'rgb(255, 240, 28)',
        Design: 'rgb(28, 251, 255)',
        Web: 'rgb(255, 58, 97)',
        Production: 'rgb(255, 255, 255)',
        Admin: 'rgb(11, 162, 101)',
    };

    // Utility function to convert RGB to RGBA
    const convertRgbToRgba = (rgb, alpha) => {
        // Extract the numbers inside the RGB string
        const [r, g, b] = rgb.match(/\d+/g).map(Number);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const alpha = 0.3; // Set your desired opacity

    return (
        <div className={styles.main}>

            <div className={styles.container}>
                <h1 className={styles.title}>{department}</h1>
                <p className={styles.quote} style={{ color: colorMap[department === 'Web-d'?'Web' : department] }}>
                    {quote}
                </p>
                <div className={styles.optionsDiv}>
                    {options?.map((option, index) => {
                        const boxShadowColor = convertRgbToRgba(colorMap[department === 'Web-d'?'Web' : department], alpha);
                        return (
                            <Link
                                key={index}
                                href={option.link}
                                className={styles.option}
                                style={{ boxShadow: ` 0px 0px 13px 0px ${boxShadowColor}` }}
                            >
                                {option.text}
                            </Link>
                        );
                    })}
                    {department === 'Web-d' &&
                        <Link
                            href={'#'}
                            className={styles.option}
                            style={{ boxShadow: ` 0px 0px 13px 0px ${convertRgbToRgba('rgb(255, 58, 97)', alpha)}` }}
                        >
                            Open Vs Code ;&#41;
                        </Link>}
                </div>

                {department !== 'Web-d' && <div className={styles.comingsoon}>More Coming Soon...</div>}
            </div>
        </div>
    );
}
