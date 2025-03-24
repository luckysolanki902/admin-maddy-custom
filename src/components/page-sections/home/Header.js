'use client';
import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import styles from './styles/Header.module.css'; // Create this CSS module as needed

const correctSequence = ["Love", "Your", "Work"];

const Header = () => {
  const [clickSequence, setClickSequence] = useState([]);
  const [textFieldVisible, setTextFieldVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const masterAdminPassword = process.env.NEXT_PUBLIC_MASTER_ADMIN_PASS;

  const handleHeadingClick = (word) => {
    setClickSequence((prevSequence) => {
      const newSequence = [...prevSequence, word];
      if (newSequence.length <= correctSequence.length) {
        const isMatch = newSequence.every((val, index) => val === correctSequence[index]);
        if (isMatch && newSequence.length === correctSequence.length) {
          setTextFieldVisible(true);
        }
      } else {
        return [];
      }
      return newSequence;
    });
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      if (inputValue === masterAdminPassword) {
        localStorage.setItem('isMasterAdmin', 'true');
        setTextFieldVisible(false);
      } else {
        alert('Incorrect password');
      }
    }
  };

  return (
    <div className={styles.headerContainer}>
      {!textFieldVisible ? (
        <h1 className={styles.heading}>
          <span onClick={() => handleHeadingClick("Love")} className={styles.love}>Love </span>
          <span onClick={() => handleHeadingClick("Your")} className={styles.your}>your </span>
          <span onClick={() => handleHeadingClick("Work")} className={styles.work}>work</span>
        </h1>
      ) : (
        <div className={styles.inputContainer}>
          <TextField
            label="Enter Password"
            variant="outlined"
            value={inputValue}
            autoFocus
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            fullWidth
            type="password"
          />
        </div>
      )}
      {!textFieldVisible && <p className={styles.subheading}>life is too short to hate it</p>}
    </div>
  );
};

export default Header;
