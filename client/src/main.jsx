import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import PostJob from "./components/PostJob";
import PostingBoard from "./components/PostingBoard";
import CreatorDashboard from "./components/CreatorDashboard";
import VideoReview from "./components/VideoReview";

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<PostJob />
		<PostingBoard />
		<VideoReview />
	</StrictMode>,
);
