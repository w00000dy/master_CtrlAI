import type { Paragraph } from "@/generated/prisma/client";

export function enrichControlsWithAncestors<
	C extends { paragraphs: P[] },
	P extends { parentParagraphId: number | null },
>(controls: C[], allParagraphs: Paragraph[]) {
	const paraMap = new Map(allParagraphs.map((p) => [p.id, p]));

	return controls.map((control) => {
		return {
			...control,
			paragraphs: control.paragraphs.map((p: P) => {
				const ancestors: Paragraph[] = [];
				let currentId = p.parentParagraphId;
				while (currentId) {
					const parent = paraMap.get(currentId);
					if (parent) {
						ancestors.unshift(parent);
						currentId = parent.parentParagraphId;
					} else {
						break;
					}
				}
				return { ...p, ancestors };
			}),
		};
	});
}
