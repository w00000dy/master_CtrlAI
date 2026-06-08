"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getDocumentById, deleteDocument, updateDocumentTitle } from "../actions";
import { ParagraphRenderer } from "../../components/ParagraphRenderer";
import { LoaderIcon, ArrowLeftIcon, FilePenLineIcon, CalendarCheckIcon, BookTextIcon, type BookTextIconHandle } from "lucide-animated";
import { useRef } from "react";
import type { Paragraph, Document, Section } from "../../../generated/prisma/client";

type DocumentData = Document & {
  sections: (Section & {
    paragraphs: Paragraph[];
  })[];
};

export default function DocumentViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [document, setDocument] = useState<DocumentData | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const iconRef = useRef<BookTextIconHandle | null>(null);

  useEffect(() => {
    if (!id) return;

    getDocumentById(id).then(res => {
      if (res.success && res.data) {
        setDocument(res.data.document);
        setEditTitle(res.data.document.title || "");
        setSavedAt(res.data.savedAt);
      } else {
        setError(res.error || "Failed to load the document.");
      }
      setIsLoading(false);
    });
  }, [id]);

  const handleUpdateTitle = async () => {
    if (!editTitle.trim()) return;
    setIsSavingTitle(true);
    const res = await updateDocumentTitle(id, editTitle.trim());
    if (res.success) {
      setDocument(prev => prev ? { ...prev, title: editTitle.trim() } : prev);
      setIsEditingTitle(false);
    } else {
      alert("Failed to update title");
    }
    setIsSavingTitle(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    setIsDeleting(true);
    const res = await deleteDocument(id);
    if (res.success) {
      router.push("/documents");
    } else {
      alert("Failed to delete document");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-zinc-500">
          <LoaderIcon className="animate-spin text-blue-600" size={32} />
          <p>Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Link href="/documents" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            <ArrowLeftIcon size={16} />
            Back to Documents
          </Link>
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-xl border border-red-100 dark:border-red-900/30">
            {error || "Document not found."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Navigation & Actions Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <Link href="/documents" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md w-fit">
            <ArrowLeftIcon size={16} />
            Back to Documents
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm font-medium px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete Document"}
            </button>
          </div>
        </div>

        {/* Beautiful Header Card */}
        <div
          className="relative bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50 dark:from-blue-900/10 dark:via-zinc-900 dark:to-indigo-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-3xl p-8 shadow-sm overflow-hidden"
          onMouseEnter={() => iconRef.current?.startAnimation?.()}
          onMouseLeave={() => iconRef.current?.stopAnimation?.()}
        >
          {/* Decorative background glow */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative flex flex-col md:flex-row md:items-start gap-6">
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 shrink-0 self-start">
              <BookTextIcon ref={iconRef} size={40} animateOnHover={false} />
            </div>

            <div className="flex-1 w-full">
              {isEditingTitle ? (
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="flex-1 text-2xl md:text-3xl font-extrabold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleUpdateTitle}
                    disabled={isSavingTitle}
                    className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    {isSavingTitle ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    disabled={isSavingTitle}
                    className="px-5 py-3 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4 group mb-4">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight">
                    {document.title || "Untitled Document"}
                  </h1>
                  <button
                    onClick={() => {
                      setEditTitle(document.title || "");
                      setIsEditingTitle(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30"
                    title="Edit Title"
                  >
                    <FilePenLineIcon size={22} />
                  </button>
                </div>
              )}
              {savedAt && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600/80 dark:text-blue-400/80 bg-white/60 dark:bg-zinc-900/60 w-fit px-3 py-1.5 rounded-lg border border-blue-100/50 dark:border-blue-900/30 backdrop-blur-sm">
                  <CalendarCheckIcon size={16} />
                  <span>Imported on {new Date(savedAt).toLocaleDateString()} at {new Date(savedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="space-y-8 relative pt-4">
            {/* Timeline structural line */}
            <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-blue-200 via-zinc-200 to-transparent dark:from-blue-900/50 dark:via-zinc-800 hidden md:block"></div>

            {document.sections?.map((section, idx) => (
              <div
                key={idx}
                className="group/section relative bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 md:ml-12"
              >
                {/* Timeline node */}
                <div className="absolute -left-[54px] top-7 w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-950 border-2 border-blue-400 dark:border-blue-500 shadow-sm hidden md:block group-hover/section:scale-125 group-hover/section:bg-blue-50 dark:group-hover/section:bg-blue-900/30 transition-all duration-300"></div>

                <div className="bg-zinc-50/50 dark:bg-zinc-900/30 px-8 py-5 border-b border-zinc-100 dark:border-zinc-800/50">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-blue-500/80 rounded-full inline-block"></span>
                    {section.title}
                  </h3>
                </div>
                <div className="p-8 space-y-6">
                  {section.paragraphs && section.paragraphs.length > 0 ? (
                    <div className="space-y-6">
                      {(() => {
                        const renderTree = (parentId: string | null = null, depth = 0): React.ReactNode[] => 
                          section.paragraphs
                            .filter((p: Paragraph) => (p.parentParagraphId || null) === parentId)
                            .flatMap((p: Paragraph) => [
                              <ParagraphRenderer key={p.id} paragraph={p} depth={depth} />,
                              ...renderTree(p.id, depth + 1)
                            ]);
                        return renderTree();
                      })()}
                    </div>
                  ) : (
                    <p className="text-zinc-400 italic">No paragraphs in this section.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
}
