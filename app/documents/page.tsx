"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getDocuments, deleteDocument } from "../actions/documentActions";
import { BookTextIcon, XIcon, ClockIcon, LoaderIcon } from "lucide-animated";

type DocumentMeta = {
  id: string;
  title: string;
  savedAt: string;
};

function DocumentCard({ doc, handleDelete }: { doc: DocumentMeta, handleDelete: (e: React.MouseEvent, id: string) => void }) {
  const iconRef = useRef<any>(null);

  return (
    <Link 
      href={`/documents/${doc.id}`}
      className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all block"
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
    >
      <div className="flex flex-col h-full justify-between gap-4">
        <div>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
              <BookTextIcon ref={iconRef} animateOnHover={false} size={24} />
            </div>
            <button 
              onClick={(e) => handleDelete(e, doc.id)}
              className="opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
              title="Delete Document"
            >
              <XIcon size={20} />
            </button>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
            {doc.title || "Untitled Document"}
          </h2>
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
          <ClockIcon size={16} />
          Saved {new Date(doc.savedAt).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
}

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
            <LoaderIcon className="animate-spin text-zinc-400" size={32} />
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
              <DocumentCard key={doc.id} doc={doc} handleDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
