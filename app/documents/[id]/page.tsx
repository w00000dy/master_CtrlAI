"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDocumentById } from "../../actions/documentActions";
import { ParsedDocument } from "../../actions/parsePdf";
import { ParagraphRenderer } from "../../components/ParagraphRenderer";

export default function DocumentViewPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    getDocumentById(id).then(res => {
      if (res.success && res.data) {
        setDocument(res.data.document);
        setSavedAt(res.data.savedAt);
      } else {
        setError(res.error || "Failed to load the document.");
      }
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-zinc-500">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
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
        
        {/* Navigation & Header */}
        <div className="space-y-4">
          <Link href="/documents" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors flex items-center gap-1 w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Documents
          </Link>
          
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              {document.title || "Untitled Document"}
            </h1>
            {savedAt && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Imported on {new Date(savedAt).toLocaleDateString()} at {new Date(savedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Document Content */}
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
      </div>
    </div>
  );
}
