import React from "react";
import VolunteeringStoryFeedPage from "@/modules/volunteering/VolunteeringStoryFeedPage";

export const metadata = {
  title: "Impact Story Feed | TechCSR",
  description: "Community Impact Stories and Social Feed for Employee Volunteering",
};

export default function StoryFeedRoutePage() {
  return (
    <div className="home-content" style={{ padding: "20px 24px", minHeight: "100vh" }}>
      <VolunteeringStoryFeedPage />
    </div>
  );
}
