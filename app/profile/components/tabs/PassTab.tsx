"use client";

import TravellerPass from "../TravellerPass";
import type { Stamp } from "../../types";

export default function PassTab({
  username, email, avatarPreview, initials, stamps,
}: {
  username: string; email: string; avatarPreview: string; initials: string; stamps: Stamp[];
}) {
  return (
    <div className="st-content wide">
      <div className="pp-pass-scale-wrap">
        <TravellerPass
          username={username}
          email={email}
          avatarPreview={avatarPreview}
          initials={initials}
          stamps={stamps}
        />
      </div>
    </div>
  );
}
