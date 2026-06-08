"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getDocuments, deleteDocument } from "../actions/documentActions";

type DocumentMeta = {
  id: string;
  title: string;
  savedAt: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    const res = await deleteDocument(id);
    if (res.success) {
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } else {
      alert("Failed to delete document.");
    }
  };

  useEffect(() => {
    getDocuments().then(res => {
      if (res.success && res.documents) {
        setDocuments(res.documents);
      } else {
        setError(res.error || "Failed to load documents.");
      }
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Legal Documents
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            View all parsed and saved legal texts.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <svg className="animate-spin h-8 w-8 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
            {error}
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center shadow-sm">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">No documents found</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">You haven't saved any legal texts yet.</p>
            <Link 
              href="/import"
              className="inline-flex items-center justify-center px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-lg transition-colors"
            >
              Import a Document
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map(doc => (
              <Link 
                key={doc.id} 
                href={`/documents/${doc.id}`}
                className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all block"
              >
                <div className="flex flex-col h-full justify-between gap-4">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(e, doc.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="Delete Document"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {doc.title || "Untitled Document"}
                    </h2>
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Saved {new Date(doc.savedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
