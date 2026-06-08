"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getDocumentById, deleteDocument, updateDocumentTitle } from "../../actions/documentActions";
import { ParsedDocument } from "../../actions/parsePdf";
import { ParagraphRenderer } from "../../components/ParagraphRenderer";
import { LoaderIcon, ArrowLeftIcon, XIcon, FilePenLineIcon, CalendarCheckIcon } from "lucide-animated";

export default function DocumentViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [showJson, setShowJson] = useState(false);

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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Link href="/documents" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors flex items-center gap-1 w-fit">
              <ArrowLeftIcon size={16} />
              Back to Documents
            </Link>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowJson(!showJson)}
                className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {showJson ? "Hide JSON" : "View JSON"}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-sm px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Document"}
              </button>
            </div>
          </div>
          
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
            {isEditingTitle ? (
              <div className="flex items-center gap-3 mb-2">
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="flex-1 text-2xl font-bold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button 
                  onClick={handleUpdateTitle}
                  disabled={isSavingTitle}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSavingTitle ? "Saving..." : "Save"}
                </button>
                <button 
                  onClick={() => setIsEditingTitle(false)}
                  disabled={isSavingTitle}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 mb-2 group">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {document.title || "Untitled Document"}
                </h1>
                <button 
                  onClick={() => {
                    setEditTitle(document.title || "");
                    setIsEditingTitle(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                  title="Edit Title"
                >
                  <FilePenLineIcon size={20} />
                </button>
              </div>
            )}
            {savedAt && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <CalendarCheckIcon size={16} />
                Imported on {new Date(savedAt).toLocaleDateString()} at {new Date(savedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* JSON View Toggle */}
        {showJson && (
          <div className="bg-zinc-900 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-zinc-950 px-6 py-3 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-400">Raw JSON Data</span>
              <button onClick={() => setShowJson(false)} className="text-zinc-500 hover:text-zinc-300">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-6 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono">
                {JSON.stringify(document, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Document Content */}
        {!showJson && (
          <div className="space-y-6">
            {document.sections?.map((section, idx) => (
              <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {section.title}
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  {section.paragraphs && section.paragraphs.length > 0 ? (
                    <div className="space-y-6">
                      {section.paragraphs.map((p, pIdx) => (
                        <ParagraphRenderer key={pIdx} paragraph={p} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-400 italic">No paragraphs in this section.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
