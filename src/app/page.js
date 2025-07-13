"use client";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import NotSignedIn from "@/components/full-page-comps/NotSignedIn";
import Header from "@/components/page-sections/home/Header";
import StatusContainer from "@/components/page-sections/home/StatusContainer";
import DepartmentLinks from "@/components/page-sections/home/DepartmentLinks";
import styles from "./page.module.css";
// import Target from '@/components/page-sections/home/Target';
// import RecentCommits from "@/components/page-sections/home/RecentCommits";
import { Button } from "@mui/material";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <>
      <SignedOut>
        <NotSignedIn />
      </SignedOut>
      <SignedIn>
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
          <Button
            sx={{ my: 2 }}
            onClick={() => {
              router.push("/my-account");
            }}
            variant="contained"
            color="primary"
          >
            My Account
          </Button>
        </div>
      </SignedIn>
    </>
  );
}
