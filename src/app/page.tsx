import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to the search page since that's the main functionality
  redirect("/search");
}
