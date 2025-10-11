"use client";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import NotSignedIn from "@/components/full-page-comps/NotSignedIn";
import Header from "@/components/page-sections/home/Header";
import StatusContainer from "@/components/page-sections/home/StatusContainer";
import DepartmentLinks from "@/components/page-sections/home/DepartmentLinks";
import SiteUpdatesSection from "@/components/page-sections/home/SiteUpdatesSection";
import styles from "./page.module.css";
// import Target from '@/components/page-sections/home/Target';
// import RecentCommits from "@/components/page-sections/home/RecentCommits";
import { Button } from "@mui/material";
import { useRouter } from "next/navigation";
import FloatingButton from "@/components/productivity/FloatingButton";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function Home() {
  const router = useRouter();
  return (
    <>
      <SignedOut>
        <NotSignedIn />
      </SignedOut>
      <SignedIn>
        <FloatingButton />
        <div className={styles.container}>
          <Header />
          {/* <Target
            minValue="6.5"
            maxValue="7"
            month="03"
            year="2025"
            deadlineRaw="2025-04-01"
            partyIconUrl="assets/icons/party.png"
          /> */}

          <StatusContainer />
          <DepartmentLinks />
          {/* <RecentCommits repoName={"maddycustom-production"} repoOwner={"Maddy-Custom"} /> */}
          <SiteUpdatesSection />
          <Button
            sx={{ my: 2 }}
            onClick={() => {
              router.push("/my-account");
            }}
            variant="contained"
            color="white"
          >
            My Account
          </Button>
        </div>
      </SignedIn>
    </>
  );
}
