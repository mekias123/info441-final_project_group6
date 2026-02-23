import { useState } from "react";

export default function PostingBoard() {
	const [postsJson, setPostsJson] = useState([]);

	// TODO:
	// Automatically fetch posts
	// Add loading indicator
	// Limit posts requested
	// Filter for posts

	async function fetchPosts() {
		try {
			const data = await fetchJSON("http://localhost:3001/api/project");
			// console.log(data);
			setPostsJson(data || []);
		} catch (error) {
			console.error("Failed to fetch posts:", error);
		}
	}

	function signUpButton() {
		alert(
			"Implement Me!", //This is where the code for adding oneself to a job listing should be
		);
	}

	// fetchPosts();

	return (
		<div id="posting-board">
			<h1>Posting Board:</h1>
			<button onClick={fetchPosts}>Refresh</button>
			<table>
				<thead>
					<tr>
						<th>Posting Title</th>
						<th>Description</th>
						<th>Deadline</th>
						<th>Budget</th>
						<th>Status</th>
						<th>Button</th>
					</tr>
				</thead>

				<tbody>
					{postsJson.map((projectInfo, index) => (
						<tr key={index}>
							<td>{projectInfo.title}</td>
							<td>{projectInfo.description}</td>
							<td>{projectInfo.deadline}</td>
							<td>{projectInfo.budget}</td>
							<td>{projectInfo.status}</td>
							<th>
								<button onClick={signUpButton}>Signup</button>
							</th>
						</tr>
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
			method: options && options.method ? options.method : "GET",
			body:
				options && options.body
					? JSON.stringify(options.body)
					: undefined,
			headers:
				options && options.body
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
