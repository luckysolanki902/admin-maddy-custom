'use client';
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TextField from '@mui/material/TextField';
import styles from './page.module.css';
import NotSignedIn from "@/components/full-page-comps/NotSignedIn";
import { Button } from "@mui/material";

export default function Home() {
  const [clickSequence, setClickSequence] = useState([]);
  const [textFieldVisible, setTextFieldVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [masterAdminVisible, setMasterAdminVisible] = useState(true);

  const correctSequence = ["Love", "Your", "Work"];
  const masterAdminPassword = process.env.NEXT_PUBLIC_MASTER_ADMIN_PASS;

  // Load masterAdminVisible from localStorage on component mount
  useEffect(() => {
    const isMasterAdmin = localStorage.getItem('isMasterAdmin');
    if (isMasterAdmin === 'true') {
      setMasterAdminVisible(true);
    }
  }, []);

  // Handle heading clicks to build the click sequence
  const handleHeadingClick = (word) => {
    
    setClickSequence((prevSequence) => {
      const newSequence = [...prevSequence, word];

      if (newSequence.length <= correctSequence.length) {
        const isMatch = newSequence.every((val, index) => val === correctSequence[index]);
        if (isMatch && newSequence.length === correctSequence.length && !masterAdminVisible) {
          setTextFieldVisible(true); // Show text field when the sequence is completed
        }
      } else {
        return [];
      }

      return newSequence;
    });
  };

  // Handle input changes in the TextField
  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  // Handle key presses in the TextField
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      // Handle password submission when Enter is pressed
      if (inputValue === masterAdminPassword) {
        setMasterAdminVisible(true); // Reveal Master Admin link
        setTextFieldVisible(false); // Hide the text field
        localStorage.setItem('isMasterAdmin', 'true'); // Persist state in localStorage
      } else {
        alert('Incorrect password');
      }
    }
  };

  // Optional: Handle logout to clear master admin state
  const handleLogout = () => {
    setMasterAdminVisible(false);
    localStorage.removeItem('isMasterAdmin');
  };

  return (
    <>
      <SignedOut>
        <NotSignedIn />
      </SignedOut>
      <SignedIn>
        <div className={styles.container}>
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
                onKeyDown={handleKeyDown} // Listen for Enter key
                fullWidth
                sx={{ mb: 5, mt: 5 }}
                className={styles.heading}
                type="password"
              />
            </div>
          )}

          {!textFieldVisible && <p className={styles.subheading} style={{ fontStyle: 'italic' }}>life is too short to hate it</p>}

          <div className={styles.grid}>
            <Link href="/admin/departments/marketing" className={styles.box} style={{ boxShadow: '0px 0px 11.34px rgba(255, 255, 0, 0.4)' }}>Marketing</Link>
            <Link href="/admin/departments/design" className={styles.box} style={{ boxShadow: '0px 0px 11.34px rgba(0, 255, 229, 0.4)' }}>Design </Link>
            <Link href="/admin/departments/web-d" className={styles.box} style={{ boxShadow: '0px 0px 11.34px rgba(255, 89, 144, 0.4)' }}>Web-Dev</Link>
            <Link href="/admin/departments/production" className={styles.box} style={{ boxShadow: '0px 0px 11.34px rgba(255, 255, 255, 0.4)' }}>Production</Link>
            {masterAdminVisible && (
              <>
                <Link href="/admin/access-management" className={styles.box} style={{ boxShadow: '0px 0px 11.34px rgba(78, 161, 211, 0.4)' }}>
                  Master Admin 
                </Link>
                {/* <Button  className={styles.box} style={{ boxShadow: '0px 0px 11.34px rgba(255, 255, 255, 0.4)' }} onClick={handleLogout}>
                  Logout
                </Button> */}
              </>
            )}
          </div>

        </div>
      </SignedIn>
    </>
  );
}
