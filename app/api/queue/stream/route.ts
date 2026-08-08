import { NextResponse } from "next/server";
import { getGenerationQueueStatus } from "../../../controls/queueActions";
import { queueEmitter } from "../../../controls/queueStore";

export const dynamic = "force-dynamic";

const globalCounters = globalThis as unknown as { sseClientCount: number };
if (globalCounters.sseClientCount === undefined) {
	globalCounters.sseClientCount = 0;
}

export async function GET(request: Request) {
	globalCounters.sseClientCount++;

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			console.log(
				`[SSE] Client connected to queue stream. Active clients: ${globalCounters.sseClientCount}`,
			);

			const pushData = (data: unknown) => {
				try {
					console.log("[SSE] Pushing update to client");
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
					);
				} catch (e) {
					console.error("[SSE] Error writing to stream:", e);
				}
			};

			const initialStatus = await getGenerationQueueStatus();
			pushData(initialStatus);

			const onQueueUpdated = (status: unknown) => {
				pushData(status);
			};

			queueEmitter.on("queueUpdated", onQueueUpdated);

			const onShutdown = () => {
				try {
					console.log("[SSE] Shutting down stream (server termination)");
					controller.close();
				} catch {
					console.log("[SSE] Stream already closed");
				}
				queueEmitter.off("queueUpdated", onQueueUpdated);
			};

			process.on("SIGINT", onShutdown);
			process.on("SIGTERM", onShutdown);

			request.signal.addEventListener("abort", () => {
				globalCounters.sseClientCount = Math.max(
					0,
					globalCounters.sseClientCount - 1,
				);
				console.log(
					`[SSE] Client disconnected. Active clients: ${globalCounters.sseClientCount}`,
				);
				queueEmitter.off("queueUpdated", onQueueUpdated);
				process.off("SIGINT", onShutdown);
				process.off("SIGTERM", onShutdown);
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
