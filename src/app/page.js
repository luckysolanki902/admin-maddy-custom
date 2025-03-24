'use client';
import { SignedIn, SignedOut } from "@clerk/nextjs";
import NotSignedIn from "@/components/full-page-comps/NotSignedIn";
import Header from '@/components/page-sections/home/Header';
import StatusContainer from '@/components/page-sections/home/StatusContainer';
import DepartmentLinks from "@/components/page-sections/home/DepartmentLinks";
import styles from './page.module.css';
import Target from '@/components/page-sections/home/Target';

export default function Home() {
  return (
    <>
      <SignedOut>
        <NotSignedIn />
      </SignedOut>
      <SignedIn>
        <div className={styles.container}>
          <Header />
          <Target
            minValue="6.5"
            maxValue="7"
            month="03"
            year="2025"
            deadlineRaw="2025-03-31"
            partyIconUrl="assets/icons/party.png"
          />
          <StatusContainer />
          <DepartmentLinks />
        </div>
      </SignedIn>
    </>
  );
}
