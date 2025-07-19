import React from 'react';
import styles from './styles/department-homepage.module.css';
import Link from 'next/link';

export default function DepartmentHomePage({ department = 'Marketing', quote, options }) {
    const colorMap = {
        Marketing: 'rgb(255, 220, 100)',
        Design: 'rgb(28, 251, 255)',
        Web: 'rgb(255, 58, 97)',
        Production: 'rgb(255, 255, 255)',
        Admin: 'rgb(11, 162, 101)',
        Finance: 'rgb(11, 162, 101)',
    };

    // Utility function to convert RGB to RGBA
    const convertRgbToRgba = (rgb, alpha) => {
        const [r, g, b] = rgb.match(/\d+/g).map(Number);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const themeColor = colorMap[department === 'Web-d' ? 'Web' : department];
    const glowColor = convertRgbToRgba(themeColor, 0.15);
    const borderColor = convertRgbToRgba(themeColor, 0.3);
    const hoverGlow = convertRgbToRgba(themeColor, 0.25);

    return (
        <div className={styles.main}>
            <div className={styles.container}>
                {/* Header Section */}
                <div className={styles.header}>
                    <div 
                        className={styles.titleContainer}
                        style={{ 
                            background: `linear-gradient(135deg, ${glowColor}, transparent)`,
                            borderColor: borderColor,
                            '--theme-color': themeColor,
                            '--glow-color': glowColor
                        }}
                    >
                        <h1 className={styles.title}>
                            {department}
                        </h1>
                        <p className={styles.quote}>
                            {quote}
                        </p>
                    </div>
                </div>

                {/* Options Grid */}
                <div className={styles.optionsGrid}>
                    {options?.map((option, index) => (
                        <Link
                            key={index}
                            href={option.link}
                            className={styles.optionCard}
                            style={{ 
                                '--theme-color': themeColor,
                                '--glow-color': glowColor,
                                '--border-color': borderColor,
                                '--hover-glow': hoverGlow
                            }}
                        >
                            <div className={styles.cardContent}>
                                <div className={styles.cardNumber}>
                                    {String(index + 1).padStart(2, '0')}
                                </div>
                                <div className={styles.cardText}>
                                    {option.text}
                                </div>
                                <div className={styles.cardArrow}>→</div>
                            </div>
                        </Link>
                    ))}
                    
                    {department === 'Web-d' && (
                        <Link
                            href={'#'}
                            className={styles.optionCard}
                            style={{ 
                                '--theme-color': 'rgb(255, 58, 97)',
                                '--glow-color': convertRgbToRgba('rgb(255, 58, 97)', 0.15),
                                '--border-color': convertRgbToRgba('rgb(255, 58, 97)', 0.3),
                                '--hover-glow': convertRgbToRgba('rgb(255, 58, 97)', 0.25)
                            }}
                        >
                            <div className={styles.cardContent}>
                                <div className={styles.cardNumber}>
                                    {String((options?.length || 0) + 1).padStart(2, '0')}
                                </div>
                                <div className={styles.cardText}>
                                    Open VS Code
                                </div>
                                <div className={styles.cardArrow}>→</div>
                            </div>
                        </Link>
                    )}
                </div>

                {/* Footer */}
                {department !== 'Web-d' && (
                    <div className={styles.footer}>
                        <div 
                            className={styles.comingSoon}
                            style={{ 
                                color: convertRgbToRgba(themeColor, 0.7),
                                borderColor: convertRgbToRgba(themeColor, 0.2)
                            }}
                        >
                            More features coming soon...
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
