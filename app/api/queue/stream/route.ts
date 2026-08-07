import { NextResponse } from "next/server";
import { getGenerationQueueStatus } from "../../../controls/queueActions";
import { queueEmitter } from "../../../controls/queueStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			const pushData = (data: unknown) => {
				try {
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
					);
				} catch (e) {
					console.error("Error writing to SSE stream", e);
				}
			};

			const initialStatus = await getGenerationQueueStatus();
			pushData(initialStatus);

			const onQueueUpdated = (status: unknown) => {
				pushData(status);
			};

			queueEmitter.on("queueUpdated", onQueueUpdated);

			request.signal.addEventListener("abort", () => {
				queueEmitter.off("queueUpdated", onQueueUpdated);
			});
		},
	});

	return new NextResponse(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		},
	});
}
