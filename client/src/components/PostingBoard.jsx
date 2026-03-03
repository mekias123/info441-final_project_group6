import { useEffect, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
export default function PostingBoard() {
	const [postsJson, setPostsJson] = useState([]);
	const [activeProjectId, setActiveProjectId] = useState(null);
	const [coverLetter, setCoverLetter] = useState("");
	const [editorID, setEditorID] = useState("");
	const [proposalsByProjectId, setProposalsByProjectId] = useState({});

	async function fetchPosts() {
		try {
			const titleVal = document.getElementById("title")?.value || "";
			const creatorIdVal = document.getElementById("creator-id")?.value;
			const budgetMinVal = document.getElementById("budget-min")?.value;
			const budgetMaxVal = document.getElementById("budget-max")?.value;
			const isOpenChecked = document.getElementById("is-open")?.checked;

			const params = new URLSearchParams();
			if (titleVal && titleVal.trim())
				params.append("title", titleVal.trim());
			if (budgetMinVal) params.append("budgetMin", budgetMinVal);
			if (budgetMaxVal) params.append("budgetMax", budgetMaxVal);
			if (creatorIdVal) params.append("creatorID", creatorIdVal);

			// only append isOpen when the checkbox is checked (true)
			if (typeof isOpenChecked === "boolean") {
				params.append("isOpen", isOpenChecked ? "true" : "false");
			}

			const url =
				`${API}/api/project` +
				(params.toString() ? `?${params.toString()}` : "");
			const data = await fetchJSON(url);
			setPostsJson(data || []);
		} catch (error) {
			console.error("Failed to fetch posts:", error);
		}
	}

	useEffect(() => {
		fetchPosts();
	}, []);

	async function applyToProject(projectId) {
		if (!editorID.trim() || !coverLetter.trim()) {
			alert("Editor ID and cover letter required");
			return;
		}

		try {
			const response = await fetchJSON(
				`${API}/api/project/${projectId}/proposals`,
				{
					method: "POST",
					body: {
						editorID: editorID.trim(),
						coverLetter: coverLetter.trim(),
						proposedRate: null,
					},
				},
			);

			if (response?.error) {
				alert(response.error);
				return;
			}

			setCoverLetter("");
			setEditorID("");
			setActiveProjectId(null);

			await viewProposals(projectId);
		} catch (err) {
			console.error(err);
		}
	}

	async function viewProposals(projectId) {
		try {
			const data = await fetchJSON(
				`${API}/api/project/${projectId}/proposals`,
			);

			setProposalsByProjectId((prev) => ({
				...prev,
				[projectId]: data || [],
			}));
		} catch (err) {
			console.error(err);
		}
	}

	return (
		<div id="posting-board">
			<h1>Posting Board:</h1>
			<button onClick={fetchPosts}>Refresh/Search</button>

			<label for="title">Title:</label>
			<input type="text" id="title" name="title" />

			<label for="creator-id">Creator ID:</label>
			<input type="number" id="creator-id" name="creatorID" />

			<label for="budget-min">Budget Min:</label>
			<input type="number" id="budget-min" name="Budget Min" />
			<label for="budget-max">Budget Max:</label>
			<input type="number" id="budget-max" name="Budget Max" />

			<label for="is-open">Is Open?:</label>
			<input
				type="checkbox"
				id="is-open"
				name="Is Open?"
				value="Open"
				defaultChecked
			/>

			<label for="creator-id">Creator ID:</label>
			<input type="number" id="creator-id" name="Creator ID" />

			<table border="1">
				<thead>
					<tr>
						<th>Posting Title</th>
						<th>Creator</th>
						<th>Description</th>
						<th>Deadline</th>
						<th>Budget</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>

				<tbody>
					{postsJson.map((project) => (
						<>
							<tr key={project._id}>
								<td>{project.title}</td>
								<td>{project.creatorID}</td>
								<td>{project.description}</td>
								<td>
									{new Date(
										project.deadline,
									).toLocaleDateString()}
								</td>
								<td>{project.budget}</td>
								<td>{project.status}</td>
								<td>
									<button
										onClick={() =>
											setActiveProjectId(project._id)
										}
									>
										Apply
									</button>
									<button
										onClick={() =>
											viewProposals(project._id)
										}
									>
										View Proposals
									</button>
								</td>
							</tr>

							{activeProjectId === project._id && (
								<tr>
									<td colSpan="6">
										<input
											placeholder="Editor ID"
											value={editorID}
											onChange={(e) =>
												setEditorID(e.target.value)
											}
										/>
										<br />
										<textarea
											placeholder="Cover letter..."
											value={coverLetter}
											onChange={(e) =>
												setCoverLetter(e.target.value)
											}
										/>
										<br />
										<button
											onClick={() =>
												applyToProject(project._id)
											}
										>
											Submit Application
										</button>
									</td>
								</tr>
							)}

							{proposalsByProjectId[project._id] && (
								<tr>
									<td colSpan="6">
										<strong>Proposals:</strong>
										{proposalsByProjectId[project._id]
											.length === 0 && (
											<div>No proposals yet.</div>
										)}
										{proposalsByProjectId[project._id].map(
											(p) => (
												<div key={p._id}>
													{/* <strong>{p.editorID}</strong>: {p.coverLetter} */}
													<strong>
														{p.editorID}
													</strong>{" "}
													({p.status}):{" "}
													{p.coverLetter}
												</div>
											),
										)}
									</td>
								</tr>
							)}
						</>
					))}
				</tbody>
			</table>
		</div>
	);
}

async function fetchJSON(route, options) {
	let response;
	try {
		response = await fetch(route, {
			method: options?.method || "GET",
			body: options?.body ? JSON.stringify(options.body) : undefined,
			headers: options?.body
				? { "Content-Type": "application/json" }
				: undefined,
		});
	} catch (error) {
		console.log(error);
	}

	let responseJson;
	try {
		responseJson = await response.json();
	} catch (error) {
		console.log(error);
	}
	return responseJson;
}
